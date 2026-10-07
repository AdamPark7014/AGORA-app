import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  combinarEstado,
  desbloquearBrevo,
  estadoDeEvento,
  eventosBrevo,
  normalizarEvento,
} from './entrega.js';

test('webhook y API de estadisticas nombran igual el mismo evento', () => {
  assert.equal(normalizarEvento('hard_bounce'), normalizarEvento('hardBounces'));
  assert.equal(normalizarEvento('requests'), 'request');
  assert.equal(normalizarEvento('invalid_email'), 'invalidemail');
});

test('cada evento de entrega cae en su estado', () => {
  assert.equal(estadoDeEvento('request'), 'enviado');
  assert.equal(estadoDeEvento('delivered'), 'entregado');
  assert.equal(estadoDeEvento('hardBounces'), 'rebotado');
  assert.equal(estadoDeEvento('hard_bounce'), 'rebotado');
  assert.equal(estadoDeEvento('soft_bounce'), 'demorado');
  assert.equal(estadoDeEvento('deferred'), 'demorado');
  assert.equal(estadoDeEvento('blocked'), 'bloqueado');
  assert.equal(estadoDeEvento('invalid_email'), 'rebotado');
});

test('aperturas y clics no dicen nada de la entrega: el escaner de Microsoft abre todo', () => {
  assert.equal(estadoDeEvento('opened'), null);
  assert.equal(estadoDeEvento('loadedByProxy'), null);
  assert.equal(estadoDeEvento('click'), null);
});

test('el estado solo avanza: un request tardio no borra una entrega', () => {
  assert.equal(combinarEstado('entregado', 'enviado'), 'entregado');
  assert.equal(combinarEstado('demorado', 'entregado'), 'entregado');
  assert.equal(combinarEstado('enviado', 'demorado'), 'demorado');
});

test('un rebote despues de la entrega si manda', () => {
  assert.equal(combinarEstado('entregado', 'rebotado'), 'rebotado');
});

test('eventosBrevo lee evento y motivo del mensaje pedido', async () => {
  let pedida = '';
  const fetchFalso = (async (url: string) => {
    pedida = url;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        events: [
          { event: 'hardBounces', reason: '550 5.4.1 Recipient address rejected' },
          { event: 'requests' },
        ],
      }),
    };
  }) as unknown as typeof fetch;

  const eventos = await eventosBrevo('llave', '<abc@smtp-relay.mailin.fr>', fetchFalso);
  assert.ok(pedida.includes(encodeURIComponent('<abc@smtp-relay.mailin.fr>')));
  assert.deepEqual(eventos, [
    { evento: 'hardBounces', motivo: '550 5.4.1 Recipient address rejected' },
    { evento: 'requests', motivo: null },
  ]);
});

test('eventosBrevo sin eventos indexados devuelve lista vacia', async () => {
  const fetchFalso = (async () => ({ ok: true, status: 200, json: async () => ({}) })) as unknown as typeof fetch;
  assert.deepEqual(await eventosBrevo('llave', '<x@y>', fetchFalso), []);
});

test('desbloquearBrevo distingue bloqueada (204) de no bloqueada (404)', async () => {
  const con = (status: number) =>
    (async () => ({ ok: status < 300, status })) as unknown as typeof fetch;
  assert.equal(await desbloquearBrevo('llave', 'a@udlap.mx', con(204)), true);
  assert.equal(await desbloquearBrevo('llave', 'a@udlap.mx', con(404)), false);
  await assert.rejects(() => desbloquearBrevo('llave', 'a@udlap.mx', con(401)));
});
