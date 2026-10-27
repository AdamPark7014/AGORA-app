import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import { LADO_MINIATURA } from './procesar.js';

/**
 * Deja cualquier video en un formato que reproduzcan todos: H.264 + AAC en MP4
 * con `faststart`, el lado mayor a lo mas 1280 px y sin metadatos (ni GPS).
 *
 * Sin esto el video se guardaba tal cual llegaba: el iPhone graba HEVC en
 * `.mov`, que Chrome, Firefox y muchos Android no reproducen, y no habia
 * portada (la API devolvia `thumbUrl: null` y cada cliente adivinaba un cuadro).
 * De paso sale la portada (un cuadro a medio segundo, en WebP) y las medidas.
 *
 * Usa ffmpeg y ffprobe del sistema (la imagen de la API los instala). Corre
 * despues de responder la subida: el telefono no espera la re-codificacion.
 */

export const LADO_MAX_VIDEO = 1280;
/** Un video de 60 MB tarda menos de un minuto en el servidor; esto es solo un tope. */
const TIEMPO_MAX_MS = 5 * 60 * 1000;

export interface VideoListo {
  readonly datos: Buffer;
  readonly portada: Buffer;
  readonly ancho: number;
  readonly alto: number;
}

export class VideoInvalido extends Error {}

const ejecutar = (programa: string, args: readonly string[]): Promise<string> =>
  new Promise((resolver, rechazar) => {
    const proceso = spawn(programa, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let salida = '';
    let errores = '';
    proceso.stdout.on('data', (d: Buffer) => (salida += d.toString()));
    proceso.stderr.on('data', (d: Buffer) => (errores = (errores + d.toString()).slice(-2000)));
    const reloj = setTimeout(() => proceso.kill('SIGKILL'), TIEMPO_MAX_MS);
    proceso.on('error', (e) => {
      clearTimeout(reloj);
      rechazar(e);
    });
    proceso.on('close', (codigo) => {
      clearTimeout(reloj);
      if (codigo === 0) resolver(salida);
      else rechazar(new VideoInvalido(`${programa} salio con ${codigo}: ${errores.trim().split('\n').pop() ?? ''}`));
    });
  });

let disponible: Promise<boolean> | undefined;

/** ffmpeg y ffprobe en el PATH. En desarrollo pueden faltar: entonces el video se queda como llego. */
export const ffmpegDisponible = (): Promise<boolean> => {
  disponible ??= Promise.all([ejecutar('ffmpeg', ['-version']), ejecutar('ffprobe', ['-version'])])
    .then(() => true)
    .catch(() => false);
  return disponible;
};

export const transcodificarVideo = async (entrada: Buffer): Promise<VideoListo> => {
  const carpeta = await mkdtemp(join(tmpdir(), 'agora-video-'));
  const origen = join(carpeta, 'entrada');
  const destino = join(carpeta, 'video.mp4');
  const cuadro = join(carpeta, 'portada.png');
  try {
    await writeFile(origen, entrada);
    await ejecutar('ffmpeg', [
      '-v', 'error', '-y', '-i', origen,
      '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-sn', '-dn',
      // Lado mayor a 1280 sin agrandar, y medidas pares (las exige H.264).
      '-vf', `scale=w='min(${LADO_MAX_VIDEO},iw)':h='min(${LADO_MAX_VIDEO},ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
      '-movflags', '+faststart', destino,
    ]);
    await ejecutar('ffmpeg', ['-v', 'error', '-y', '-ss', '0.5', '-i', destino, '-frames:v', '1', cuadro]).catch(() =>
      // Videos de menos de medio segundo: el primer cuadro.
      ejecutar('ffmpeg', ['-v', 'error', '-y', '-i', destino, '-frames:v', '1', cuadro]),
    );
    const sonda = JSON.parse(
      await ejecutar('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', destino]),
    ) as { streams?: Array<{ width?: number; height?: number }> };
    const ancho = sonda.streams?.[0]?.width;
    const alto = sonda.streams?.[0]?.height;
    if (!ancho || !alto) throw new VideoInvalido('El video no trae imagen.');

    const portada = await sharp(await readFile(cuadro))
      .resize({ width: LADO_MINIATURA, height: LADO_MINIATURA, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    return { datos: await readFile(destino), portada, ancho, alto };
  } finally {
    await rm(carpeta, { recursive: true, force: true });
  }
};
