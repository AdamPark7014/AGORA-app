import { execSync } from 'node:child_process';
import { expect, test } from '@playwright/test';

/**
 * Capturas del panel de moderación.
 *
 * Entra por la web (puerto 3200) y navega al panel (3300) en el mismo
 * contexto: en desarrollo son dos puertos del mismo host, así que la cookie de
 * sesión —sin atributo `domain`— vale en ambos. En producción esto lo resuelve
 * `COOKIE_DOMAIN=".tudominio.mx"` entre `agora.mx` y `admin.agora.mx`.
 */

const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3300';
const MODERADOR = 'adam.delpozoos@udlap.mx';
// Codigo maestro de desarrollo: deterministico y sin gastar cuota de OTP.
const CODIGO = '123456';

const psql = (sql: string): string =>
  execSync(
    `docker exec agora-postgres psql -U agora -d agora -t -A -c "${sql.replace(/"/g, '\\"')}"`,
    { encoding: 'utf8' },
  ).trim();

test('capturas del panel de moderacion', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  // Sesión del moderador con el código maestro de desarrollo.
  await page.goto('/');
  await page.getByPlaceholder('nombre.apellido@udlap.mx').fill(MODERADOR);
  await page.getByRole('button', { name: 'Mandarme el código' }).click();
  await expect(page.getByPlaceholder('000000')).toBeVisible();


  await page.getByPlaceholder('000000').fill(CODIGO);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/(feed|registro)$/);

  // Se genera un reporte para que la cola no salga vacía en la captura.
  const postId = psql("select id from posts where estado = 'PUBLICADO' limit 1");
  const otroUsuario = psql(
    `select id from users where email = 'prueba.uno@udlap.mx'`,
  );
  if (postId && otroUsuario) {
    psql(
      `insert into reports (id, "reportanteId", "postId", motivo, detalle, estado, "createdAt") ` +
        `values ('demo-rep-1', '${otroUsuario}', '${postId}', 'ACOSO_DIRIGIDO', ` +
        `'Lleva dias molestando a la misma persona en los comentarios.', 'ABIERTO', now()) ` +
        `on conflict (id) do nothing`,
    );
  }

  await page.goto(`${ADMIN}/`);
  await expect(page.getByRole('heading', { name: 'Resumen' })).toBeVisible();
  await page.screenshot({ path: 'capturas/12-admin-resumen.png' });

  await page.goto(`${ADMIN}/cola`);
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'capturas/13-admin-cola.png' });

  await page.goto(`${ADMIN}/historial`);
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'capturas/14-admin-historial.png' });
});
