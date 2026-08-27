const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

/**
 * Metro en un monorepo pnpm.
 *
 * `watchFolders` con la raiz no es opcional: sin ella Metro no ve `packages/*`
 * y cualquier import de `@agora/contracts` falla en tiempo de bundle.
 *
 * Lo que SI hay que dejar en paz es `disableHierarchicalLookup`. Es el consejo
 * habitual para monorepos con npm o yarn —donde `node_modules` esta aplanado y
 * la busqueda hacia arriba resuelve copias duplicadas de React— pero con pnpm
 * hace justo lo contrario: cada paquete guarda sus dependencias en su propio
 * `node_modules` dentro del almacen `.pnpm`, y apagar la busqueda jerarquica
 * deja a Metro sin forma de encontrarlas. Con ella apagada, `expo` no podia ni
 * resolver `expo-modules-core`.
 *
 * pnpm ya evita los duplicados de React por si solo: no aplana, asi que solo
 * existe una copia resuelta por el arbol de dependencias.
 */
const raizProyecto = __dirname;
const raizMonorepo = path.resolve(raizProyecto, '../..');

const config = getDefaultConfig(raizProyecto);

config.watchFolders = [raizMonorepo];

config.resolver.nodeModulesPaths = [
  path.resolve(raizProyecto, 'node_modules'),
  path.resolve(raizMonorepo, 'node_modules'),
];

module.exports = config;
