import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

/**
 * Encuentra el `.env` de la raiz del monorepo subiendo desde varios puntos.
 *
 * El punto de partida cambia segun quien invoque: `dist/comun/` al compilar,
 * `src/comun/` bajo tsx, y el cwd depende del runner. Por eso se prueban los
 * dos y se sube buscando.
 */
export function buscarEnv(desde: readonly string[]): string | null {
  for (const inicio of desde) {
    let actual = resolve(inicio);
    for (let salto = 0; salto < 6; salto += 1) {
      const candidato = join(actual, '.env');
      if (existsSync(candidato)) return candidato;
      const padre = dirname(actual);
      if (padre === actual) break;
      actual = padre;
    }
  }
  return null;
}

/**
 * Carga el `.env` de la raiz.
 *
 * Vive aqui y no en el script de arranque porque la API se levanta de tres
 * formas distintas —`nest start --watch`, `node dist/main.js` y el runner de
 * e2e— y solo una pasaba por el script. El resultado era una API que arrancaba
 * sin configuracion segun como la hubieras invocado: el tipo de fallo que solo
 * aparece cuando ya te urge.
 *
 * `process.loadEnvFile` es de Node (21.7+), no una dependencia. Y como
 * `--env-file`, **no pisa** lo que ya venga en el entorno: en el VPS mandan las
 * variables reales y este archivo ni siquiera existe.
 */
export function cargarEnv(): string | null {
  const ruta = buscarEnv([__dirname, process.cwd()]);
  if (ruta) process.loadEnvFile(ruta);
  return ruta;
}
