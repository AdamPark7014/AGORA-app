import sharp from 'sharp';

/**
 * Normaliza una imagen antes de guardarla.
 *
 * Lo que importa aqui es la privacidad: una foto tomada con el telefono lleva
 * en el EXIF las coordenadas GPS de donde se tomo (la casa, el cuarto del
 * colegio). Re-codificar con sharp descarta todos los metadatos. De paso se
 * aplica la orientacion, se limita el tamano y se genera la miniatura del feed.
 *
 * Los GIF se guardan tal cual (pueden ser animados y no llevan EXIF); solo se
 * leen sus dimensiones.
 */

export const LADO_MAX = 2048;
export const LADO_MINIATURA = 480;

/** ~8000 x 7500. Corta "bombas de descompresion" de pocos KB y millones de pixeles. */
const LIMITE_PIXELES = 60_000_000;

export interface ImagenProcesada {
  readonly datos: Buffer;
  readonly mime: string;
  readonly ancho: number | null;
  readonly alto: number | null;
  /** Null si la imagen ya cabe en la miniatura: se usa la principal. */
  readonly miniatura: Buffer | null;
}

export class ImagenInvalida extends Error {}

export const procesarImagen = async (datos: Buffer, mime: string): Promise<ImagenProcesada> => {
  try {
    if (mime === 'image/gif') {
      const meta = await sharp(datos, { limitInputPixels: LIMITE_PIXELES }).metadata();
      return {
        datos,
        mime,
        ancho: meta.width ?? null,
        alto: meta.pageHeight ?? meta.height ?? null,
        miniatura: null,
      };
    }

    let tubo = sharp(datos, { limitInputPixels: LIMITE_PIXELES, failOn: 'error' })
      .rotate()
      .resize({ width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true });

    // PNG se queda en PNG (transparencias, capturas de pantalla); WEBP en WEBP;
    // el resto a JPEG.
    let salida = 'image/jpeg';
    if (mime === 'image/png') {
      tubo = tubo.png({ compressionLevel: 9 });
      salida = 'image/png';
    } else if (mime === 'image/webp') {
      tubo = tubo.webp({ quality: 82 });
      salida = 'image/webp';
    } else {
      tubo = tubo.jpeg({ quality: 85, mozjpeg: true });
    }

    const { data, info } = await tubo.toBuffer({ resolveWithObject: true });

    const necesitaMiniatura = info.width > LADO_MINIATURA || info.height > LADO_MINIATURA;
    const miniatura = necesitaMiniatura
      ? await sharp(data)
          .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: 'inside' })
          .webp({ quality: 70 })
          .toBuffer()
      : null;

    return { datos: data, mime: salida, ancho: info.width, alto: info.height, miniatura };
  } catch (e) {
    throw new ImagenInvalida(e instanceof Error ? e.message : 'Imagen invalida');
  }
};
