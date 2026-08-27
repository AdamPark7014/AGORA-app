import { execSync } from 'node:child_process';

/**
 * Ejecuta SQL contra la base de pruebas.
 *
 * En local (Docker Compose de `infra/`) usa `docker exec agora-postgres`.
 * En CI (GitHub Actions services) no hay ese contenedor: habla con `psql`
 * directo al host del service (`AGORA_PSQL_DIRECT=1` o `CI=true`).
 */
export function psql(sql: string): string {
  const escaped = sql.replace(/"/g, '\\"');
  const directo = process.env.AGORA_PSQL_DIRECT === '1' || process.env.CI === 'true';

  if (directo) {
    const host = process.env.POSTGRES_HOST ?? 'localhost';
    const port = process.env.POSTGRES_PORT ?? '5432';
    const user = process.env.POSTGRES_USER ?? 'agora';
    const db = process.env.POSTGRES_DB ?? 'agora';
    const password = process.env.POSTGRES_PASSWORD ?? 'agora_ci';
    const url = `postgresql://${user}:${password}@${host}:${port}/${db}`;
    return execSync(`psql "${url}" -t -A -c "${escaped}"`, {
      encoding: 'utf8',
      env: { ...process.env, PGPASSWORD: password },
    }).trim();
  }

  return execSync(
    `docker exec agora-postgres psql -U agora -d agora -t -A -c "${escaped}"`,
    { encoding: 'utf8' },
  ).trim();
}
