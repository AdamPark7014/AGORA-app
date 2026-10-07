import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EntregaService } from './entrega.service.js';

const MENSAJE = '<202610071638.15572647097@smtp-relay.mailin.fr>';

/** fetch falso global: registra llamadas y responde con lo que se le de. */
function conFetch(responder: (url: string, init?: RequestInit) => { status: number; body?: unknown }) {
  const original = globalThis.fetch;
  const llamadas: Array<{ url: string; method: string }> = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    llamadas.push({ url, method: init?.method ?? 'GET' });
    const r = responder(url, init);
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
    };
  }) as unknown as typeof fetch;
  return { llamadas, restaurar: () => (globalThis.fetch = original) };
}

test('un codigo recien enviado se reporta como enviado', async () => {
  const entrega = new EntregaService();
  const id = entrega.registrar(MENSAJE, 'adam@udlap.mx', 'brevo');
  assert.deepEqual(await entrega.consultar(id), { estado: 'enviado' });
});

test('el webhook avanza el estado aunque mande el Message-ID sin <>', async () => {
  const entrega = new EntregaService();
  const id = entrega.registrar(MENSAJE, 'adam@udlap.mx', 'brevo');
  await entrega.aplicarEvento(MENSAJE.slice(1, -1), 'delivered', null);
  assert.deepEqual(await entrega.consultar(id), { estado: 'entregado' });
});

test('un rebote duro se reporta como rebotado', async () => {
  const entrega = new EntregaService();
  const id = entrega.registrar(MENSAJE, 'adam.delpozos@udlap.mx', 'brevo');
  await entrega.aplicarEvento(MENSAJE, 'hard_bounce', '550 5.4.1 Recipient address rejected');
  assert.deepEqual(await entrega.consultar(id), { estado: 'rebotado' });
});

test('eventos de otros correos de la cuenta se ignoran', async () => {
  const entrega = new EntregaService();
  const id = entrega.registrar(MENSAJE, 'adam@udlap.mx', 'brevo');
  await entrega.aplicarEvento('<otro@smtp-relay.mailin.fr>', 'hard_bounce', null);
  assert.deepEqual(await entrega.consultar(id), { estado: 'enviado' });
});

test('un id desconocido no existe', async () => {
  assert.equal(await new EntregaService().consultar('no-existe'), null);
});

test('si el webhook calla, se le pregunta a Brevo', async () => {
  const { llamadas, restaurar } = conFetch(() => ({
    status: 200,
    body: { events: [{ event: 'delivered' }, { event: 'requests' }] },
  }));
  try {
    const entrega = new EntregaService();
    const inicio = Date.now();
    const id = entrega.registrar(MENSAJE, 'adam@udlap.mx', 'brevo', inicio);
    assert.deepEqual(await entrega.consultar(id, inicio + 9_000), { estado: 'entregado' });
    assert.equal(llamadas.length, 1);
    assert.ok(llamadas[0]!.url.includes('/smtp/statistics/events'));
  } finally {
    restaurar();
  }
});

test('una direccion bloqueada por un rebote viejo se libera para el siguiente intento', async () => {
  const { llamadas, restaurar } = conFetch(() => ({ status: 204 }));
  try {
    const entrega = new EntregaService();
    const id = entrega.registrar(MENSAJE, 'adam@udlap.mx', 'brevo');
    await entrega.aplicarEvento(MENSAJE, 'blocked', null);
    await entrega.aplicarEvento(MENSAJE, 'blocked', null);
    assert.deepEqual(await entrega.consultar(id), { estado: 'bloqueado' });
    const desbloqueos = llamadas.filter((l) => l.method === 'DELETE');
    assert.equal(desbloqueos.length, 1, 'una sola vez por envio');
    assert.ok(desbloqueos[0]!.url.endsWith(encodeURIComponent('adam@udlap.mx')));
  } finally {
    restaurar();
  }
});
