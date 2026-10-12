import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NotFoundException } from '@nestjs/common';

import { PostsService } from './posts.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** Servicio con una publicacion y, si se pide, un bloqueo entre YO y su autor. */
const servicio = (post: { estado: string; anonimo?: boolean }, bloqueo: boolean) => {
  let reacciones = 0;
  const prisma = {
    post: {
      findUnique: async () => ({
        id: 'p1',
        authorId: 'autor',
        communityId: 'c1',
        estado: post.estado,
        anonimo: post.anonimo ?? false,
      }),
      update: async () => ({}),
    },
    block: { findFirst: async () => (bloqueo ? { id: 'b1' } : null) },
    reaction: {
      findUnique: async () => null,
      create: async () => {
        reacciones += 1;
      },
    },
    profile: { findUnique: async () => ({ nombre: 'Ana' }) },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  const notificaciones = { crear: async () => {} };
  return {
    s: new PostsService(prisma, notificaciones as never, {} as never, {} as never, {} as never),
    reacciones: () => reacciones,
  };
};

const es404 = (err: unknown) => err instanceof NotFoundException;

test('no se puede reaccionar a la publicacion de quien te bloqueo', async () => {
  const { s, reacciones } = servicio({ estado: 'PUBLICADO' }, true);
  await assert.rejects(() => s.reaccionar('p1', 'yo', { tipo: 'ME_LATE' }), es404);
  assert.equal(reacciones(), 0);
});

test('no se puede votar en una encuesta retirada', async () => {
  const { s } = servicio({ estado: 'RETIRADO' }, false);
  await assert.rejects(() => s.votar('p1', 'yo', 'o1'), es404);
});

test('en una anonima el bloqueo no se nota: un 404 delataria al autor', async () => {
  const { s, reacciones } = servicio({ estado: 'PUBLICADO', anonimo: true }, true);
  await s.reaccionar('p1', 'yo', { tipo: 'ME_LATE' });
  assert.equal(reacciones(), 1);
});
