import { createHmac } from 'node:crypto';
import { expect, test } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * Genera capturas de las pantallas principales para revisar el diseno.
 *
 * No es una prueba de regresion visual: no compara contra una referencia. Es
 * una forma de ver la app renderizada de verdad, con las fuentes cargadas y la
 * paleta aplicada, sin depender de que el panel del navegador este visible.
 */

// Codigo maestro de desarrollo: deterministico y sin gastar cuota de OTP.
const CODIGO = '424242';

test('capturas de las pantallas principales', async ({ page }) => {
  // Recorre una docena de pantallas y en desarrollo webpack compila cada ruta
  // la primera vez que se pide. El limite normal de 30 s se agota compilando,
  // no esperando a la app.
  test.setTimeout(240_000);

  await page.setViewportSize({ width: 1440, height: 900 });
  const sufijo = Date.now().toString(36);
  const email = `visual.${sufijo}@udlap.mx`;
  const handle = `visual${sufijo}`;

  await page.goto('/');
  await page.screenshot({ path: 'capturas/1-entrar.png', fullPage: true });

  await page.getByRole('button', { name: 'Crea tu cuenta' }).click();
  await page.getByPlaceholder('nombre.apellido@udlap.mx').fill(email);
  await page.getByRole('button', { name: 'Enviarme el código' }).click();
  await expect(page.getByPlaceholder('000000')).toBeVisible();
  await page.screenshot({ path: 'capturas/2-codigo.png', fullPage: true });

  const secreto = process.env.SESSION_SECRET!;
  const hash = createHmac('sha256', secreto).update(`${email}:${CODIGO}`).digest('hex');
  psql(
    `update otp_codes set "codeHash" = '${hash}' where "userId" = ` +
      `(select id from users where email = '${email}') and "consumedAt" is null`,
  );

  await page.getByPlaceholder('000000').fill(CODIGO);
  await page.getByRole('button', { name: 'Entrar al Ágora' }).click();
  await expect(page.getByRole('heading', { name: 'Crea tu contraseña' })).toBeVisible();
  await page.screenshot({ path: 'capturas/2b-contrasena.png', fullPage: true });
  await page.getByLabel('Contraseña nueva').fill('cafe-de-cholula-2026');
  await page.getByLabel('Repítela').fill('cafe-de-cholula-2026');
  await page.getByRole('button', { name: 'Guardar contraseña' }).click();
  await expect(page).toHaveURL(/\/registro$/);
  await page.screenshot({ path: 'capturas/3-registro.png', fullPage: true });

  await page.getByPlaceholder('adampozo').fill(handle);
  await page.getByPlaceholder('Adam', { exact: true }).fill('Ana');
  await page.getByPlaceholder('Del Pozo', { exact: true }).fill('Ramírez');
  await page.locator('select').first().selectOption('ingenieria');
  await page.locator('select').nth(1).selectOption('ing-sistemas-computacionales');
  await page.locator('select').nth(2).selectOption('2024');
  await page.locator('select').nth(3).selectOption('cain-murray');
  await page.locator('form textarea').fill('5to semestre. Me late Verilog más de lo que debería.');
  // Casilla obligatoria de Términos y Reglas (App Store 1.2): sin ella el botón no se activa.
  await page.getByRole('checkbox', { name: /Acepto los Términos/ }).check();
  await page.getByRole('button', { name: 'Crear mi perfil' }).click();

  // Primera vez: pasa por la bienvenida antes del feed.
  await expect(page).toHaveURL(/\/(feed|bienvenida)$/);
  await page.goto('/feed');

  // El contenido lo siembra `pnpm db:demo`. Crearlo aqui ensuciaba el feed de
  // desarrollo un poco mas en cada corrida.
  await expect(page.getByText('ejercicio 4').first()).toBeVisible();

  await page.getByRole('button', { name: 'Jueves' }).first().click();
  await page.getByRole('button', { name: /Me late/ }).first().click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'capturas/4-feed.png' });

  // Detalle de publicacion con comentarios.
  // Por href y no por texto: la etiqueta cambia segun cuantos comentarios haya.
  await page.locator('a[href^="/publicacion/"]').first().click();
  await expect(page).toHaveURL(/\/publicacion\//);
  await page.getByLabel('Tu comentario').fill('Yo digo viernes, el jueves tengo laboratorio.');
  // `exact` importa: sin el, "Comentar" tambien casa con "Reportar comentario"
  // en cuanto la publicacion tiene un comentario, y la prueba falla segun
  // cuantas veces se haya corrido antes.
  await page.getByRole('button', { name: 'Comentar', exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'capturas/8-publicacion.png', fullPage: true });

  await page.goto('/eventos');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'capturas/9-eventos.png' });

  await page.goto('/aventones');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'capturas/10-aventones.png' });

  await page.goto('/marketplace');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'capturas/11-marketplace.png' });

  await page.goto('/directorio');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'capturas/5-directorio.png', fullPage: true });

  await page.goto('/ajustes');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'capturas/15-ajustes.png', fullPage: true });

  await page.goto(`/perfil/${handle}`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'capturas/6-perfil.png', fullPage: true });

  // La version movil es la que de verdad va a usar la gente en el campus.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/feed');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'capturas/7-feed-movil.png' });

  // Recoge su usuario: si no, cada corrida deja uno en el directorio.
  psql(`delete from users where email = '${email}'`);
});
