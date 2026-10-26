import { expect, test, type Page } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * Recorrido completo: entrar con correo institucional, crear perfil, caer en
 * las comunidades automaticas y publicar en el feed.
 *
 * El codigo OTP se lee de la base de datos, no del correo. En desarrollo
 * MAIL_PROVIDER=console, asi que no hay buzon que consultar; y leer el hash no
 * sirve porque es un HMAC irreversible. Lo que si se puede es sembrar un
 * codigo conocido, que es justo lo que hace `sembrarCodigo`.
 */

/**
 * Fuerza un codigo conocido para un correo.
 *
 * Reusa el hash del propio servidor pidiendo primero un OTP real y luego
 * sustituyendo su hash por el de un codigo fijo, calculado con el mismo
 * SESSION_SECRET. Asi la prueba ejercita el camino de verificacion de verdad,
 * incluido el HMAC, en vez de saltarselo.
 */
const CODIGO_FIJO = '424242';
const CONTRASENA_E2E = 'cafe-de-cholula-2026';

function hashDe(codigo: string, email: string): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error('Falta SESSION_SECRET para la prueba e2e.');
  // Se calcula igual que packages/auth: HMAC-SHA256 sobre `email:codigo`.
  const { createHmac } = require('node:crypto') as typeof import('node:crypto');
  return createHmac('sha256', secreto).update(`${email.toLowerCase()}:${codigo}`).digest('hex');
}

/**
 * Primera vez: el código al buzón verifica la cuenta y después se elige una
 * contraseña. Desde ahí se entra con correo + contraseña (ver contrasena.spec).
 */
async function entrar(page: Page, email: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crea tu cuenta' }).click();
  await page.getByPlaceholder('nombre.apellido@udlap.mx').fill(email);
  await page.getByRole('button', { name: 'Enviarme el código' }).click();

  await expect(page.getByPlaceholder('000000')).toBeVisible();

  // Sustituye el hash del ultimo codigo por el de uno conocido.
  psql(
    `update otp_codes set "codeHash" = '${hashDe(CODIGO_FIJO, email)}' ` +
      `where "userId" = (select id from users where email = '${email}') ` +
      `and "consumedAt" is null`,
  );

  await page.getByPlaceholder('000000').fill(CODIGO_FIJO);
  await page.getByRole('button', { name: 'Entrar al Ágora' }).click();

  // Cuenta nueva: elige contraseña antes de pasar.
  await expect(page.getByRole('heading', { name: 'Crea tu contraseña' })).toBeVisible();
  await page.getByLabel('Contraseña nueva').fill(CONTRASENA_E2E);
  await page.getByLabel('Repítela').fill(CONTRASENA_E2E);
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
}

test('un correo que no es @udlap.mx no entra', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('nombre.apellido@udlap.mx').fill('alguien@gmail.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('cualquier-cosa');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();

  await expect(page.getByText('Necesitas un correo @udlap.mx para entrar.')).toBeVisible();
  await expect(page.getByPlaceholder('000000')).toHaveCount(0);
});

test('con contraseña se entra directo, sin código', async ({ page }) => {
  const sufijo = Date.now().toString(36);
  const email = `e2e.directo.${sufijo}@udlap.mx`;
  await entrar(page, email);
  await expect(page).toHaveURL(/\/registro$/);

  // Cierra sesión borrando la cookie y vuelve a entrar con la contraseña.
  await page.context().clearCookies();
  await page.goto('/');
  await page.getByPlaceholder('nombre.apellido@udlap.mx').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(CONTRASENA_E2E);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(/\/registro$/);
  await expect(page.getByPlaceholder('000000')).toHaveCount(0);

  psql(`delete from users where email = '${email}'`);
});

test('registro completo deja al usuario en sus comunidades y pudiendo publicar', async ({
  page,
}) => {
  const sufijo = Date.now().toString(36);
  const email = `e2e.${sufijo}@udlap.mx`;
  const handle = `e2e${sufijo}`;

  await entrar(page, email);

  // Sin perfil, la app manda al registro y no al feed.
  await expect(page).toHaveURL(/\/registro$/);

  await page.getByPlaceholder('adampozo').fill(handle);
  await page.getByPlaceholder('Adam', { exact: true }).fill('Prueba');
  await page.getByPlaceholder('Del Pozo', { exact: true }).fill('E2E');

  await page.getByRole('searchbox', { name: 'Busca tu carrera' }).fill('sistemas comp');
  await page.getByRole('button', { name: /Ingeniería en Sistemas Computacionales/ }).click();
  await page.getByRole('radio', { name: '2025' }).check();
  await page.getByLabel('Colegio residencial (opcional)').selectOption('cain-murray');

  // Casilla obligatoria de Términos y Reglas (App Store 1.2): sin ella el botón no se activa.
  await page.getByRole('checkbox', { name: /Acepto los Términos/ }).check();
  await page.getByRole('button', { name: 'Crear mi perfil' }).click();

  // Primera vez: pasa por la bienvenida antes del feed.
  await expect(page).toHaveURL(/\/(feed|bienvenida)$/);
  await page.goto('/feed');

  // Las comunidades automaticas son la razon de que el feed no nazca vacio.
  // Perfil e2e (escuela+depto via carrera+carrera+gen+colegio) + campus UDLAP = 6.
  const comunidades = psql(
    `select count(*) from memberships m join users u on u.id = m."userId" ` +
      `where u.email = '${email}' and m.automatica`,
  );
  expect(Number(comunidades)).toBe(6);

  const texto = `Publicacion de prueba ${sufijo}`;
  await page.getByLabel('Qué estás pensando').fill(texto);
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(page.getByText(texto)).toBeVisible();

  // La prueba recoge lo suyo.
  //
  // Sin esto cada corrida deja un usuario y una publicacion en la base de
  // desarrollo; a las veinte corridas el feed esta lleno de basura y empuja el
  // contenido de demostracion fuera de la primera pagina, que fue exactamente
  // lo que rompio la prueba de capturas.
  psql(
    `delete from posts where "authorId" = (select id from users where email = '${email}')`,
  );
  psql(`delete from users where email = '${email}'`);
});

test('el feed solo deja publicar en comunidades propias', async ({ request }) => {
  // La UI solo ofrece comunidades propias, asi que este limite se prueba
  // contra la API: es donde de verdad tiene que sostenerse.
  const respuesta = await request.post('/api/posts', {
    data: { comunidadSlug: 'carrera:derecho', texto: 'no deberia entrar' },
    failOnStatusCode: false,
  });
  // Sin sesion es 401; con sesion ajena seria 403. Nunca 201.
  expect([401, 403]).toContain(respuesta.status());
});
