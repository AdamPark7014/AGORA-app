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
 */
export const RUTAS_PUBLICAS = ['/', '/registro', '/terminos', '/privacidad'] as const;

/** `true` si la ruta se sirve sin sesion. */
export const esRutaPublica = (ruta: string): boolean =>
  (RUTAS_PUBLICAS as readonly string[]).includes(ruta);
