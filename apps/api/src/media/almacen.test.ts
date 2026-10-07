import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  CUOTA_DIARIA,
  MAX_BYTES_IMAGEN,
  MAX_BYTES_VIDEO,
  detectarMime,
  excedeCuota,
  nombreArchivoLocalValido,
  validarSubida,
} from './almacen.js';

/** JPEG minimo con magic bytes validos (1x1). */
const jpegMinimo = (): Buffer =>
  Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
    0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b,
    0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
    0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31,
    0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff,
    0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
    0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x08, 0xff, 0xc4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xda, 0x00, 0x08,
    0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0x7f, 0xff, 0xd9,
  ]);

test('rechaza SVG aunque el cliente diga image/svg+xml', () => {
  // SVG admite scripts: es el vector XSS clasico. Magic bytes no cuadran.
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>');
  assert.equal(detectarMime(svg), null);
  const v = validarSubida(svg, svg.length);
  assert.equal(v.ok, false);
});

test('rechaza ejecutable disfrazado de PNG (magic bytes falsos)', () => {
  const exe = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00]);
  assert.equal(detectarMime(exe), null);
  const v = validarSubida(exe, exe.length);
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.motivo, /Solo se aceptan/);
});

test('rechaza imagen por encima del tope de 8 MB', () => {
  const jpeg = jpegMinimo();
  const v = validarSubida(jpeg, MAX_BYTES_IMAGEN + 1);
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.motivo, /pasa de 8 MB/);
});

test('acepta JPEG dentro del tope', () => {
  const jpeg = jpegMinimo();
  const v = validarSubida(jpeg, jpeg.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'image/jpeg');
});

test('rechaza path traversal en nombres de archivo locales', () => {
  assert.equal(nombreArchivoLocalValido('../etc/passwd'), false);
  assert.equal(nombreArchivoLocalValido('aaaaaaaabbbbbbbbcccccccc.jpg/../x'), false);
  assert.equal(nombreArchivoLocalValido('not-a-hash.jpg'), false);
  assert.equal(nombreArchivoLocalValido('abcdef0123456789abcdef01.svg'), false);
  assert.equal(nombreArchivoLocalValido('abcdef0123456789abcdef01.jpg'), true);
});

test('rechaza buffer demasiado corto para magic bytes', () => {
  const corto = Buffer.from([0xff, 0xd8, 0xff]);
  assert.equal(detectarMime(corto), null);
  const v = validarSubida(corto, corto.length);
  assert.equal(v.ok, false);
});

test('rechaza video por encima del tope de 60 MB', () => {
  // ftyp + isom → video/mp4; el tope se aplica aunque el buffer sea pequeño.
  const mp4Cabecera = Buffer.alloc(32, 0);
  mp4Cabecera.write('ftyp', 4, 'ascii');
  mp4Cabecera.write('isom', 8, 'ascii');
  assert.equal(detectarMime(mp4Cabecera), 'video/mp4');
  const v = validarSubida(mp4Cabecera, MAX_BYTES_VIDEO + 1);
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.motivo, /pasa de 60 MB/);
});

test('acepta MP4 con magic bytes ftyp', () => {
  const mp4Cabecera = Buffer.alloc(32, 0);
  mp4Cabecera.write('ftyp', 4, 'ascii');
  mp4Cabecera.write('isom', 8, 'ascii');
  const v = validarSubida(mp4Cabecera, mp4Cabecera.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'video/mp4');
});

test('acepta PNG con magic bytes reales', () => {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  assert.equal(detectarMime(png), 'image/png');
  const v = validarSubida(png, png.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'image/png');
});

test('acepta GIF87a y GIF89a', () => {
  const gif87 = Buffer.from('GIF87a........', 'ascii');
  const gif89 = Buffer.from('GIF89a........', 'ascii');
  assert.equal(detectarMime(gif87), 'image/gif');
  assert.equal(detectarMime(gif89), 'image/gif');
  const v = validarSubida(gif89, gif89.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'image/gif');
});

test('acepta WEBP con cabecera RIFF....WEBP', () => {
  const webp = Buffer.alloc(12, 0);
  webp.write('RIFF', 0, 'ascii');
  webp.write('WEBP', 8, 'ascii');
  assert.equal(detectarMime(webp), 'image/webp');
  const v = validarSubida(webp, webp.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'image/webp');
});

test('acepta WEBM por cabecera EBML', () => {
  const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
  assert.equal(detectarMime(webm), 'video/webm');
  const v = validarSubida(webm, webm.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'video/webm');
});

test('acepta QuickTime MOV (ftyp qt)', () => {
  const mov = Buffer.alloc(32, 0);
  mov.write('ftyp', 4, 'ascii');
  mov.write('qt  ', 8, 'ascii');
  assert.equal(detectarMime(mov), 'video/quicktime');
  const v = validarSubida(mov, mov.length);
  assert.equal(v.ok, true);
  if (v.ok) assert.equal(v.mime, 'video/quicktime');
});

test('nombres locales aceptan extensiones gif webp webm mov', () => {
  assert.equal(nombreArchivoLocalValido('abcdef0123456789abcdef01.gif'), true);
  assert.equal(nombreArchivoLocalValido('abcdef0123456789abcdef01.webp'), true);
  assert.equal(nombreArchivoLocalValido('abcdef0123456789abcdef01.webm'), true);
  assert.equal(nombreArchivoLocalValido('abcdef0123456789abcdef01.mov'), true);
});

test('rechaza imagen WEBP por encima del tope de 8 MB', () => {
  const webp = Buffer.alloc(12, 0);
  webp.write('RIFF', 0, 'ascii');
  webp.write('WEBP', 8, 'ascii');
  const v = validarSubida(webp, MAX_BYTES_IMAGEN + 1);
  assert.equal(v.ok, false);
  if (!v.ok) assert.match(v.motivo, /pasa de 8 MB/);
});

test('la cuota diaria corta por numero de archivos y por peso', () => {
  assert.equal(excedeCuota({ archivos: 0, bytes: 0 }, 1024), false);
  assert.equal(excedeCuota({ archivos: CUOTA_DIARIA.archivos - 1, bytes: 0 }, 1024), false);
  assert.equal(excedeCuota({ archivos: CUOTA_DIARIA.archivos, bytes: 0 }, 1024), true);
  assert.equal(excedeCuota({ archivos: 1, bytes: CUOTA_DIARIA.bytes - 10 }, 11), true);
});
