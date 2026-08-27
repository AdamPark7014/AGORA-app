import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  esEventoEnVivo,
  mapearEventoEnVivo,
  whereEventosEnVivo,
} from './eventos-en-vivo.js';

const ahora = new Date('2026-08-24T18:00:00.000Z');

test('esEventoEnVivo: en curso sin fin', () => {
  const evento = {
    inicioAt: new Date('2026-08-24T17:00:00.000Z'),
    finAt: null,
  };
  assert.equal(esEventoEnVivo(evento, ahora, 4), true);
});

test('esEventoEnVivo: en curso con fin futuro', () => {
  const evento = {
    inicioAt: new Date('2026-08-24T17:30:00.000Z'),
    finAt: new Date('2026-08-24T20:00:00.000Z'),
  };
  assert.equal(esEventoEnVivo(evento, ahora, 4), true);
});

test('esEventoEnVivo: ya terminó', () => {
  const evento = {
    inicioAt: new Date('2026-08-24T14:00:00.000Z'),
    finAt: new Date('2026-08-24T17:30:00.000Z'),
  };
  assert.equal(esEventoEnVivo(evento, ahora, 4), false);
});

test('esEventoEnVivo: empieza dentro de la ventana', () => {
  const evento = {
    inicioAt: new Date('2026-08-24T20:00:00.000Z'),
    finAt: null,
  };
  assert.equal(esEventoEnVivo(evento, ahora, 4), true);
});

test('esEventoEnVivo: empieza fuera de la ventana', () => {
  const evento = {
    inicioAt: new Date('2026-08-25T02:00:00.000Z'),
    finAt: null,
  };
  assert.equal(esEventoEnVivo(evento, ahora, 4), false);
});

test('mapearEventoEnVivo: en curso tiene empiezaEnMinutos 0', () => {
  const mapeado = mapearEventoEnVivo(
    {
      id: 'e1',
      titulo: 'Fiesta',
      inicioAt: new Date('2026-08-24T17:00:00.000Z'),
      finAt: new Date('2026-08-24T22:00:00.000Z'),
      lugar: 'Plaza',
      vanAIr: 12,
    },
    ahora,
  );
  assert.equal(mapeado.enCurso, true);
  assert.equal(mapeado.empiezaEnMinutos, 0);
  assert.equal(mapeado.vanAIr, 12);
});

test('mapearEventoEnVivo: próximo calcula minutos restantes', () => {
  const inicio = new Date('2026-08-24T19:30:00.000Z');
  const mapeado = mapearEventoEnVivo(
    {
      id: 'e2',
      titulo: 'Torneo',
      inicioAt: inicio,
      finAt: null,
      lugar: 'Cancha',
      vanAIr: 5,
    },
    ahora,
  );
  assert.equal(mapeado.enCurso, false);
  assert.equal(mapeado.empiezaEnMinutos, 90);
});

test('whereEventosEnVivo incluye universityId y estados visibles', () => {
  const where = whereEventosEnVivo('uni-1', ahora, 4);
  assert.equal(where.universityId, 'uni-1');
  assert.deepEqual(where.estado, { in: ['PUBLICADO', 'EN_REVISION'] });
  assert.ok(Array.isArray(where.OR));
  assert.equal(where.OR!.length, 2);
});
