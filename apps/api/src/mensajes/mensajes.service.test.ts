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
