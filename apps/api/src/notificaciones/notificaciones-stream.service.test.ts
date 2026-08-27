import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NotificacionesStreamService } from './notificaciones-stream.service.js';

/**
 * El canal de avisos guarda estado en memoria de un proceso que vive meses.
 * Todo lo que se comprueba aqui es contabilidad de ese estado — nada de red ni
 * de base de datos — y es justo lo que las pruebas e2e no pueden ver.
 */

test('el canal se libera cuando se va el ultimo suscriptor', () => {
  const servicio = new NotificacionesStreamService();
  assert.equal(servicio.conectados, 0);

  const sub = servicio.canal('u1').subscribe();
  assert.equal(servicio.conectados, 1, 'suscribirse deberia abrir el canal');

  sub.unsubscribe();
  assert.equal(servicio.conectados, 0, 'el canal deberia soltarse al desconectar');
});

test('varias conexiones de la misma persona comparten canal y aguantan hasta la ultima', () => {
  const servicio = new NotificacionesStreamService();

  // Navegador y telefono a la vez: dos conexiones, una sola entrada.
  const a = servicio.canal('u1').subscribe();
  const b = servicio.canal('u1').subscribe();
  assert.equal(servicio.conectados, 1);

  a.unsubscribe();
  assert.equal(servicio.conectados, 1, 'cerrar una pestaña no debe matar el canal de la otra');

  b.unsubscribe();
  assert.equal(servicio.conectados, 0);
});

test('mil personas que entran y salen no dejan nada detras', () => {
  // Esta es la prueba que habria cazado la fuga: antes el mapa se quedaba con
  // las mil entradas para siempre.
  const servicio = new NotificacionesStreamService();

  for (let i = 0; i < 1000; i += 1) {
    servicio.canal(`u${i}`).subscribe().unsubscribe();
  }

  assert.equal(servicio.conectados, 0);
});

test('el evento llega solo a su destinatario', () => {
  const servicio = new NotificacionesStreamService();
  const recibidoA: unknown[] = [];
  const recibidoB: unknown[] = [];

  const a = servicio.canal('u1').subscribe((e) => recibidoA.push(e));
  const b = servicio.canal('u2').subscribe((e) => recibidoB.push(e));

  servicio.emitir('u1', { tipo: 'actualizacion', total: 3 });

  assert.deepEqual(recibidoA, [{ data: { tipo: 'actualizacion', total: 3 } }]);
  assert.deepEqual(recibidoB, [], 'u2 no tiene por que enterarse de los avisos de u1');

  a.unsubscribe();
  b.unsubscribe();
});

test('emitir a quien no esta conectado no revienta ni abre canal', () => {
  const servicio = new NotificacionesStreamService();
  servicio.emitir('fantasma', { tipo: 'actualizacion', total: 1 });
  assert.equal(servicio.conectados, 0);
});

test('las dos conexiones de la misma persona reciben el mismo evento', () => {
  const servicio = new NotificacionesStreamService();
  const enA: unknown[] = [];
  const enB: unknown[] = [];

  const a = servicio.canal('u1').subscribe((e) => enA.push(e));
  const b = servicio.canal('u1').subscribe((e) => enB.push(e));

  servicio.emitir('u1', { tipo: 'actualizacion', total: 7 });

  assert.equal(enA.length, 1);
  assert.equal(enB.length, 1, 'el globo debe bajar en el telefono y en el navegador a la vez');

  a.unsubscribe();
  b.unsubscribe();
});
