import { createHmac } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * El contrato de sesion de la app nativa.
 *
 * La app de Expo no comparte el frasco de cookies del navegador: pide
 * `modo: 'token'` y guarda la cadena en el llavero del sistema. Esa rama vivia
 * sin ninguna prueba, y se rompio en silencio — el servidor seguia
 * respondiendo 201 y poniendo la cookie, asi que desde fuera parecia que
 * funcionaba mientras la app nativa se quedaba sin sesion.
 *
 * Estas pruebas van contra la API directamente porque no hay navegador que
 * simule: es el contrato HTTP lo que se esta fijando.
 */

const API = process.env.API_URL ?? 'http://localhost:4200';
const CODIGO_FIJO = '515151';
const CORREO = 'prueba.nativa@udlap.mx';

function hashDe(codigo: string, email: string): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error('Falta SESSION_SECRET para la prueba e2e.');
  return createHmac('sha256', secreto).update(`${email.toLowerCase()}:${codigo}`).digest('hex');
}

test('modo token devuelve la sesion en el cuerpo y no pone cookie', async ({ request }) => {
  await request.post(`${API}/api/auth/otp/solicitar`, { data: { email: CORREO } });
  psql(
    `update otp_codes set "codeHash" = '${hashDe(CODIGO_FIJO, CORREO)}' ` +
      `where "userId" = (select id from users where email = '${CORREO}') and "consumedAt" is null`,
  );

  const respuesta = await request.post(`${API}/api/auth/otp/verificar`, {
    data: { email: CORREO, codigo: CODIGO_FIJO, modo: 'token' },
  });
  expect(respuesta.ok()).toBe(true);

  const cuerpo = (await respuesta.json()) as { token?: string };
  expect(cuerpo.token, 'la app nativa se queda sin sesion si esto viene vacio').toBeTruthy();

  // Y ninguna cookie: dejarla puesta seria una segunda copia de la sesion
  // viviendo de mas, en un cliente que ni siquiera puede usarla.
  const cookies = respuesta.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
  expect(cookies).toHaveLength(0);

  // El token sirve como Bearer...
  const yo = await request.get(`${API}/api/auth/yo`, {
    headers: { authorization: `Bearer ${cuerpo.token}` },
  });
  expect(yo.ok()).toBe(true);
  expect((await yo.json()).email).toBe(CORREO);

  // ...y deja de servir al salir.
  await request.post(`${API}/api/auth/salir`, {
    headers: { authorization: `Bearer ${cuerpo.token}` },
  });
  const despues = await request.get(`${API}/api/auth/yo`, {
    headers: { authorization: `Bearer ${cuerpo.token}` },
    failOnStatusCode: false,
  });
  expect(despues.status()).toBe(401);

  psql(`delete from users where email = '${CORREO}'`);
});

test('sin modo la sesion sigue yendo en cookie httpOnly', async ({ request }) => {
  await request.post(`${API}/api/auth/otp/solicitar`, { data: { email: CORREO } });
  psql(
    `update otp_codes set "codeHash" = '${hashDe(CODIGO_FIJO, CORREO)}' ` +
      `where "userId" = (select id from users where email = '${CORREO}') and "consumedAt" is null`,
  );

  const respuesta = await request.post(`${API}/api/auth/otp/verificar`, {
    data: { email: CORREO, codigo: CODIGO_FIJO },
  });

  // La web nunca debe recibir el token en el cuerpo: ahi cualquier script de
  // la pagina podria leerlo.
  expect((await respuesta.json()).token).toBeUndefined();

  const cookie = respuesta.headersArray().find((h) => h.name.toLowerCase() === 'set-cookie');
  expect(cookie?.value).toContain('agora_sesion=');
  expect(cookie?.value).toContain('HttpOnly');

  psql(`delete from users where email = '${CORREO}'`);
});
