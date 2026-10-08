import assert from 'node:assert/strict';
import { test } from 'node:test';

import { limpiarMetadatosVideo } from './metadatos-video.js';

/** Caja ISO-BMFF `[tamano][tipo][contenido]`. */
const caja = (tipo: string, ...contenido: Buffer[]): Buffer => {
  const cuerpo = Buffer.concat(contenido);
  const cabecera = Buffer.alloc(8);
  cabecera.writeUInt32BE(8 + cuerpo.length, 0);
  cabecera.write(tipo, 4, 'latin1');
  return Buffer.concat([cabecera, cuerpo]);
};

const GPS = Buffer.from('+19.0544-098.2832/', 'latin1');

/** Un MP4 minimo con la ubicacion donde la ponen Android (udta/©xyz) y el iPhone (meta). */
const videoConGps = (): Buffer =>
  Buffer.concat([
    caja('ftyp', Buffer.from('isom\0\0\0\0isommp41', 'latin1')),
    caja(
      'moov',
      caja('mvhd', Buffer.alloc(20, 1)),
      caja('trak', caja('tkhd', Buffer.alloc(12, 2)), caja('udta', caja('©xyz', GPS))),
      caja('udta', caja('©xyz', GPS)),
      caja('meta', Buffer.alloc(4), caja('keys', Buffer.from('com.apple.quicktime.location.ISO6709')), GPS),
    ),
    caja('mdat', Buffer.alloc(64, 7)),
  ]);

test('el video pierde la ubicacion de Android y del iPhone', () => {
  const original = videoConGps();
  assert.ok(original.includes(GPS), 'la prueba necesita un video con GPS');

  const { datos, limpias } = limpiarMetadatosVideo(original);

  assert.equal(datos.includes(GPS), false);
  assert.equal(datos.includes(Buffer.from('com.apple.quicktime.location')), false);
  assert.equal(limpias, 3);
});

test('el archivo mide lo mismo y los datos del video no se tocan', () => {
  const original = videoConGps();
  const { datos } = limpiarMetadatosVideo(original);

  assert.equal(datos.length, original.length);
  // mdat (los fotogramas) y mvhd quedan identicos: los offsets siguen validos.
  assert.ok(datos.includes(caja('mdat', Buffer.alloc(64, 7))));
  assert.ok(datos.includes(caja('mvhd', Buffer.alloc(20, 1))));
  assert.ok(datos.includes(Buffer.from('free', 'latin1')));
});

test('no modifica el buffer original', () => {
  const original = videoConGps();
  const copia = Buffer.from(original);
  limpiarMetadatosVideo(original);
  assert.deepEqual(original, copia);
});

test('un archivo con tamanos imposibles se devuelve intacto, sin reventar', () => {
  const roto = Buffer.concat([caja('ftyp', Buffer.from('isom')), Buffer.from([0xff, 0xff, 0xff, 0xff, 0x6d, 0x6f, 0x6f, 0x76])]);
  const { datos, limpias } = limpiarMetadatosVideo(roto);
  assert.equal(limpias, 0);
  assert.deepEqual(datos, roto);
});
