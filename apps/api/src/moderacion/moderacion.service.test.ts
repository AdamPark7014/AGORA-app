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

function prismaComentario(estado: string) {
  const llamadas: [string, unknown][] = [];
  const registrar = (op: string) => (args: unknown) => {
    llamadas.push([op, args]);
    return Promise.resolve({});
  };
  const prisma = {
    report: {
      findUnique: async () => ({
        id: 'r1',
        estado: 'ABIERTO',
        postId: null,
        commentId: 'c1',
        post: null,
        comment: { id: 'c1', authorId: 'autor', postId: 'p1', estado },
      }),
      updateMany: registrar('report.updateMany'),
    },
    comment: { update: registrar('comment.update') },
    post: { update: registrar('post.update'), updateMany: registrar('post.updateMany') },
    moderationAction: { create: registrar('moderationAction.create') },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return { prisma, llamadas };
}

test('retirar un comentario visible descuenta numComments', async () => {
  const { prisma, llamadas } = prismaComentario('PUBLICADO');
  await servicio(prisma).resolver('r1', 'mod', { accion: 'RETIRAR_CONTENIDO', motivo: 'x' }, ['moderador']);
  const contador = llamadas.find(([op]) => op === 'post.updateMany');
  assert.deepEqual(contador?.[1], {
    where: { id: 'p1', numComments: { gt: 0 } },
    data: { numComments: { decrement: 1 } },
  });
});

test('restaurar un comentario retirado vuelve a contarlo', async () => {
  const { prisma, llamadas } = prismaComentario('RETIRADO');
  await servicio(prisma).resolver('r1', 'mod', { accion: 'RESTAURAR_CONTENIDO', motivo: 'x' }, ['moderador']);
  const contador = llamadas.find(([op]) => op === 'post.update');
  assert.deepEqual(contador?.[1], {
    where: { id: 'p1' },
    data: { numComments: { increment: 1 } },
  });
});

test('retirar un comentario ya oculto no toca el contador', async () => {
  const { prisma, llamadas } = prismaComentario('RETIRADO');
  await servicio(prisma).resolver('r1', 'mod', { accion: 'RETIRAR_CONTENIDO', motivo: 'x' }, ['moderador']);
  assert.ok(llamadas.some(([op]) => op === 'comment.update'));
  assert.ok(!llamadas.some(([op]) => op.startsWith('post.')));
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
      updateMany: (args: unknown) => {
        llamadas.push(['user.updateMany', args]);
        return Promise.resolve({ count: 1 });
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

test('un moderador no puede levantar la suspension que puso un admin', async () => {
  const { prisma } = prismaComentario('RETIRADO');
  await assert.rejects(
    () =>
      servicio(prisma).resolver('r1', 'mod', { accion: 'LEVANTAR_SUSPENSION', motivo: 'x' }, ['moderador']),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('levantar una suspension solo reactiva cuentas suspendidas, nunca una dada de baja', async () => {
  const { prisma, llamadas } = prismaComentario('RETIRADO');
  const usuarios: unknown[] = [];
  (prisma as unknown as { user: unknown }).user = {
    updateMany: (args: unknown) => {
      usuarios.push(args);
      return Promise.resolve({ count: 0 });
    },
  };
  await servicio(prisma).resolver('r1', 'adm', { accion: 'LEVANTAR_SUSPENSION', motivo: 'x' }, ['admin']);
  assert.deepEqual(usuarios, [{ where: { id: 'autor', estado: 'SUSPENDIDO' }, data: { estado: 'ACTIVO' } }]);
  assert.ok(llamadas.some(([op]) => op === 'moderationAction.create'));
});

test('restaurar no revive un comentario que su autor borro', async () => {
  const { prisma, llamadas } = prismaComentario('BORRADO_POR_AUTOR');
  await servicio(prisma).resolver('r1', 'mod', { accion: 'RESTAURAR_CONTENIDO', motivo: 'x' }, ['moderador']);
  assert.ok(!llamadas.some(([op]) => op === 'comment.update'));
  assert.ok(!llamadas.some(([op]) => op.startsWith('post.')));
});
