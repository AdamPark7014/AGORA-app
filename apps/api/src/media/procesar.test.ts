import assert from 'node:assert/strict';
import { test } from 'node:test';

import sharp from 'sharp';

import { ImagenInvalida, LADO_MAX, LADO_MINIATURA, procesarImagen } from './procesar.js';

const fotoConGps = (ancho: number, alto: number) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: '#e85d04' } })
    .withExif({ IFD0: { Make: 'Telefono', Model: 'X' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '19/1 3/1 0/1' } })
    .jpeg()
    .toBuffer();

test('una foto de telefono pierde el EXIF (y con el, la ubicacion GPS)', async () => {
  const original = await fotoConGps(800, 600);
  assert.ok((await sharp(original).metadata()).exif, 'la prueba necesita una foto con EXIF');

  const procesada = await procesarImagen(original, 'image/jpeg');

  const meta = await sharp(procesada.datos).metadata();
  assert.equal(meta.exif, undefined);
  assert.equal(procesada.mime, 'image/jpeg');
  assert.equal(procesada.ancho, 800);
  assert.equal(procesada.alto, 600);
});

test('una imagen enorme se reduce y trae miniatura', async () => {
  const procesada = await procesarImagen(await fotoConGps(4000, 3000), 'image/jpeg');

  assert.equal(procesada.ancho, LADO_MAX);
  assert.equal(procesada.alto, 1536);
  assert.ok(procesada.miniatura);
  const mini = await sharp(procesada.miniatura).metadata();
  assert.equal(mini.width, LADO_MINIATURA);
  assert.equal(mini.format, 'webp');
});

test('una imagen pequena no genera miniatura aparte', async () => {
  const procesada = await procesarImagen(await fotoConGps(300, 200), 'image/jpeg');
  assert.equal(procesada.miniatura, null);
});

test('un PNG sigue siendo PNG', async () => {
  const png = await sharp({ create: { width: 50, height: 50, channels: 4, background: '#0000' } })
    .png()
    .toBuffer();
  const procesada = await procesarImagen(png, 'image/png');
  assert.equal(procesada.mime, 'image/png');
});

test('un archivo con cabecera de JPEG pero cuerpo roto se rechaza', async () => {
  const roto = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 7)]);
  await assert.rejects(procesarImagen(roto, 'image/jpeg'), ImagenInvalida);
});

test('un GIF animado conserva sus cuadros y pierde los comentarios', async () => {
  const cuadros = await Promise.all(
    ['#e85d04', '#154734', '#ffffff'].map((c) =>
      sharp({ create: { width: 40, height: 30, channels: 3, background: c } }).png().toBuffer(),
    ),
  );
  const gif = await sharp(cuadros, { join: { animated: true } }).gif().toBuffer();
  const conComentario = Buffer.concat([gif.subarray(0, gif.length - 1), Buffer.from([0x21, 0xfe, 0x05]), Buffer.from('hola!'), Buffer.from([0x00, 0x3b])]);

  const procesada = await procesarImagen(conComentario, 'image/gif');

  assert.equal(procesada.mime, 'image/gif');
  assert.equal((await sharp(procesada.datos).metadata()).pages, 3);
  assert.equal(procesada.alto, 30);
  assert.equal(procesada.datos.includes(Buffer.from('hola!')), false);
});

test('un WEBP animado sigue animado', async () => {
  const cuadros = await Promise.all(
    ['#e85d04', '#154734'].map((c) =>
      sharp({ create: { width: 40, height: 30, channels: 3, background: c } }).png().toBuffer(),
    ),
  );
  const webp = await sharp(cuadros, { join: { animated: true } }).webp().toBuffer();

  const procesada = await procesarImagen(webp, 'image/webp');

  assert.equal((await sharp(procesada.datos).metadata()).pages, 2);
  assert.equal(procesada.alto, 30);
});
