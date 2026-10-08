import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
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
  /** Borra por la URL que devolvio `guardar`. No falla si ya no existe. */
  borrar(url: string): Promise<void>;
}

/**
 * Tope por persona en 24 horas. Alcanza para un dia muy activo (decenas de
 * fotos) y corta a quien use la red como disco gratis o la llene de basura.
 */
export const CUOTA_DIARIA = { archivos: 80, bytes: 400 * 1024 * 1024 } as const;

export const excedeCuota = (usado: { archivos: number; bytes: number }, nuevoBytes: number): boolean =>
  usado.archivos + 1 > CUOTA_DIARIA.archivos || usado.bytes + nuevoBytes > CUOTA_DIARIA.bytes;

/** Ultimo segmento de la URL: el nombre que genero el servidor. */
const nombreDeUrl = (url: string): string => url.split('?')[0]!.split('/').pop() ?? '';

/** Formatos permitidos. Nada de SVG: admite scripts y es un vector de XSS. */
export const MIMES_IMAGEN = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Se re-codifica a JPEG con sharp; nunca se guarda como AVIF.
  'image/avif',
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

/**
 * Nombre que genera el servidor para disco local. Rechaza path traversal y
 * extensiones inventadas: un `../` aqui seria leer cualquier archivo.
 */
export const nombreArchivoLocalValido = (nombre: string): boolean =>
  /^[a-f0-9]{24}\.(jpg|png|webp|gif|mp4|webm|mov)$/.test(nombre);

/**
 * Validacion pura de una subida (magic bytes + MIME + tope).
 * El controlador solo traduce el rechazo a HTTP 400.
 */
export type ValidacionSubida =
  | { ok: true; mime: string }
  | { ok: false; motivo: string };

export const validarSubida = (datos: Buffer, size: number): ValidacionSubida => {
  const mime = detectarMime(datos);
  if (mime === 'image/heic') {
    return {
      ok: false,
      motivo: 'Las fotos HEIC no se pueden subir. Exportala como JPG o actualiza la app.',
    };
  }
  if (!mime || !MIMES_PERMITIDOS.has(mime)) {
    return {
      ok: false,
      motivo:
        'Solo se aceptan imagenes (JPG, PNG, WEBP, GIF, AVIF) o videos (MP4, WEBM, MOV).',
    };
  }
  const tope = topeDe(mime);
  if (size > tope) {
    return {
      ok: false,
      motivo: `${esVideo(mime) ? 'El video' : 'La imagen'} pasa de ${Math.round(tope / 1024 / 1024)} MB.`,
    };
  }
  return { ok: true, mime };
};

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

  // ISO-BMFF (MP4, MOV, HEIC, AVIF): caja 'ftyp' en el byte 4 con la marca
  // principal y las compatibles. Antes todo 'ftyp' era video/mp4, y una foto
  // HEIC del iPhone se guardaba como "video" sin pasar por sharp: con su GPS.
  if (datos.toString('ascii', 4, 8) === 'ftyp') return mimeIsoBmff(datos);

  return null;
};

/** Marcas de video MP4 y derivados que reproducen los navegadores. */
const MARCAS_MP4 = new Set([
  'isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ',
  'M4VP', 'MSNV', 'dash', 'mmp4', 'f4v ', '3gp4', '3gp5', '3gp6', '3g2a',
]);

/** Fotos HEIF/HEIC (iPhone). sharp precompilado no decodifica HEVC. */
const MARCAS_HEIC = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);

const mimeIsoBmff = (datos: Buffer): string | null => {
  const tamanoFtyp = datos.length >= 4 ? datos.readUInt32BE(0) : 0;
  const finFtyp = Math.min(Math.max(tamanoFtyp, 16), datos.length, 256);
  const marcas = [datos.toString('latin1', 8, 12)];
  for (let i = 16; i + 4 <= finFtyp; i += 4) marcas.push(datos.toString('latin1', i, i + 4));
  const principal = marcas[0]!;

  // Las imagenes se miran primero: un HEIC puede declarar 'mif1' de principal
  // y la marca concreta entre las compatibles.
  if (marcas.some((m) => m === 'avif' || m === 'avis')) return 'image/avif';
  if (marcas.some((m) => MARCAS_HEIC.has(m))) return 'image/heic';
  if (principal === 'mif1' || principal === 'msf1') return 'image/heic';

  if (principal.startsWith('qt')) return 'video/quicktime';
  if (MARCAS_MP4.has(principal)) return 'video/mp4';
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

  async borrar(url: string): Promise<void> {
    const nombre = nombreDeUrl(url);
    if (!nombreArchivoLocalValido(nombre)) return;
    try {
      await unlink(join(this.carpeta, nombre));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
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

  private async cliente() {
    const { S3Client } = await import('@aws-sdk/client-s3');
    return new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async borrar(url: string): Promise<void> {
    const nombre = nombreDeUrl(url);
    if (!nombreArchivoLocalValido(nombre)) return;
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const cliente = await this.cliente();
    await cliente.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: nombre }));
  }

  async guardar(datos: Buffer, mime: string): Promise<ArchivoSubido> {
    const nombre = nombreNuevo(mime);
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const cliente = await this.cliente();

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
