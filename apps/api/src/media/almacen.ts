import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Almacenamiento de imagenes.
 *
 * Dos implementaciones tras la misma interfaz: disco local para desarrollo y
 * S3 compatible (Cloudflare R2) para produccion. El disco local no es un
 * atajo — permite trabajar sin cuenta de nada — pero **no sirve en produccion**
 * con mas de un contenedor: cada replica tendria sus propias imagenes y la
 * mitad de las fotos daria 404 segun a quien le tocara atender.
 */

export interface ArchivoSubido {
  readonly url: string;
  readonly bytes: number;
  readonly mime: string;
}

export interface Almacen {
  guardar(datos: Buffer, mime: string): Promise<ArchivoSubido>;
}

/** Formatos permitidos. Nada de SVG: admite scripts y es un vector de XSS. */
export const MIMES_IMAGEN = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

/**
 * Video. Solo contenedores que el navegador reproduce nativamente, sin plugin
 * ni transcodificacion en el servidor: mp4 y webm cubren practicamente todo lo
 * que graba un telefono hoy.
 */
export const MIMES_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

export const MIMES_PERMITIDOS = new Set([...MIMES_IMAGEN, ...MIMES_VIDEO]);

export const esVideo = (mime: string): boolean => MIMES_VIDEO.has(mime);

/** 8 MB para imagen. El video pesa por naturaleza, asi que tiene su propio tope. */
export const MAX_BYTES_IMAGEN = 8 * 1024 * 1024;
export const MAX_BYTES_VIDEO = 60 * 1024 * 1024;
export const MAX_BYTES = MAX_BYTES_VIDEO;

export const topeDe = (mime: string): number =>
  esVideo(mime) ? MAX_BYTES_VIDEO : MAX_BYTES_IMAGEN;

const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

/**
 * Detecta el tipo real leyendo los primeros bytes.
 *
 * El `Content-Type` que manda el navegador es un dato que controla el cliente:
 * cualquiera puede subir un ejecutable diciendo que es `image/png`. Los magic
 * bytes no se pueden falsear sin dejar de ser una imagen valida.
 */
export const detectarMime = (datos: Buffer): string | null => {
  if (datos.length < 12) return null;

  if (datos[0] === 0xff && datos[1] === 0xd8 && datos[2] === 0xff) return 'image/jpeg';
  if (
    datos[0] === 0x89 &&
    datos[1] === 0x50 &&
    datos[2] === 0x4e &&
    datos[3] === 0x47
  ) {
    return 'image/png';
  }
  if (datos.toString('ascii', 0, 6) === 'GIF87a' || datos.toString('ascii', 0, 6) === 'GIF89a') {
    return 'image/gif';
  }
  if (datos.toString('ascii', 0, 4) === 'RIFF' && datos.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp';
  }

  // WebM y Matroska comparten cabecera EBML.
  if (datos[0] === 0x1a && datos[1] === 0x45 && datos[2] === 0xdf && datos[3] === 0xa3) {
    return 'video/webm';
  }

  // MP4 y MOV: caja 'ftyp' en el byte 4, y la marca del contenedor despues.
  if (datos.toString('ascii', 4, 8) === 'ftyp') {
    const marca = datos.toString('ascii', 8, 12);
    // 'qt  ' es QuickTime; el resto de marcas conocidas son MP4 y derivados.
    return marca.startsWith('qt') ? 'video/quicktime' : 'video/mp4';
  }

  return null;
};

/** Nombre impredecible: el nombre original del archivo no se conserva nunca. */
const nombreNuevo = (mime: string): string => {
  const corto = createHash('sha256').update(randomUUID()).digest('hex').slice(0, 24);
  return `${corto}.${EXTENSIONES[mime] ?? 'bin'}`;
};

export class AlmacenLocal implements Almacen {
  constructor(
    private readonly carpeta = join(process.cwd(), 'subidas'),
    private readonly baseUrl = '/api/media/archivo',
  ) {}

  async guardar(datos: Buffer, mime: string): Promise<ArchivoSubido> {
    await mkdir(this.carpeta, { recursive: true });
    const nombre = nombreNuevo(mime);
    await writeFile(join(this.carpeta, nombre), datos);
    return { url: `${this.baseUrl}/${nombre}`, bytes: datos.length, mime };
  }

  get raiz(): string {
    return this.carpeta;
  }
}

export class AlmacenS3 implements Almacen {
  constructor(
    private readonly config: {
      endpoint: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
      publicUrl: string;
    },
  ) {}

  async guardar(datos: Buffer, mime: string): Promise<ArchivoSubido> {
    const nombre = nombreNuevo(mime);
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const cliente = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    await cliente.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: nombre,
        Body: datos,
        ContentType: mime,
        // Un ano: el nombre es un hash, asi que el contenido nunca cambia.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );

    return {
      url: `${this.config.publicUrl.replace(/\/$/, '')}/${nombre}`,
      bytes: datos.length,
      mime,
    };
  }
}

/** Elige el almacen segun el entorno. Falla claro si produccion no lo tiene. */
export const crearAlmacen = (): Almacen => {
  const tieneS3 =
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_PUBLIC_URL;

  if (tieneS3) {
    return new AlmacenS3({
      endpoint: process.env.S3_ENDPOINT!,
      bucket: process.env.S3_BUCKET!,
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      region: process.env.S3_REGION ?? 'auto',
      publicUrl: process.env.S3_PUBLIC_URL!,
    });
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'En produccion hacen falta S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY y S3_PUBLIC_URL: el disco local no sirve con mas de una replica.',
    );
  }

  return new AlmacenLocal();
};
