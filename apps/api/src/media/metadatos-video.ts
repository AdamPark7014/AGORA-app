/**
 * Quita la ubicacion (y el resto de metadatos de usuario) de un MP4 / MOV.
 *
 * Los videos del telefono guardan donde se grabaron: Android en
 * `moov/udta/©xyz`, el iPhone en `moov/meta` (com.apple.quicktime.location).
 * Las imagenes pasan por sharp y pierden el EXIF, pero un video se guardaba
 * tal cual en un bucket publico, con el GPS de la casa de quien lo grabo.
 *
 * No hace falta re-codificar ni ffmpeg: cada caja ISO-BMFF es
 * `[tamano][tipo][contenido]`. Se llena de ceros el contenido de las cajas
 * `udta` y `meta` (y de las `uuid` con XMP) y se les cambia el tipo a `free`,
 * que todo reproductor ignora. El archivo mide exactamente lo mismo, asi que
 * los desplazamientos de `stco`/`co64` que apuntan a los fotogramas siguen
 * siendo validos y el video se reproduce igual.
 */

/** Cajas cuyo contenido son metadatos del usuario, nunca datos del video. */
const CAJAS_METADATOS = new Set(['udta', 'meta']);

/** Contenedores donde se buscan esas cajas. */
const CONTENEDORES = new Set(['moov', 'trak']);

/** UUID de las cajas XMP de Adobe, que tambien pueden llevar GPS. */
const UUID_XMP = 'be7acfcb97a942e89c71999491e3afac';

interface Caja {
  readonly tipo: string;
  readonly inicio: number;
  readonly cabecera: number;
  readonly fin: number;
}

/** Lee la caja que empieza en `inicio`, o null si los bytes no cuadran. */
const leerCaja = (datos: Buffer, inicio: number, limite: number): Caja | null => {
  if (inicio + 8 > limite) return null;
  let tamano = datos.readUInt32BE(inicio);
  const tipo = datos.toString('latin1', inicio + 4, inicio + 8);
  let cabecera = 8;

  if (tamano === 1) {
    // Tamano de 64 bits justo despues del tipo.
    if (inicio + 16 > limite) return null;
    const grande = datos.readBigUInt64BE(inicio + 8);
    if (grande > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    tamano = Number(grande);
    cabecera = 16;
  } else if (tamano === 0) {
    // La caja llega hasta el final del contenedor.
    tamano = limite - inicio;
  }

  if (tamano < cabecera || inicio + tamano > limite) return null;
  return { tipo, inicio, cabecera, fin: inicio + tamano };
};

const vaciar = (datos: Buffer, caja: Caja): void => {
  datos.fill(0, caja.inicio + caja.cabecera, caja.fin);
  datos.write('free', caja.inicio + 4, 'latin1');
};

const esXmp = (datos: Buffer, caja: Caja): boolean =>
  caja.fin - caja.inicio >= caja.cabecera + 16 &&
  datos.toString('hex', caja.inicio + caja.cabecera, caja.inicio + caja.cabecera + 16) === UUID_XMP;

/** Recorre las cajas de [inicio, fin) y limpia las de metadatos. Devuelve cuantas limpio. */
const limpiarNivel = (datos: Buffer, inicio: number, fin: number): number => {
  let limpias = 0;
  let pos = inicio;
  while (pos < fin) {
    const caja = leerCaja(datos, pos, fin);
    if (!caja) break; // Estructura rara: se deja lo que queda como esta.

    if (CAJAS_METADATOS.has(caja.tipo) || (caja.tipo === 'uuid' && esXmp(datos, caja))) {
      vaciar(datos, caja);
      limpias += 1;
    } else if (CONTENEDORES.has(caja.tipo)) {
      limpias += limpiarNivel(datos, caja.inicio + caja.cabecera, caja.fin);
    }
    pos = caja.fin;
  }
  return limpias;
};

/**
 * Devuelve una copia del video sin metadatos de usuario. Si el archivo no es
 * un ISO-BMFF que se entienda, devuelve la copia intacta: la validacion de que
 * sea un video la hace `detectarMime`, aqui solo se limpia.
 */
export const limpiarMetadatosVideo = (original: Buffer): { datos: Buffer; limpias: number } => {
  const datos = Buffer.from(original);
  const limpias = limpiarNivel(datos, 0, datos.length);
  return { datos, limpias };
};
