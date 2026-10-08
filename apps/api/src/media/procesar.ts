import sharp from 'sharp';

/**
 * Normaliza una imagen antes de guardarla.
 *
 * Lo que importa aqui es la privacidad: una foto tomada con el telefono lleva
 * en el EXIF las coordenadas GPS de donde se tomo (la casa, el cuarto del
 * colegio). Re-codificar con sharp descarta todos los metadatos. De paso se
 * aplica la orientacion, se limita el tamano y se genera la miniatura del feed.
 *
 * Los GIF y los WEBP pueden ser animados: se re-codifican con todos sus
 * cuadros (`animated`), lo que tambien descarta comentarios y XMP. Antes el GIF
 * se guardaba tal cual y el WEBP animado se quedaba en su primer cuadro.
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
    const redimensionar = { width: LADO_MAX, height: LADO_MAX, fit: 'inside', withoutEnlargement: true } as const;

    if (mime === 'image/gif') {
      const { data, info } = await sharp(datos, {
        limitInputPixels: LIMITE_PIXELES,
        failOn: 'error',
        animated: true,
      })
        .resize(redimensionar)
        .gif()
        .toBuffer({ resolveWithObject: true });
      return { datos: data, mime, ancho: info.width, alto: info.pageHeight ?? info.height, miniatura: null };
    }

    // Un WEBP animado no se rota: la orientacion EXIF es de fotos, y rotar
    // varias paginas a la vez no lo soporta sharp.
    const animado = mime === 'image/webp';
    let tubo = sharp(datos, { limitInputPixels: LIMITE_PIXELES, failOn: 'error', animated: animado });
    if (!animado) tubo = tubo.rotate();
    tubo = tubo.resize(redimensionar);

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

    const necesitaMiniatura =
      info.width > LADO_MINIATURA || (info.pageHeight ?? info.height) > LADO_MINIATURA;
    const miniatura = necesitaMiniatura
      ? await sharp(data)
          .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: 'inside' })
          .webp({ quality: 70 })
          .toBuffer()
      : null;

    // En un animado `height` es la tira con todos los cuadros; `pageHeight`, uno.
    const alto = info.pageHeight ?? info.height;
    return { datos: data, mime: salida, ancho: info.width, alto, miniatura };
  } catch (e) {
    throw new ImagenInvalida(e instanceof Error ? e.message : 'Imagen invalida');
  }
};
