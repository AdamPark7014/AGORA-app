import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aPersonaResumen, elegirAsistentes, type FilaAsistente } from './personas.js';

const perfil = (handle: string) => ({ handle, nombre: handle.toUpperCase(), apellidos: 'Pérez', fotoUrl: null });
const fila = (eventoId: string, userId: string, conPerfil = true): FilaAsistente => ({
  eventoId,
  userId,
  user: { profile: conPerfil ? perfil(userId) : null },
});

test('primero la gente que sigues, luego por orden de llegada', () => {
  const filas = [fila('e1', 'a'), fila('e1', 'b'), fila('e1', 'c'), fila('e1', 'd')];
  const elegidos = elegirAsistentes(filas, new Set(['c']), new Set(), 'yo');
  assert.deepEqual(elegidos.get('e1')!.map((p) => p.handle), ['c', 'a', 'b', 'd']);
});

test('fuera bloqueados, yo mismo y cuentas sin perfil; tope por evento', () => {
  const filas = [
    fila('e1', 'yo'),
    fila('e1', 'malo'),
    fila('e1', 'sinperfil', false),
    ...['p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((u) => fila('e1', u)),
    fila('e2', 'p1'),
  ];
  const elegidos = elegirAsistentes(filas, new Set(), new Set(['malo']), 'yo', 5);
  assert.deepEqual(elegidos.get('e1')!.map((p) => p.handle), ['p1', 'p2', 'p3', 'p4', 'p5']);
  assert.deepEqual(elegidos.get('e2')!.map((p) => p.handle), ['p1']);
});

test('el resumen nunca lleva correo ni id', () => {
  const r = aPersonaResumen({ handle: 'diego.tr', nombre: 'Diego', apellidos: 'Terán', fotoUrl: 'x.jpg' });
  assert.deepEqual(r, { handle: 'diego.tr', nombre: 'Diego Terán', fotoUrl: 'x.jpg' });
});
