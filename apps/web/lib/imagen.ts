/** Lo minimo de un adjunto para pintarlo en una galeria. */
export interface AdjuntoImagen {
  url: string;
  /** Version de 480 px que genera la API. `null` si la imagen ya era chica o es animada. */
  thumbUrl?: string | null;
  ancho?: number | null;
}

/**
 * `src`/`srcSet` de una foto de publicacion.
 *
 * El feed pedia siempre la original (hasta 2048 px) para pintarla en una caja
 * de 300: entre diez y veinte veces mas datos por foto, en el celular y con
 * los datos del plan. Con `srcSet` el navegador baja la miniatura de 480 px
 * cuando basta y la original solo en pantallas que la aprovechan. El visor a
 * pantalla completa sigue usando `url`.
 */
export function atributosImagen(m: AdjuntoImagen, fotosEnGaleria = 1) {
  if (!m.thumbUrl) return { src: m.url };
  return {
    src: m.thumbUrl,
    srcSet: `${m.thumbUrl} 480w, ${m.url} ${m.ancho ?? 2048}w`,
    sizes: fotosEnGaleria > 1 ? '(max-width: 640px) 50vw, 300px' : '(max-width: 640px) 100vw, 600px',
  };
}
