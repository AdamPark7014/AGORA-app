import { createHmac } from 'node:crypto';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * El contrato de la contraseña, contra la API de verdad.
 *
 * El código al correo verifica la cuenta una sola vez; después se entra con
 * correo + contraseña. Lo que se fija aquí: que una cuenta nueva crea su
 * contraseña tras el código, que con ella entra sin código, que fallar cinco
 * veces bloquea, que el bloqueo no filtra si la cuenta existe, y que el
 * cambio cierra las otras sesiones.
 */

const API = process.env.API_URL ?? 'http://localhost:4200';
const CODIGO = '737373';
const CONTRASENA = 'cafe-de-cholula-2026';

function hashDe(codigo: string, email: string): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error('Falta SESSION_SECRET para la prueba e2e.');
  return createHmac('sha256', secreto).update(`${email.toLowerCase()}:${codigo}`).digest('hex');
}

/** Sesión por código, como la primera vez. Devuelve el token (modo nativo). */
async function entrarConCodigo(request: APIRequestContext, email: string): Promise<string> {
  await request.post(`${API}/api/auth/otp/solicitar`, { data: { email } });
  psql(
    `update otp_codes set "codeHash" = '${hashDe(CODIGO, email)}' ` +
      `where "userId" = (select id from users where email = '${email}') and "consumedAt" is null`,
  );
  const r = await request.post(`${API}/api/auth/otp/verificar`, {
    data: { email, codigo: CODIGO, modo: 'token' },
  });
  expect(r.status()).toBe(201);
  const cuerpo = (await r.json()) as { token?: string; tieneContrasena?: boolean };
  expect(cuerpo.tieneContrasena, 'una cuenta recién creada no tiene contraseña').toBe(false);
  return cuerpo.token!;
}

test('código una vez, contraseña después; cinco fallos bloquean y el cambio cierra otras sesiones', async ({
  request,
}) => {
  const email = `e2e.clave.${Date.now().toString(36)}@udlap.mx`;
  const token = await entrarConCodigo(request, email);
  const auth = { authorization: `Bearer ${token}` };

  // Sin contraseña no se puede entrar con una, y el mensaje es el genérico.
  const antes = await request.post(`${API}/api/auth/entrar`, {
    data: { email, contrasena: CONTRASENA },
    failOnStatusCode: false,
  });
  expect(antes.status()).toBe(401);

  // Una contraseña débil se rechaza con detalle por campo.
  const debil = await request.post(`${API}/api/auth/contrasena`, {
    headers: auth,
    data: { contrasena: 'password1' },
    failOnStatusCode: false,
  });
  expect(debil.status()).toBe(400);
  expect(((await debil.json()) as { errores: Array<{ campo: string }> }).errores[0]?.campo).toBe('contrasena');

  // Se crea desde la sesión del código.
  const crear = await request.post(`${API}/api/auth/contrasena`, {
    headers: auth,
    data: { contrasena: CONTRASENA },
  });
  expect(crear.status()).toBe(204);
  expect(psql(`select "passwordHash" like '$argon2id$%' from users where email = '${email}'`)).toBe('t');

  // Desde aquí, entrar es correo + contraseña, sin código ni correo.
  const entrar = await request.post(`${API}/api/auth/entrar`, {
    data: { email, contrasena: CONTRASENA, modo: 'token' },
  });
  expect(entrar.status()).toBe(201);
  const sesion2 = (await entrar.json()) as { token: string; tieneContrasena: boolean };
  expect(sesion2.tieneContrasena).toBe(true);
  expect(psql(`select "viaCodigo" from sessions where "tokenHash" is not null order by "createdAt" desc limit 1`)).toBe('f');

  // Cambiarla exige la actual y echa a la otra sesión (la del código).
  const cambiar = await request.post(`${API}/api/auth/contrasena/cambiar`, {
    headers: { authorization: `Bearer ${sesion2.token}` },
    data: { actual: CONTRASENA, nueva: 'otra-clave-del-campus' },
  });
  expect(cambiar.status()).toBe(204);
  const viejaSesion = await request.get(`${API}/api/auth/yo`, { headers: auth, failOnStatusCode: false });
  expect(viejaSesion.status(), 'la sesión del código debió cerrarse').toBe(401);
  const viva = await request.get(`${API}/api/auth/yo`, { headers: { authorization: `Bearer ${sesion2.token}` } });
  expect(viva.status()).toBe(200);

  // Cinco fallos seguidos bloquean; el sexto, aun con la buena, es 429.
  for (let i = 0; i < 5; i += 1) {
    const mal = await request.post(`${API}/api/auth/entrar`, {
      data: { email, contrasena: 'no-es-esta-clave' },
      failOnStatusCode: false,
    });
    expect(mal.status()).toBe(401);
  }
  const bloqueado = await request.post(`${API}/api/auth/entrar`, {
    data: { email, contrasena: 'otra-clave-del-campus' },
    failOnStatusCode: false,
  });
  expect(bloqueado.status()).toBe(429);

  // Un correo que no existe responde igual que una contraseña mal: nada que enumerar.
  const fantasma = await request.post(`${API}/api/auth/entrar`, {
    data: { email: `nadie.${Date.now().toString(36)}@udlap.mx`, contrasena: CONTRASENA },
    failOnStatusCode: false,
  });
  expect(fantasma.status()).toBe(401);
  expect(((await fantasma.json()) as { mensaje: string }).mensaje).toBe(
    ((await antes.json()) as { mensaje: string }).mensaje,
  );

  psql(`delete from users where email = '${email}'`);
});

test('sin "recordarme" la cookie es de sesión y la fila dura un día', async ({ request }) => {
  const email = `e2e.corta.${Date.now().toString(36)}@udlap.mx`;
  const token = await entrarConCodigo(request, email);
  await request.post(`${API}/api/auth/contrasena`, {
    headers: { authorization: `Bearer ${token}` },
    data: { contrasena: CONTRASENA },
  });

  const r = await request.post(`${API}/api/auth/entrar`, {
    data: { email, contrasena: CONTRASENA, recordarme: false },
  });
  const cookie = r.headersArray().find((h) => h.name.toLowerCase() === 'set-cookie');
  expect(cookie?.value).toContain('agora_sesion=');
  expect(cookie?.value, 'sin Expires: muere al cerrar el navegador').not.toMatch(/Expires=/i);
  expect(
    psql(
      `select "persistente" from sessions where "userId" = (select id from users where email = '${email}') order by "createdAt" desc limit 1`,
    ),
  ).toBe('f');

  psql(`delete from users where email = '${email}'`);
});
