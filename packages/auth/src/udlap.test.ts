import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PLAZO_UDLAP_MS,
  RESULTADO_BUZON,
  diasParaConfirmarUdlap,
  interpretarIfExists,
  udlapVencida,
  vencimientoUdlap,
} from './udlap.js';

const DESDE = new Date('2026-10-22T12:00:00Z');

test('sin pendiente no hay vencimiento ni plazo', () => {
  assert.equal(vencimientoUdlap(null), null);
  assert.equal(udlapVencida(null, DESDE), false);
  assert.equal(diasParaConfirmarUdlap(null, DESDE), null);
});

test('el plazo es de 30 días y vence justo al cumplirse', () => {
  const vence = vencimientoUdlap(DESDE)!;
  assert.equal(vence.getTime() - DESDE.getTime(), PLAZO_UDLAP_MS);
  assert.equal(udlapVencida(DESDE, new Date(vence.getTime() - 1)), false);
  assert.equal(udlapVencida(DESDE, vence), true);
});

test('los días que quedan se redondean hacia arriba y no bajan de cero', () => {
  assert.equal(diasParaConfirmarUdlap(DESDE, DESDE), 30);
  assert.equal(diasParaConfirmarUdlap(DESDE, new Date(DESDE.getTime() + 60_000)), 30);
  assert.equal(diasParaConfirmarUdlap(DESDE, new Date(DESDE.getTime() + PLAZO_UDLAP_MS + 1)), 0);
});

test('lo que dice Microsoft del buzón', () => {
  assert.equal(interpretarIfExists(0, 0), RESULTADO_BUZON.EXISTE);
  assert.equal(interpretarIfExists(5, 0), RESULTADO_BUZON.EXISTE);
  assert.equal(interpretarIfExists(6, 0), RESULTADO_BUZON.EXISTE);
  assert.equal(interpretarIfExists(1, 0), RESULTADO_BUZON.NO_EXISTE);
  assert.equal(interpretarIfExists(0, 1), RESULTADO_BUZON.DESCONOCIDO, 'estrangulado no cuenta');
  assert.equal(interpretarIfExists(undefined, undefined), RESULTADO_BUZON.DESCONOCIDO);
  assert.equal(interpretarIfExists('0', 0), RESULTADO_BUZON.DESCONOCIDO);
});
