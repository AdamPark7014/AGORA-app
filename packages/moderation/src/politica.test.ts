import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { DECISIONES, LINEAS_ROJAS, decidir } from './politica.js';
import { moderarTexto } from './cliente.js';

/**
 * La prueba mas importante del producto.
 *
 * Si la critica legitima se bloquea, Agora esta roto: se afina el umbral, no
 * el discurso. Estos casos son el contrato con el usuario.
 */

test('el contenido limpio se publica sin mas', () => {
  assert.equal(decidir({}).decision, DECISIONES.PUBLICAR);
  assert.equal(decidir({ harassment: 0.1, violence: 0.05 }).decision, DECISIONES.PUBLICAR);
});

test('la critica dura a un profesor se publica — aunque marque harassment', () => {
  // "el profesor de calculo es un inutil y su clase es una perdida de tiempo"
  // dispara harassment en cualquier clasificador. Es exactamente el discurso
  // que este producto existe para permitir.
  const veredicto = decidir({ harassment: 0.55, hate: 0.2 });
  assert.equal(veredicto.decision, DECISIONES.PUBLICAR);
});

test('groserias y humor negro no pasan de revision humana, nunca se retiran', () => {
  const veredicto = decidir({ harassment: 0.72, hate: 0.65 });
  assert.equal(veredicto.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
  assert.notEqual(veredicto.decision, DECISIONES.RETIRAR);
});

test('la queja contra la administracion se publica', () => {
  const veredicto = decidir({ harassment: 0.4, violence: 0.1 });
  assert.equal(veredicto.decision, DECISIONES.PUBLICAR);
});

// --- Lineas rojas: los unicos cinco casos de retirada automatica.

test('el contenido intimo sexual con menores se retira de inmediato', () => {
  const veredicto = decidir({ 'sexual/minors': 0.95 });
  assert.equal(veredicto.decision, DECISIONES.RETIRAR);
  assert.equal(veredicto.lineaRoja, LINEAS_ROJAS.INTIMIDAD_SEXUAL);
  assert.match(veredicto.motivo ?? '', /Ley Olimpia/);
});

test('la amenaza de violencia se retira', () => {
  for (const categoria of ['harassment/threatening', 'hate/threatening', 'violence/graphic']) {
    const veredicto = decidir({ [categoria]: 0.9 });
    assert.equal(veredicto.decision, DECISIONES.RETIRAR, `deberia retirar: ${categoria}`);
    assert.equal(veredicto.lineaRoja, LINEAS_ROJAS.AMENAZA_VIOLENCIA);
  }
});

test('toda retirada trae motivo visible para el autor', () => {
  const veredicto = decidir({ 'sexual/minors': 0.99 });
  assert.ok(veredicto.motivo && veredicto.motivo.length > 0, 'sin motivo no hay apelacion posible');
});

test('justo por debajo del umbral de linea roja se encola, no se retira', () => {
  const veredicto = decidir({ 'harassment/threatening': 0.84 });
  assert.equal(veredicto.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
});

// --- Degradacion: un proveedor caido no puede convertirse en censura.

test('si la API falla, el contenido se publica y se encola', async () => {
  const fetchQueFalla = (async () => {
    throw new Error('red caida');
  }) as unknown as typeof fetch;

  const veredicto = await moderarTexto('lo que sea', {
    apiKey: 'no-usada',
    fetchImpl: fetchQueFalla,
  });
  assert.equal(veredicto.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
});

test('si la API responde con error HTTP, tampoco se bloquea al usuario', async () => {
  const fetch500 = (async () =>
    new Response('boom', { status: 500 })) as unknown as typeof fetch;

  const veredicto = await moderarTexto('lo que sea', {
    apiKey: 'no-usada',
    fetchImpl: fetch500,
  });
  assert.equal(veredicto.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
});

test('una respuesta valida se traduce al veredicto de la politica', async () => {
  const fetchOk = (async () =>
    new Response(
      JSON.stringify({ results: [{ category_scores: { 'sexual/minors': 0.97 } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    )) as unknown as typeof fetch;

  const veredicto = await moderarTexto('contenido de prueba', {
    apiKey: 'no-usada',
    fetchImpl: fetchOk,
  });
  assert.equal(veredicto.decision, DECISIONES.RETIRAR);
  assert.equal(veredicto.lineaRoja, LINEAS_ROJAS.INTIMIDAD_SEXUAL);
});
