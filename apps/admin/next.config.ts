import { join } from 'node:path';

import type { NextConfig } from 'next';

const API = process.env.API_INTERNA ?? 'http://localhost:4200';

/**
 * El panel vive en su propio subdominio (admin.tudominio.mx) y comparte la
 * sesion con la web gracias a COOKIE_DOMAIN=".tudominio.mx".
 *
 * Igual que en la web, /api se reescribe a la API para que las peticiones sean
 * del mismo origen y la cookie viaje sola.
 */
const config: NextConfig = {
  reactStrictMode: true,
  // Mismo motivo que en la web: los paquetes del workspace se importan desde
  // TypeScript y sus imports internos llevan extension `.js`. Sin esto webpack
  // no los resuelve.
  transpilePackages: ['@agora/shared', '@agora/contracts', '@agora/rbac'],
  /**
   * `./udlap.js` es en realidad `udlap.ts`.
   *
   * `moduleResolution: NodeNext` obliga a escribir la extension `.js` en los
   * imports relativos aunque el archivo sea TypeScript. Node y `tsc` lo
   * entienden; webpack no, salvo que se le diga aqui. `transpilePackages`
   * hace que compile el paquete, pero no cambia como resuelve rutas.
   */
  webpack(config) {
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
    return config;
  },
  /**
   * La salida `standalone` solo hace falta para la imagen de Docker.
   *
   * Fuera de ahi estorba: para armarla, Next crea enlaces simbolicos, y en
   * Windows eso exige el Modo de desarrollador o permisos de administrador.
   * Sin ellos `pnpm build` **falla siempre en local**, despues de haber
   * compilado bien — la salida dice "Compiled successfully" y a continuacion
   * peta copiando archivos.
   *
   * Eso no era un detalle: significaba que no se podia comprobar la
   * compilacion en la maquina de desarrollo, y por ahi se colo que la web
   * estuviera devolviendo 500 en todas sus paginas durante dias. `tsc` pasaba,
   * las unitarias pasaban, y el unico paso que lo habria cazado no se podia
   * ejecutar.
   *
   * El Dockerfile enciende la bandera; en local se compila normal y el build
   * vuelve a servir como comprobacion previa.
   */
  ...(process.env.BUILD_STANDALONE === 'true' ? { output: 'standalone' as const } : {}),
  outputFileTracingRoot: join(import.meta.dirname, '../..'),
  async rewrites() {
    return [{ source: '/api/:ruta*', destination: `${API}/api/:ruta*` }];
  },
  async headers() {
    return [
      {
        source: '/:ruta*',
        headers: [
          // El panel no tiene por que aparecer dentro de un marco, nunca.
          { key: 'X-Frame-Options', value: 'DENY' },
          // Ni ser indexado: es una superficie administrativa.
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
    ];
  },
};

export default config;
