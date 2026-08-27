import { expect, test } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * El panel de moderacion vive en su propio origen (puerto 3300 en desarrollo,
 * admin.dominio.mx en produccion) y comparte la sesion con la web.
 *
 * Lo que de verdad importa probar aqui no es la interfaz, sino que el permiso
 * se comprueba EN EL SERVIDOR: esconder botones no es seguridad.
 */

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3300';

test('la API de moderacion exige sesion', async ({ request }) => {
  for (const ruta of ['/api/moderacion/cola', '/api/moderacion/resumen', '/api/moderacion/historial']) {
    const r = await request.get(`${ADMIN}${ruta}`, { failOnStatusCode: false });
    expect(r.status(), `${ruta} sin sesion`).toBe(401);
  }
});

test('un miembro sin rol no pasa del guard', async ({ request }) => {
  // Sesion de un miembro normal, sin rol de moderador.
  const entrada = await request.post('http://localhost:4200/api/auth/otp/verificar', {
    data: { email: 'prueba.dos@udlap.mx', codigo: '123456' },
    failOnStatusCode: false,
  });
  expect(entrada.status()).toBe(201);

  const cola = await request.get('http://localhost:4200/api/moderacion/cola', {
    failOnStatusCode: false,
  });
  expect(cola.status()).toBe(403);
});

test('el panel se niega a mostrarse sin rol', async ({ page }) => {
  await page.goto(`${ADMIN}/cola`);
  // Sin sesion en este contexto: debe decirlo, no mostrar una cola vacia.
  await expect(page.getByText(/No has iniciado sesión|No tienes acceso/)).toBeVisible();
});

test('resolver exige motivo escrito', async ({ request }) => {
  await request.post('http://localhost:4200/api/auth/otp/verificar', {
    data: { email: 'adam.delpozoos@udlap.mx', codigo: '123456' },
    failOnStatusCode: false,
  });

  const id = psql("select id from reports limit 1");
  if (!id) test.skip(true, 'no hay reportes en la base');

  const sinMotivo = await request.post(
    `http://localhost:4200/api/moderacion/reportes/${id}/resolver`,
    { data: { accion: 'RETIRAR_CONTENIDO', motivo: '' }, failOnStatusCode: false },
  );
  // 400 por validacion; el usuario afectado tiene derecho a un motivo escrito.
  expect(sinMotivo.status()).toBe(400);
});

test('el panel no se puede meter en un iframe ni indexar', async ({ request }) => {
  const r = await request.get(`${ADMIN}/`);
  expect(r.headers()['x-frame-options']).toBe('DENY');
  expect(r.headers()['x-robots-tag']).toContain('noindex');
});
