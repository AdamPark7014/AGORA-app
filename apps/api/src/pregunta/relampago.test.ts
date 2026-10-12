import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VENTANA_MS, diaCampus, esATiempo, horaSorpresa } from './relampago.js';

test('el dia cambia a medianoche del campus, no a la de UTC', () => {
  // 20:00 en Puebla del 12 de octubre ya es 13 de octubre en UTC.
  assert.equal(diaCampus(new Date('2026-10-13T02:00:00Z')).toISOString(), '2026-10-12T00:00:00.000Z');
  assert.equal(diaCampus(new Date('2026-10-13T06:30:00Z')).toISOString(), '2026-10-13T00:00:00.000Z');
});

test('la hora sorpresa cae entre las 10:00 y las 20:00 del campus y es estable', () => {
  for (let d = 1; d <= 60; d += 1) {
    const fecha = new Date(Date.UTC(2026, 9, d));
    const hora = horaSorpresa(fecha, 'secreto');
    assert.equal(hora.getTime(), horaSorpresa(fecha, 'secreto').getTime());
    // Mexico es UTC-6: 10:00 local = 16:00 UTC, 20:00 local = 02:00 UTC del dia siguiente.
    const desde = fecha.getTime() + 16 * 3_600_000;
    assert.ok(hora.getTime() >= desde && hora.getTime() < desde + 10 * 3_600_000, hora.toISOString());
    assert.equal(diaCampus(hora).getTime(), fecha.getTime());
  }
});

test('otro secreto da otra hora: no se adivina leyendo el codigo', () => {
  const fecha = new Date(Date.UTC(2026, 9, 12));
  const horas = new Set(['a', 'b', 'c', 'd'].map((s) => horaSorpresa(fecha, s).getTime()));
  assert.ok(horas.size > 1);
});

test('a tiempo solo dentro de la ventana despues de caer', () => {
  const abre = new Date('2026-10-12T18:00:00Z');
  assert.equal(esATiempo(abre, new Date(abre.getTime() - 1)), false);
  assert.equal(esATiempo(abre, abre), true);
  assert.equal(esATiempo(abre, new Date(abre.getTime() + VENTANA_MS)), true);
  assert.equal(esATiempo(abre, new Date(abre.getTime() + VENTANA_MS + 1)), false);
  assert.equal(esATiempo(null, abre), false);
});
