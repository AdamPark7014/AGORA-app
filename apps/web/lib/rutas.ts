/**
 * Que rutas se pueden ver sin haber entrado.
 *
 * Existe porque la lista estaba copiada en tres sitios —la barra inferior, el
 * marco de tres columnas y el encabezado— y ninguno de los tres incluia
 * `/terminos` ni `/privacidad`. Consecuencia: en el aviso de privacidad, que es
 * una pagina estatica que cualquiera puede abrir sin cuenta, se montaban la
 * campana, la barra y los carriles, y cada uno disparaba sus peticiones con
 * sesion. Nueve 401 seguidos para pintar un texto legal.
 *
 * No es solo desperdicio: son 401 en el registro del servidor que enmascaran
 * los 401 de verdad, y trabajo de base de datos para nada.
 *
 * Prefijos `/publicacion`, `/perfil`, `/eventos/:id`, `/marketplace/:id`:
 * preview pública (OG unfurl + CTA login). `/perfil/mio` sigue autenticado.
 */
export const RUTAS_PUBLICAS = [
  '/',
  '/registro',
  '/bienvenida',
  '/terminos',
  '/privacidad',
  '/reglas',
] as const;

/** Pantallas que nunca llevan la navegacion de la app (entrada, legales). */
export const esRutaSinSesion = (ruta: string): boolean =>
  (RUTAS_PUBLICAS as readonly string[]).includes(ruta);

/**
 * Contenido compartible: se puede abrir sin cuenta (preview + invitacion a
 * entrar), pero quien ya entro debe conservar la barra y los carriles.
 */
export const esPreviewPublica = (ruta: string): boolean => {
  if (ruta.startsWith('/publicacion/')) return true;
  if (ruta.startsWith('/perfil/') && ruta !== '/perfil/mio') return true;
  if (/^\/eventos\/[^/]+$/.test(ruta)) return true;
  if (/^\/marketplace\/[^/]+$/.test(ruta)) return true;
  return false;
};

/** `true` si la ruta se sirve sin sesion (exacta o preview UGC). */
export const esRutaPublica = (ruta: string): boolean =>
  esRutaSinSesion(ruta) || esPreviewPublica(ruta);
