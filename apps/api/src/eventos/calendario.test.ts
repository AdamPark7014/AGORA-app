import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DURACION_POR_OMISION_MS, escaparIcs, icsDeEvento, plegarLinea } from './calendario.js';

const evento = {
  id: 'ev1',
  titulo: 'Noche de juegos',
  descripcion: 'Trae tu juego favorito; hay pizza, refrescos y premios.',
  lugar: 'Cafetería Central, edificio 3',
  inicioAt: new Date('2026-10-24T01:00:00.000Z'), // 19:00 en el campus
  finAt: new Date('2026-10-24T03:30:00.000Z'),
};

test('arma un VEVENT con horas en UTC, lugar, enlace y alarma una hora antes', () => {
  const ics = icsDeEvento(evento, new Date('2026-10-22T18:00:00.000Z'));
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.match(ics, /\r\nDTSTART:20261024T010000Z\r\n/);
  assert.match(ics, /\r\nDTEND:20261024T033000Z\r\n/);
  assert.match(ics, /\r\nDTSTAMP:20261022T180000Z\r\n/);
  assert.match(ics, /\r\nUID:ev1@udlagora\.com\r\n/);
  assert.match(ics, /\r\nLOCATION:Cafetería Central\\, edificio 3\r\n/);
  assert.match(ics, /\r\nURL:https:\/\/udlagora\.com\/eventos\/ev1\r\n/);
  assert.match(ics, /\r\nTRIGGER:-PT1H\r\n/);
  // Nada de saltos sueltos: todo es CRLF.
  assert.equal(ics.replace(/\r\n/g, '').includes('\n'), false);
});

test('sin hora de fin dura dos horas', () => {
  const ics = icsDeEvento({ ...evento, finAt: null });
  const fin = new Date(evento.inicioAt.getTime() + DURACION_POR_OMISION_MS);
  assert.match(ics, new RegExp(`DTEND:${fin.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`));
});

test('escapa barras, punto y coma, comas y saltos de línea', () => {
  assert.equal(escaparIcs('a\\b;c,d\ne'), 'a\\\\b\\;c\\,d\\ne');
});

test('pliega las líneas largas a 75 octetos sin partir acentos', () => {
  const linea = `DESCRIPTION:${'á'.repeat(100)}`;
  const plegada = plegarLinea(linea);
  for (const trozo of plegada.split('\r\n')) {
    assert.ok(Buffer.byteLength(trozo, 'utf8') <= 75, trozo);
  }
  assert.equal(plegada.split('\r\n').map((t, i) => (i === 0 ? t : t.slice(1))).join(''), linea);
});
