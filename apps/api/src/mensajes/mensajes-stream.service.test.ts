import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MensajesStreamService } from './mensajes-stream.service.js';

test('el canal de chat se libera cuando se va el ultimo suscriptor', () => {
  const servicio = new MensajesStreamService();
  assert.equal(servicio.conectados, 0);

  const sub = servicio.canal('c1').subscribe();
  assert.equal(servicio.conectados, 1);

  sub.unsubscribe();
  assert.equal(servicio.conectados, 0);
});

test('dos dispositivos en el mismo chat comparten canal hasta la ultima pestaña', () => {
  const servicio = new MensajesStreamService();
  const a = servicio.canal('c1').subscribe();
  const b = servicio.canal('c1').subscribe();
  assert.equal(servicio.conectados, 1);

  a.unsubscribe();
  assert.equal(servicio.conectados, 1);

  b.unsubscribe();
  assert.equal(servicio.conectados, 0);
});

test('emitir a un chat sin oyentes no abre canal fantasma', () => {
  const servicio = new MensajesStreamService();
  servicio.emitir('fantasma', {
    tipo: 'mensaje',
    mensaje: {
      id: 'm1',
      texto: 'hola',
      createdAt: new Date(),
      autorId: 'u1',
      autor: null,
    },
  });
  assert.equal(servicio.conectados, 0);
});

test('el mensaje llega solo a su conversacion', () => {
  const servicio = new MensajesStreamService();
  const enA: unknown[] = [];
  const enB: unknown[] = [];
  const a = servicio.canal('c1').subscribe((e) => enA.push(e));
  const b = servicio.canal('c2').subscribe((e) => enB.push(e));

  const payload = {
    tipo: 'mensaje' as const,
    mensaje: {
      id: 'm1',
      texto: 'hola',
      createdAt: new Date('2026-08-27T12:00:00Z'),
      autorId: 'u1',
      autor: { handle: 'ana', nombre: 'Ana X', fotoUrl: null },
    },
  };
  servicio.emitir('c1', payload);

  assert.equal(enA.length, 1);
  assert.deepEqual((enA[0] as { data: typeof payload }).data.mensaje?.id, 'm1');
  assert.deepEqual(enB, []);

  a.unsubscribe();
  b.unsubscribe();
});

test('onModuleDestroy cierra todos los chats y deja conectados en 0', () => {
  const servicio = new MensajesStreamService();
  const a = servicio.canal('c1').subscribe();
  const b = servicio.canal('c2').subscribe();
  assert.equal(servicio.conectados, 2);

  servicio.onModuleDestroy();
  assert.equal(servicio.conectados, 0);

  servicio.emitir('c1', { tipo: 'ping' });
  assert.equal(servicio.conectados, 0);

  a.unsubscribe();
  b.unsubscribe();
});
