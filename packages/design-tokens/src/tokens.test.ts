import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { contraste } from './contraste.js';
import { archivos, kebab } from './generar.js';
import { leerAndroid, leerIos, leerWeb } from './revisar.js';
import { colores, paresContraste, type Hex } from './tokens.js';

test('cada par de texto y fondo pasa AA (4.5:1) en claro y en oscuro', () => {
  for (const [texto, fondo] of paresContraste) {
    for (const modo of ['claro', 'oscuro'] as const) {
      const t: Hex = texto === '#FFFFFF' ? texto : colores[texto][modo];
      const razon = contraste(t, colores[fondo][modo]);
      assert.ok(razon >= 4.5, `${texto} sobre ${fondo} (${modo}): ${razon.toFixed(2)}:1`);
    }
  }
});

test('contraste conocido: negro sobre blanco es 21:1', () => {
  assert.equal(Math.round(contraste('#000000', '#FFFFFF')), 21);
});

test('los archivos de generado/ están al día con tokens.ts', () => {
  const carpeta = join(resolve(__dirname, '..'), 'generado');
  for (const [nombre, generar] of Object.entries(archivos)) {
    assert.equal(readFileSync(join(carpeta, nombre), 'utf8'), generar(), `regenera ${nombre}`);
  }
});

test('kebab-case para CSS', () => {
  assert.equal(kebab('superficie2'), 'superficie-2');
  assert.equal(kebab('naranjaSuave'), 'naranja-suave');
});

test('lectores de cada plataforma', () => {
  assert.deepEqual(leerAndroid('val Fondo get() = par(0xFFF6F0E7, 0xFF14100D)', 'Fondo'), {
    claro: '#F6F0E7',
    oscuro: '#14100D',
  });
  assert.deepEqual(leerAndroid('val Jade get() = Color(0xFF0F766E)', 'Jade'), { claro: '#0F766E', oscuro: '#0F766E' });
  assert.deepEqual(leerIos('static let fondo = dinamico(claro: (246, 240, 231), oscuro: (20, 16, 13))', 'fondo'), {
    claro: '#F6F0E7',
    oscuro: '#14100D',
  });
  const css = ":root {\n  --fondo: #f4f2ef;\n}\n:root[data-theme='dark'] {\n  --fondo: #0f0d0b;\n}\n";
  assert.deepEqual(leerWeb(css, 'fondo'), { claro: '#F4F2EF', oscuro: '#0F0D0B' });
});
