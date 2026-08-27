import { createHmac } from 'node:crypto';

import { expect, test, type APIRequestContext } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * El contrato HTTP de la API, probado contra la API de verdad.
 *
 * Las unitarias de `apps/api` cubren logica pura —normalizar un error, decidir
 * una clave de limite— pero no que la API **responda** asi. Y las e2e de
 * navegador prueban el producto, no el borde HTTP.
 *
 * Esto es lo que hay en medio: peticiones crudas comprobando forma de
 * respuesta, codigos y limites. Es donde se nota una regresion que rompe la
 * app nativa sin romper la web, o que empieza a filtrar detalles internos.
 */

const API = process.env.API_URL ?? 'http://localhost:4200';

/** Abre una sesion nueva y devuelve su token. */
async function entrar(request: APIRequestContext, email: string): Promise<string> {
  const codigo = '616161';
  await request.post(`${API}/api/auth/otp/solicitar`, { data: { email } });

  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error('Falta SESSION_SECRET para la prueba e2e.');
  const hash = createHmac('sha256', secreto).update(`${email}:${codigo}`).digest('hex');
  psql(
    `update otp_codes set "codeHash" = '${hash}' where "userId" = ` +
      `(select id from users where email = '${email}') and "consumedAt" is null`,
  );

  const r = await request.post(`${API}/api/auth/otp/verificar`, {
    data: { email, codigo, modo: 'token' },
  });
  const { token } = (await r.json()) as { token?: string };
  if (!token) throw new Error('El servidor no devolvio token.');
  return token;
}

test.describe('forma del error', () => {
  test('todos los fallos salen con la misma forma', async ({ request }) => {
    // Antes convivian dos: `{mensaje, errores}` de ZodPipe y
    // `{message, error, statusCode}` de Nest. El cliente tenia que probar tres
    // campos para saber que decirle al usuario.
    const casos = [
      { nombre: 'validacion', r: () => request.post(`${API}/api/auth/otp/solicitar`, { data: { email: 'no@gmail.com' }, failOnStatusCode: false }) },
      { nombre: 'sin sesion', r: () => request.get(`${API}/api/feed`, { failOnStatusCode: false }) },
      { nombre: 'ruta inexistente', r: () => request.get(`${API}/api/no-existe`, { failOnStatusCode: false }) },
      { nombre: 'campo faltante', r: () => request.post(`${API}/api/auth/otp/solicitar`, { data: {}, failOnStatusCode: false }) },
    ];

    for (const caso of casos) {
      const cuerpo = (await (await caso.r()).json()) as Record<string, unknown>;

      expect(typeof cuerpo.mensaje, `${caso.nombre}: falta \`mensaje\``).toBe('string');
      expect(cuerpo.mensaje, `${caso.nombre}: \`mensaje\` vacio`).not.toBe('');
      // Lo que obligaba al cliente a adivinar ya no sale.
      expect(cuerpo, `${caso.nombre}: filtra \`message\``).not.toHaveProperty('message');
      expect(cuerpo, `${caso.nombre}: filtra \`statusCode\``).not.toHaveProperty('statusCode');
    }
  });

  test('los mensajes de validacion estan en espanol', async ({ request }) => {
    // Zod genera los suyos en ingles cuando nadie los escribio: un campo
    // obligatorio vacio pintaba "Required" debajo de la etiqueta.
    const r = await request.post(`${API}/api/auth/otp/solicitar`, {
      data: {},
      failOnStatusCode: false,
    });
    const cuerpo = (await r.json()) as { errores?: Array<{ campo: string; mensaje: string }> };

    expect(cuerpo.errores?.[0]?.campo).toBe('email');
    expect(cuerpo.errores?.[0]?.mensaje).not.toMatch(/required|invalid|expected/i);
  });
});

test.describe('peticiones mal formadas', () => {
  test('un cuerpo enorme es 413, no 500', async ({ request }) => {
    // Con 500 se le decia al usuario "se rompio de nuestro lado" por algo que
    // es culpa suya, y cada intento dejaba un error en el registro del
    // servidor — o sea, una forma barata de llenar el log desde fuera.
    const r = await request.post(`${API}/api/auth/otp/solicitar`, {
      headers: { 'content-type': 'application/json' },
      data: `{"email":"${'a'.repeat(500_000)}@udlap.mx"}`,
      failOnStatusCode: false,
    });

    expect(r.status()).toBe(413);
    expect(((await r.json()) as { mensaje: string }).mensaje).not.toMatch(/rompio/);
  });

  test('un JSON roto es 400 y el mensaje no viene del analizador', async ({ request }) => {
    const r = await request.post(`${API}/api/auth/otp/solicitar`, {
      headers: { 'content-type': 'application/json' },
      data: '{"email": ',
      failOnStatusCode: false,
    });

    expect(r.status()).toBe(400);
    const { mensaje } = (await r.json()) as { mensaje: string };
    expect(mensaje).not.toMatch(/Unexpected|JSON input|position/i);
  });
});

