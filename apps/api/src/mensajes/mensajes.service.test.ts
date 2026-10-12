import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { MensajesService } from './mensajes.service.js';
import type { MensajesStreamService } from './mensajes-stream.service.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const notificacionesMock = { crear: async () => {} } as unknown as NotificacionesService;
const streamMock = { emitir: () => {} } as unknown as MensajesStreamService;

function servicio(prisma: PrismaService) {
  return new MensajesService(prisma, notificacionesMock, streamMock);
}

test('abrirCon rechaza escribirse a uno mismo', async () => {
  const prisma = {
    profile: {
      findUnique: async () => ({
        userId: 'yo',
        user: { estado: 'ACTIVO' },
      }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).abrirCon('yo', 'mi-handle'),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('abrirCon no encuentra perfil inexistente', async () => {
  const prisma = {
    profile: { findUnique: async () => null },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).abrirCon('yo', 'nadie'),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('abrirCon corta si hay bloqueo en cualquier sentido', async () => {
  const prisma = {
    profile: {
      findUnique: async () => ({
        userId: 'otro',
        user: { estado: 'ACTIVO' },
      }),
    },
    block: {
      findFirst: async () => ({ id: 'b1' }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).abrirCon('yo', 'otro-handle'),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('abrirCon reusa conversacion existente por clave', async () => {
  const prisma = {
    profile: {
      findUnique: async () => ({
        userId: 'otro',
        user: { estado: 'ACTIVO' },
      }),
    },
    block: { findFirst: async () => null },
    conversation: {
      findUnique: async () => ({ id: 'conv-existente' }),
      create: async () => {
        throw new Error('no debe crear si ya existe');
      },
    },
  } as unknown as PrismaService;

  const r = await servicio(prisma).abrirCon('yo', 'otro-handle');
  assert.equal(r.id, 'conv-existente');
});

test('exigirParticipante oculta conversaciones ajenas o abandonadas', async () => {
  const prisma = {
    conversationParticipant: {
      findUnique: async () => null,
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).exigirParticipante('c1', 'yo'),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('noLeidos sin participaciones es cero', async () => {
  const prisma = {
    conversationParticipant: {
      findMany: async () => [],
    },
  } as unknown as PrismaService;

  const r = await servicio(prisma).noLeidos('yo');
  assert.deepEqual(r, { total: 0 });
});

test('enviar corta si te bloquearon despues de abrir la conversacion', async () => {
  let creados = 0;
  const prisma = {
    conversationParticipant: {
      findUnique: async () => ({ conversationId: 'c1', userId: 'yo', salioAt: null }),
      findMany: async () => [{ userId: 'otro' }],
    },
    block: { findFirst: async () => ({ id: 'b1' }) },
    message: {
      create: async () => {
        creados += 1;
      },
    },
    $transaction: async () => {
      creados += 1;
      return [];
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).enviar('c1', 'yo', { texto: 'hola' }),
    (err: unknown) => err instanceof ForbiddenException,
  );
  assert.equal(creados, 0);
});

test('la bandeja no muestra mensajes retirados ni los cuenta como no leidos', async () => {
  let filtroUltimo: unknown;
  let filtroNoLeidos: { estado?: unknown } | undefined;
  const prisma = {
    conversationParticipant: {
      findMany: async (args: {
        include: { conversation: { include: { mensajes: { where: unknown } } } };
      }) => {
        filtroUltimo = args.include.conversation.include.mensajes.where;
        return [];
      },
    },
    message: {
      groupBy: async (args: { where: { estado?: unknown } }) => {
        filtroNoLeidos = args.where;
        return [];
      },
    },
  } as unknown as PrismaService;

  await servicio(prisma).bandeja('yo');
  const visibles = { estado: { in: ['PUBLICADO', 'EN_REVISION'] } };
  assert.deepEqual(filtroUltimo, visibles);
  assert.deepEqual(filtroNoLeidos?.estado, visibles.estado);
});

test('leer la conversacion solo marca leido si hay algo nuevo', async () => {
  const ultimo = new Date('2026-10-12T12:00:00Z');
  let filtroLeido: unknown;
  const prisma = {
    conversationParticipant: {
      findUnique: async () => ({ id: 'p1', salioAt: null }),
      findMany: async () => [],
      updateMany: async ({ where }: { where: unknown }) => {
        filtroLeido = where;
        return { count: 0 };
      },
    },
    message: {
      findMany: async () => [
        { id: 'm1', texto: 'hola', createdAt: ultimo, autorId: 'otro', autor: { profile: null } },
      ],
    },
  } as unknown as PrismaService;

  await servicio(prisma).mensajes('c1', 'yo', { limite: 30 } as never);

  assert.deepEqual(filtroLeido, {
    conversationId: 'c1',
    userId: 'yo',
    OR: [{ leidoAt: null }, { leidoAt: { lt: ultimo } }],
  });
});
