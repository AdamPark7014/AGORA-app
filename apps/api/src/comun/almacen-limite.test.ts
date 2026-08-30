import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LIMITE_OTP_SOLICITAR,
  LIMITE_OTP_VERIFICAR,
  crearAlmacenLimite,
  opcionesLimite,
} from './almacen-limite.js';

test('OTP solicitar es mas estricto que el techo historico 60/min', () => {
  assert.equal(LIMITE_OTP_SOLICITAR.corto.limit, 20);
  assert.equal(LIMITE_OTP_SOLICITAR.largo.limit, 200);
  assert.ok(LIMITE_OTP_SOLICITAR.corto.limit < 60);
});

test('OTP verificar deja holgura de reintentos pero bajo el global', () => {
  assert.equal(LIMITE_OTP_VERIFICAR.corto.limit, 30);
  assert.equal(LIMITE_OTP_VERIFICAR.largo.limit, 300);
});

test('sin REDIS_URL el almacen es undefined (memoria)', async () => {
  const storage = await crearAlmacenLimite(undefined);
  assert.equal(storage, undefined);
});

test('REDIS_URL inalcanzable degrada a memoria sin lanzar', async () => {
  // Puerto cerrado en localhost: no tumba el arranque.
  const storage = await crearAlmacenLimite('redis://127.0.0.1:1');
  assert.equal(storage, undefined);
});

test('opcionesLimite siempre trae las ventanas globales', async () => {
  const opts = await opcionesLimite(undefined);
  assert.ok(Array.isArray(opts.throttlers));
  assert.equal(opts.throttlers?.length, 2);
  assert.equal(opts.storage, undefined);
});
