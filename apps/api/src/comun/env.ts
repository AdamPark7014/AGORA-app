import { cargarEnv } from './cargar-env.js';

/**
 * Modulo de solo efecto: se importa el primero en `main.ts` para que el `.env`
 * este cargado antes de que se evalue cualquier otro modulo. En CommonJS los
 * `require` corren en orden de import, asi que el orden aqui si importa.
 */
cargarEnv();