test.describe('limite de peticiones', () => {
  test('el cupo es por persona, no por IP', async ({ request }) => {
    // Es la propiedad de la que depende que la app funcione en el campus:
    // miles de alumnos salen por el mismo NAT y para el servidor son una IP.
    const sufijo = Date.now().toString(36);
    const unaEmail = `api.uno.${sufijo}@udlap.mx`;
    const otraEmail = `api.dos.${sufijo}@udlap.mx`;

    const una = await entrar(request, unaEmail);
    const otra = await entrar(request, otraEmail);

    // Una gasta bastante cupo desde la misma IP que la otra.
    for (let i = 0; i < 80; i += 1) {
      await request.get(`${API}/api/auth/yo`, { headers: { authorization: `Bearer ${una}` } });
    }

    const r = await request.get(`${API}/api/auth/yo`, {
      headers: { authorization: `Bearer ${otra}` },
      failOnStatusCode: false,
    });
    expect(r.status(), 'la segunda sesion se quedo sin cupo por culpa de la primera').toBe(200);

    psql(`delete from users where email in ('${unaEmail}', '${otraEmail}')`);
  });
});

test.describe('salud', () => {
  test('informa del estado y de la latencia de la base', async ({ request }) => {
    const r = await request.get(`${API}/api/salud`);
    expect(r.status()).toBe(200);

    const cuerpo = (await r.json()) as { estado: string; base: string; latenciaMs: number };
    expect(cuerpo.estado).toBe('ok');
    expect(cuerpo.base).toBe('ok');
    // Sin la latencia no hay forma de ver que la base se esta degradando
    // antes de que deje de responder del todo.
    expect(typeof cuerpo.latenciaMs).toBe('number');
  });
});

test.describe('nadie toca lo ajeno', () => {
  test('borrar y editar contenido de otra persona da 403', async ({ request }) => {
    // El caso clasico: el id viaja en la URL, asi que cualquiera puede probar
    // con el de otro. La comprobacion de dueño esta en cada servicio; esto la
    // fija para que no se caiga de alguna al refactorizar.
    const sufijo = Date.now().toString(36);
    const email = `api.idor.${sufijo}@udlap.mx`;
    const token = await entrar(request, email);
    const cabecera = { authorization: `Bearer ${token}` };

    // El feed de esta cuenta recien creada ya trae contenido de la comunidad
    // de campus, escrito por otras personas.
    const feed = await request.get(`${API}/api/feed`, { headers: cabecera });
    const { publicaciones } = (await feed.json()) as {
      publicaciones: Array<{ id: string; autor: { handle: string } | null }>;
    };
    const ajena = publicaciones.find((p) => p.autor !== null);
    expect(ajena, 'hace falta contenido de otra persona; corre `pnpm db:demo`').toBeTruthy();

    const borrado = await request.delete(`${API}/api/posts/${ajena!.id}`, {
      headers: cabecera,
      failOnStatusCode: false,
    });
    expect(borrado.status(), 'se pudo borrar una publicacion ajena').toBe(403);

    const edicion = await request.patch(`${API}/api/posts/${ajena!.id}`, {
      headers: cabecera,
      data: { texto: 'secuestrado' },
      failOnStatusCode: false,
    });
    expect(edicion.status(), 'se pudo editar una publicacion ajena').toBe(403);

    // Y sigue ahi, intacta.
    const despues = await request.get(`${API}/api/posts/${ajena!.id}`, { headers: cabecera });
    expect(despues.status()).toBe(200);
    expect(((await despues.json()) as { texto: string }).texto).not.toBe('secuestrado');

    psql(`delete from users where email = '${email}'`);
  });

  test('un id inventado no distingue "no existe" de "no es tuyo"', async ({ request }) => {
    // Responder 404 a lo inexistente y 403 a lo ajeno es correcto aqui: el id
    // es un cuid, no es adivinable, asi que no hay enumeracion que proteger.
    // Lo que no vale es un 500.
    const sufijo = Date.now().toString(36);
    const email = `api.fantasma.${sufijo}@udlap.mx`;
    const token = await entrar(request, email);

    const r = await request.delete(`${API}/api/posts/cmnoexisteestepost0000`, {
      headers: { authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    });
    expect([403, 404]).toContain(r.status());

    psql(`delete from users where email = '${email}'`);
  });
});

test.describe('avisos en vivo', () => {
  test('el flujo SSE llega aunque el cliente pida compresion', async ({ request }) => {
    // `compression` acumula bytes antes de mandarlos. Si llegara a aplicarse
    // al flujo, el evento se quedaria en el buffer y el globo de
    // notificaciones dejaria de moverse — sin error, sin nada en el registro.
    const sufijo = Date.now().toString(36);
    const email = `api.sse.${sufijo}@udlap.mx`;
    const token = await entrar(request, email);

    // `fetch` y no el cliente de Playwright: este espera a que la respuesta
    // termine, y un flujo SSE no termina nunca. Con `fetch` basta con que
    // lleguen las cabeceras y se corta.
    const corte = new AbortController();
    const r = await fetch(`${API}/api/notificaciones/stream`, {
      headers: { authorization: `Bearer ${token}`, 'accept-encoding': 'gzip, br' },
      signal: corte.signal,
    });

    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/event-stream');
    expect(r.headers.get('content-encoding'), 'el flujo no debe comprimirse').toBeNull();

    corte.abort();
    psql(`delete from users where email = '${email}'`);
  });
});
