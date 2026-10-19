import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Prisma } from '@agora/db';

import { PostsService } from './posts.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Doble toque: las dos peticiones leen "sin reaccion" (o "con la misma") antes
 * de que la otra escriba. Simulado con un findUnique que siempre devuelve lo
 * que se leyo al principio.
 */
const servicio = (leido: { id: string; tipo: string } | null) => {
  let filas = leido ? 1 : 0;
  let contador = filas;
  let avisos = 0;
  const tx = {
    reaction: {
      deleteMany: async () => {
        const count = filas;
        filas = 0;
        return { count };
      },
    },
    post: {
      update: async ({ data }: { data: { numReactions: { decrement?: number; increment?: number } } }) => {
        contador += data.numReactions.increment ?? 0;
        contador -= data.numReactions.decrement ?? 0;
        return {};
      },
    },
  };
  const prisma = {
    post: {
      findUnique: async () => ({
        id: 'p1',
        authorId: 'autor',
        communityId: 'c1',
        estado: 'PUBLICADO',
        anonimo: false,
      }),
      // Como en Prisma, lo que va en un $transaction([...]) no corre hasta el commit.
      update: (args: Parameters<typeof tx.post.update>[0]) => ({ correr: () => tx.post.update(args) }),
    },
    block: { findFirst: async () => null },
    reaction: {
      findUnique: async () => leido,
      create: () => ({
        correr: async () => {
          if (filas > 0) {
            throw new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' });
          }
          filas = 1;
          return {};
        },
      }),
    },
    profile: { findUnique: async () => ({ nombre: 'Ana' }) },
    $transaction: async (arg: unknown) => {
      if (typeof arg === 'function') return (arg as (t: typeof tx) => Promise<unknown>)(tx);
      // Secuencial: si la primera operacion truena, la segunda no corre.
      const ops = arg as { correr: () => Promise<unknown> }[];
      const res = [];
      for (const op of ops) res.push(await op.correr());
      return res;
    },
  } as unknown as PrismaService;
  const notificaciones = {
    crear: async () => {
      avisos += 1;
    },
  };
  return {
    s: new PostsService(prisma, notificaciones as never, {} as never, {} as never, {} as never),
    contador: () => contador,
    avisos: () => avisos,
  };
};

test('doble toque al reaccionar: una sola reaccion, un aviso, sin error', async () => {
  const { s, contador, avisos } = servicio(null);
  const [a, b] = await Promise.all([
    s.reaccionar('p1', 'yo', { tipo: 'ME_LATE' }),
    s.reaccionar('p1', 'yo', { tipo: 'ME_LATE' }),
  ]);
  assert.deepEqual(a, { miReaccion: 'ME_LATE' });
  assert.deepEqual(b, { miReaccion: 'ME_LATE' });
  assert.equal(contador(), 1);
  assert.equal(avisos(), 1);
});

test('doble toque al quitar: el contador baja una sola vez', async () => {
  const { s, contador } = servicio({ id: 'r1', tipo: 'ME_LATE' });
  await Promise.all([
    s.reaccionar('p1', 'yo', { tipo: 'ME_LATE' }),
    s.reaccionar('p1', 'yo', { tipo: 'ME_LATE' }),
  ]);
  assert.equal(contador(), 0);
});
