import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { ModeracionService } from './moderacion.service.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const notificacionesMock = { crear: async () => {} } as unknown as NotificacionesService;

function servicio(prisma: PrismaService) {
  return new ModeracionService(prisma, notificacionesMock);
}

test('reportar rechaza auto-denuncia de publicacion propia', async () => {
  const prisma = {
    post: {
      findUnique: async () => ({ id: 'p1', authorId: 'yo' }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).reportar('yo', { postId: 'p1', motivo: 'ACOSO_DIRIGIDO' }),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('reportar rechaza auto-denuncia de comentario propio', async () => {
  const prisma = {
    comment: {
      findUnique: async () => ({ id: 'c1', authorId: 'yo' }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      servicio(prisma).reportar('yo', {
        commentId: 'c1',
        motivo: 'ACOSO_DIRIGIDO',
      }),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('reportar duplicado devuelve yaExistia sin crear otro', async () => {
  let creates = 0;
  const prisma = {
    post: {
      findUnique: async () => ({ id: 'p1', authorId: 'otro' }),
    },
    report: {
      findFirst: async () => ({ id: 'r-viejo' }),
      create: async () => {
        creates += 1;
        return { id: 'r-nuevo' };
      },
    },
  } as unknown as PrismaService;

  const r = await servicio(prisma).reportar('yo', {
    postId: 'p1',
    motivo: 'OTRO',
  });
  assert.deepEqual(r, { id: 'r-viejo', yaExistia: true });
  assert.equal(creates, 0);
});

test('resolver falla si el reporte ya esta cerrado', async () => {
  const prisma = {
    report: {
      findUnique: async () => ({
        id: 'r1',
        estado: 'RESUELTO_SIN_ACCION',
        postId: 'p1',
        commentId: null,
        post: { id: 'p1', authorId: 'autor' },
        comment: null,
      }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      servicio(prisma).resolver('r1', 'mod', { accion: 'SIN_ACCION', motivo: 'ok' }, ['moderador']),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('un moderador no puede suspender cuentas desde un reporte', async () => {
  const prisma = {
    report: {
      findUnique: async () => {
        throw new Error('no debe ni consultar el reporte');
      },
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      servicio(prisma).resolver(
        'r1',
        'mod',
        { accion: 'SUSPENDER_USUARIO', motivo: 'acoso' },
        ['moderador'],
      ),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('retirarPost rechaza contenido ya retirado', async () => {
  const prisma = {
    post: {
      findUnique: async () => ({
        id: 'p1',
        estado: 'RETIRADO',
        authorId: 'autor',
      }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).retirarPost('p1', 'mod', 'amenaza'),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('decidirMarcado solo aplica a EN_REVISION', async () => {
  const prisma = {
    post: {
      findUnique: async () => ({ id: 'p1', estado: 'PUBLICADO' }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () =>
      servicio(prisma).decidirMarcado('p1', 'mod', 'RETIRAR_CONTENIDO', 'linea roja'),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('reportar post inexistente es 404', async () => {
  const prisma = {
    post: { findUnique: async () => null },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).reportar('yo', { postId: 'p-x', motivo: 'OTRO' }),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('SUSPENDER_USUARIO revoca sesiones del autor', async () => {
  const llamadas: unknown[] = [];
  const prisma = {
    report: {
      findUnique: async () => ({
        id: 'r1',
        estado: 'ABIERTO',
        postId: 'p1',
        commentId: null,
        post: { id: 'p1', authorId: 'autor' },
        comment: null,
      }),
      updateMany: (args: unknown) => {
        llamadas.push(['report.updateMany', args]);
        return Promise.resolve({ count: 1 });
      },
    },
    user: {
      update: (args: unknown) => {
        llamadas.push(['user.update', args]);
        return Promise.resolve({});
      },
    },
    session: {
      deleteMany: (args: unknown) => {
        llamadas.push(['session.deleteMany', args]);
        return Promise.resolve({ count: 2 });
      },
    },
    post: {
      update: (args: unknown) => {
        llamadas.push(['post.update', args]);
        return Promise.resolve({});
      },
    },
    moderationAction: {
      create: (args: unknown) => {
        llamadas.push(['moderationAction.create', args]);
        return Promise.resolve({});
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;

  await servicio(prisma).resolver(
    'r1',
    'mod',
    { accion: 'SUSPENDER_USUARIO', motivo: 'acoso' },
    ['admin'],
  );

  assert.ok(
    llamadas.some((entrada) => {
      const [op, args] = entrada as [string, { where: { userId: string } }];
      return op === 'session.deleteMany' && args.where.userId === 'autor';
    }),
    'debe borrar sesiones del suspendido',
  );
});
