import { join } from 'node:path';

import type { NextConfig } from 'next';

const API = process.env.API_INTERNA ?? 'http://localhost:4200';

const config: NextConfig = {
  reactStrictMode: true,
  // Los paquetes del workspace se importan desde su TypeScript, no desde un
  // `dist` compilado, y sus imports internos llevan extension `.js` como exige
  // NodeNext. Sin declararlos aqui, webpack busca un `udlap.js` que no existe y
  // la web entera devuelve 500.
  //
  // Esto estuvo roto y no se noto porque en `packages/shared/src` quedaban
  // artefactos `.js` de una compilacion vieja: webpack los resolvia y servia
  // codigo de hace dias. Al limpiarlos salio el fallo de verdad.
  transpilePackages: ['@agora/shared', '@agora/contracts'],
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
  // La API se sirve bajo el mismo origen que la web. Asi la cookie de sesion
  // es same-origin: nada de CORS ni de SameSite=None, que es justo lo que
  // rompe el login dentro de una PWA instalada en iOS.
  async rewrites() {
    return [{ source: '/api/:ruta*', destination: `${API}/api/:ruta*` }];
  },
};

export default config;
