import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import sharp from 'sharp';

import { LADO_MAX_VIDEO, ffmpegDisponible, transcodificarVideo } from './transcodificar.js';

/** Un clip vertical como los del iPhone: HEVC en .mov, 1080x1920, con sonido. */
const clipDeIphone = (): Buffer => {
  const carpeta = mkdtempSync(join(tmpdir(), 'agora-prueba-'));
  const ruta = join(carpeta, 'clip.mov');
  try {
    execFileSync('ffmpeg', [
      '-v', 'error', '-y',
      '-f', 'lavfi', '-i', 'testsrc2=size=1080x1920:rate=30',
      '-f', 'lavfi', '-i', 'sine=frequency=440',
      '-t', '1.5', '-c:v', 'libx265', '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', ruta,
    ]);
    return readFileSync(ruta);
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
};

const codecDe = (datos: Buffer): string => {
  const carpeta = mkdtempSync(join(tmpdir(), 'agora-prueba-'));
  const ruta = join(carpeta, 'video.mp4');
  try {
    writeFileSync(ruta, datos);
    return execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name', '-of', 'csv=p=0', ruta,
    ]).toString().trim();
  } finally {
    rmSync(carpeta, { recursive: true, force: true });
  }
};

test('un HEVC .mov del iPhone sale como H.264 MP4 con portada, sin pasar de 1280', async (t) => {
  if (!(await ffmpegDisponible())) return t.skip('Sin ffmpeg en esta máquina');
  let entrada: Buffer;
  try {
    entrada = clipDeIphone();
  } catch {
    return t.skip('Este ffmpeg no trae libx265');
  }

  const listo = await transcodificarVideo(entrada);

  assert.equal(listo.datos.toString('latin1', 4, 8), 'ftyp', 'no es MP4');
  assert.equal(codecDe(listo.datos), 'h264');
  assert.equal(listo.alto, LADO_MAX_VIDEO);
  assert.equal(listo.ancho, 720);
  const portada = await sharp(listo.portada).metadata();
  assert.equal(portada.format, 'webp');
  assert.ok((portada.height ?? 0) <= 480);
});

test('lo que no es video se rechaza', async (t) => {
  if (!(await ffmpegDisponible())) return t.skip('Sin ffmpeg en esta máquina');
  await assert.rejects(transcodificarVideo(Buffer.from('esto no es un video')));
});
