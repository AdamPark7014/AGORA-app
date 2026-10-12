import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NotificacionesService } from './notificaciones.service.js';
import type { NotificacionesStreamService } from './notificaciones-stream.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { PushService } from '../push/push.service.js';

const push = { enviar: async () => {} } as unknown as PushService;
const stream = { emitir: () => {} } as unknown as NotificacionesStreamService;

const aviso = {
  userId: 'destino',
  actorId: 'actor',
  tipo: 'MENCION' as const,
  texto: 'Ana te mencionó',
  url: '/publicacion/p1',
};

test('crear no rechaza aunque la base falle: se llama sin await y tumbaria la API', async () => {
  const prisma = {
    block: {
      findFirst: async () => {
        throw new Error('la base no contesto');
      },
    },
  } as unknown as PrismaService;

  await new NotificacionesService(prisma, push, stream).crear(aviso);
});

test('no se avisa de alguien a quien el destinatario bloqueo o silencio', async () => {
  let creadas = 0;
  let filtro: unknown;
  const prisma = {
    block: {
      findFirst: async (args: { where: unknown }) => {
        filtro = args.where;
        return { id: 'b1' };
      },
    },
    notificacion: {
      create: async () => {
        creadas += 1;
      },
    },
  } as unknown as PrismaService;

  await new NotificacionesService(prisma, push, stream).crear(aviso);

  assert.equal(creadas, 0);
  // El silencio del destinatario cuenta (sin condicion de soloSilencio) y el
  // del actor no.
  assert.deepEqual(filtro, {
    OR: [
      { bloqueadorId: 'destino', bloqueadoId: 'actor' },
      { bloqueadorId: 'actor', bloqueadoId: 'destino', soloSilencio: false },
    ],
  });
});

test('sin bloqueo el aviso se crea', async () => {
  let creadas = 0;
  const prisma = {
    block: { findFirst: async () => null },
    preferenciaNotificacion: { findUnique: async () => null },
    notificacion: {
      create: async () => {
        creadas += 1;
      },
      count: async () => 1,
    },
  } as unknown as PrismaService;

  await new NotificacionesService(prisma, push, stream).crear(aviso);
  assert.equal(creadas, 1);
});
