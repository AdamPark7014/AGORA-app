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

/**
 * Pasar `undefined` cae en el valor por defecto, que es `process.env.REDIS_URL`.
 * Donde hay un Redis de verdad (CI, un servidor) la prueba se conectaba y la
 * conexion abierta dejaba colgado al runner para siempre.
 */
async function sinRedisUrl<T>(fn: () => Promise<T>): Promise<T> {
  const previo = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  try {
    return await fn();
  } finally {
    if (previo !== undefined) process.env.REDIS_URL = previo;
  }
}

test('sin REDIS_URL el almacen es undefined (memoria)', async () => {
  const storage = await sinRedisUrl(() => crearAlmacenLimite(undefined));
  assert.equal(storage, undefined);
});

test('REDIS_URL inalcanzable degrada a memoria sin lanzar', async () => {
  // Puerto cerrado en localhost: no tumba el arranque.
  const storage = await crearAlmacenLimite('redis://127.0.0.1:1');
  assert.equal(storage, undefined);
});

test('opcionesLimite siempre trae las ventanas globales', async () => {
  const opts = await sinRedisUrl(() => opcionesLimite(undefined));
  assert.ok(Array.isArray(opts.throttlers));
  assert.equal(opts.throttlers?.length, 2);
  assert.equal(opts.storage, undefined);
});
