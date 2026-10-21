import { createHmac } from 'node:crypto';

import { expect, test, type Page } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * Prueba de humo: cada ruta de la web carga de verdad.
 *
 * Existe por un fallo concreto. La web estuvo devolviendo **500 en todas sus
 * paginas** y no lo detecto nada: `check-types` pasaba (a `tsc` si le resuelve
 * `./udlap.js` -> `udlap.ts`), las unitarias no tocan la web, y las e2e que
 * fallaron parecian problemas de selector. El fallo era de resolucion de
 * modulos en webpack, y solo se ve al pedir la pagina con un navegador.
 *
 * Por eso esta prueba no comprueba diseno ni contenido: comprueba que la ruta
 * responde, que no aparece el dialogo "Build Error" de Next y que no hay
 * errores de consola. Es barata y cubre justo el hueco por donde se colo.
 */

const CODIGO = '424242';

/** Rutas que exigen sesion. Las publicas van aparte. */
const PRIVADAS = [
  '/feed',
  '/eventos',
  '/mensajes',
  '/marketplace',
  '/directorio',
  '/aventones',
  '/anonimo',
  '/ajustes',
  '/mas',
  '/guardados',
  '/buscar',
  '/notificaciones',
] as const;

const PUBLICAS = ['/', '/terminos', '/privacidad'] as const;

/**
 * El overlay de Next en desarrollo. Si aparece, la pagina no compilo — aunque
 * el HTTP haya sido 200, porque Next sirve el error dentro de un 200.
 */
async function sinErrorDeCompilacion(page: Page, ruta: string): Promise<void> {
  const overlay = page.locator('nextjs-portal, [data-nextjs-dialog]');
  if ((await overlay.count()) === 0) return;

  const texto = await overlay.first().innerText().catch(() => '');
  expect(texto, `${ruta} muestra el overlay de error de Next:\n${texto.slice(0, 800)}`).not.toMatch(
    /Build Error|Module not found|Unhandled Runtime Error|Failed to compile/i,
  );
}

test('cada ruta de la web carga sin error de compilacion', async ({ page }) => {
  // Quince rutas mas el registro. En desarrollo webpack compila cada una la
  // primera vez que se pide, asi que el limite normal de 30 s se queda corto
  // aunque no haya nada roto.
  test.setTimeout(240_000);

  // Los errores de consola se acumulan por ruta para poder señalar cual fallo.
  //
  // Se ignora el 401 de la comprobacion de sesion: en una pagina publica sin
  // haber entrado, ese 401 **es** la respuesta correcta, y el navegador lo
  // anota como error de consola de todas formas. Filtrarlo por codigo y no
  // por ruta mantiene el resto de la red vigilada.
  const ruido = /Failed to load resource.*status of 401/i;
  const errores: string[] = [];
  let rutaActual = '/';
  page.on('console', (m) => {
    if (m.type() === 'error' && !ruido.test(m.text())) errores.push(`[consola ${m.type()}] ${rutaActual}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errores.push(`[pageerror] ${rutaActual}: ${e.message}`));

  for (const ruta of PUBLICAS) {
    rutaActual = ruta;
    const r = await page.goto(ruta);
    expect(r?.status(), `${ruta} respondio ${r?.status()}`).toBeLessThan(400);
    await sinErrorDeCompilacion(page, ruta);
  }

  // Entrar. Sin sesion, las rutas privadas solo redirigen y no llegan a
  // compilarse — que es exactamente como se escondio el fallo original.
  const sufijo = Date.now().toString(36);
  const email = `humo.${sufijo}@udlap.mx`;
  const handle = `humo${sufijo}`;

  rutaActual = '/';
  await page.goto('/');
  await page.getByRole('button', { name: 'Crea tu cuenta' }).click();
  await page.getByPlaceholder('nombre.apellido@udlap.mx').fill(email);
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  await expect(page.getByPlaceholder('000000')).toBeVisible();

  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error('Falta SESSION_SECRET para la prueba e2e.');
  const hash = createHmac('sha256', secreto).update(`${email}:${CODIGO}`).digest('hex');
  psql(
    `update otp_codes set "codeHash" = '${hash}' where "userId" = ` +
      `(select id from users where email = '${email}') and "consumedAt" is null`,
  );

  await page.getByPlaceholder('000000').fill(CODIGO);
  await page.getByRole('button', { name: 'Entrar al Ágora' }).click();
  await page.getByLabel('Contraseña nueva').fill('cafe-de-cholula-2026');
  await page.getByLabel('Repítela').fill('cafe-de-cholula-2026');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page).toHaveURL(/\/registro$/);

  await page.getByPlaceholder('adampozo').fill(handle);
  await page.getByPlaceholder('Adam', { exact: true }).fill('Humo');
  await page.getByPlaceholder('Del Pozo', { exact: true }).fill('De Prueba');
  await page.locator('select').first().selectOption('ingenieria');
  await page.locator('select').nth(1).selectOption('ing-sistemas-computacionales');
  await page.locator('select').nth(2).selectOption('2024');
  await page.getByRole('button', { name: 'Crear mi perfil' }).click();
  await expect(page).toHaveURL(/\/(feed|bienvenida)$/);

  for (const ruta of PRIVADAS) {
    rutaActual = ruta;
    const r = await page.goto(ruta);
    expect(r?.status(), `${ruta} respondio ${r?.status()}`).toBeLessThan(400);
    await expect(page, `${ruta} rebotó al login`).not.toHaveURL(/\/$/);
    await sinErrorDeCompilacion(page, ruta);
  }

  // La prueba recoge lo suyo: sin esto cada corrida deja un usuario en la base
  // de desarrollo.
  psql(`delete from users where email = '${email}'`);

  // Se comprueba al final para tener el recorrido completo en el mensaje.
  expect(errores, `errores de consola:\n${errores.join('\n')}`).toEqual([]);
});
