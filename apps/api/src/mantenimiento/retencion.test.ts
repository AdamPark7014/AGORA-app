import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RETENCION, limite } from './retencion.js';

const DIA = 24 * 60 * 60 * 1000;

test('la fecha limite se calcula hacia atras desde ahora', () => {
  const ahora = new Date('2026-08-23T04:00:00.000Z');
  assert.equal(limite(7 * DIA, ahora).toISOString(), '2026-08-16T04:00:00.000Z');
});

test('los codigos OTP se guardan mas que su vida util, pero poco', () => {
  // Viven 10 minutos. Guardarlos un dia permite mirar un "no me llego" del
  // mismo dia; guardarlos meses solo engorda una tabla que se lee en cada
  // inicio de sesion.
  assert.ok(RETENCION.otpMs > 10 * 60 * 1000);
  assert.ok(RETENCION.otpMs <= 2 * DIA);
});

test('las sesiones se conservan un margen despues de caducar, no antes', () => {
  // Borrar una sesion aun vigente seria echar a alguien de la app.
  assert.ok(RETENCION.sesionCaducadaMs > 0);
  assert.ok(RETENCION.sesionCaducadaMs <= 30 * DIA);
});

test('los avisos leidos aguantan un semestre entero', () => {
  // Menos de eso y alguien pierde el historial del semestre en curso.
  assert.ok(RETENCION.notificacionLeidaMs >= 90 * DIA);
});
