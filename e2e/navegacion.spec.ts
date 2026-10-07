import { expect, test } from '@playwright/test';

/**
 * Abrir una publicacion o un perfil no puede dejar al usuario sin navegacion.
 *
 * Esas rutas tienen preview publica para enlaces compartidos, y la app las
 * trataba igual que la pantalla de entrada: sin barra, sin carriles, sin
 * campana, aunque hubiera sesion. Y el login ignoraba `?siguiente=`, asi que
 * quien entraba desde un enlace compartido acababa en el feed y no en lo que
 * le habian mandado.
 */

const API = 'http://localhost:4200/api';

test('una publicacion abierta con sesion conserva la navegacion; sin sesion es preview', async ({
  page,
}) => {
  const entrar = await page.request.post(`${API}/auth/otp/verificar`, {
    data: { email: 'adam.delpozoos@udlap.mx', codigo: '123456' },
  });
  expect(entrar.status()).toBe(201);

  const comunidades = await (await page.request.get(`${API}/perfil/mis-comunidades`)).json();
  const creado = await page.request.post(`${API}/posts`, {
    data: { comunidadSlug: comunidades[0].slug, texto: 'prueba de navegacion e2e', mediaIds: [] },
  });
  expect(creado.status()).toBe(201);
  const { id } = await creado.json();
  const ruta = `/publicacion/${id}`;

  try {
    await page.goto(ruta);
    await expect(page.locator('.rejilla')).toBeVisible();
    await expect(page.locator('.pagina-centrada')).toHaveCount(0);

    // Con sesion, el login manda directo a donde apuntaba el enlace.
    await page.goto(`/?siguiente=${encodeURIComponent(ruta)}`);
    await expect(page).toHaveURL(new RegExp(`${ruta}$`));

    // Un `siguiente` hacia otro sitio se ignora.
    await page.goto(`/?siguiente=${encodeURIComponent('//evil.example')}`);
    await expect(page).not.toHaveURL(/evil\.example/);
    await expect(page).toHaveURL(/\/(feed|bienvenida)$/);

    await page.context().clearCookies();
    await page.goto(ruta);
    await expect(page.locator('.pagina-centrada')).toBeVisible();
    await expect(page.locator('.rejilla')).toHaveCount(0);
    await expect(page.locator('a[href^="/?siguiente="]').first()).toBeVisible();
  } finally {
    await page.request.post(`${API}/auth/otp/verificar`, {
      data: { email: 'adam.delpozoos@udlap.mx', codigo: '123456' },
    });
    await page.request.delete(`${API}/posts/${id}`);
  }
});
