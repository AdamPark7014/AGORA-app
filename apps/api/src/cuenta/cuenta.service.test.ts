import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CuentaService } from './cuenta.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Prisma de mentira que anota cada operacion como "modelo.metodo" con sus
 * argumentos. `$transaction` recibe esas mismas promesas ya creadas.
 */
function prismaFalso(usuario: unknown) {
  const llamadas: Array<[string, unknown]> = [];
  const modelo = (nombre: string) =>
    new Proxy(
      {},
      {
        get: (_t, metodo: string) => (args: unknown) => {
          llamadas.push([`${nombre}.${metodo}`, args]);
          return Promise.resolve({});
        },
      },
    );
  const prisma = new Proxy(
    {
      user: {
        findUnique: async () => usuario,
        update: (args: unknown) => {
          llamadas.push(['user.update', args]);
          return Promise.resolve({});
        },
      },
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    } as Record<string, unknown>,
    { get: (t, k: string) => (k in t ? t[k] : modelo(k)) },
  ) as unknown as PrismaService;
  return { prisma, llamadas };
}

const ACTIVO = {
  id: 'u1',
  email: 'ana.lopez@udlap.mx',
  estado: 'ACTIVO',
  profile: { handle: 'ana' },
};

test('eliminar exige escribir el handle', async () => {
  const { prisma, llamadas } = prismaFalso(ACTIVO);
  await assert.rejects(
    () => new CuentaService(prisma).eliminar('u1', 'otra-cosa'),
    (err: unknown) => err instanceof BadRequestException,
  );
  assert.equal(llamadas.length, 0, 'no debe tocar nada si la confirmacion no coincide');
});

test('eliminar una cuenta ya dada de baja es 404', async () => {
  const { prisma } = prismaFalso({ ...ACTIVO, estado: 'BAJA' });
  await assert.rejects(
    () => new CuentaService(prisma).eliminar('u1', 'ana'),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('eliminar anonimiza: borra perfil y sesiones, oculta contenido y libera el correo', async () => {
  const { prisma, llamadas } = prismaFalso(ACTIVO);
  await new CuentaService(prisma).eliminar('u1', '@Ana');

  const ops = llamadas.map(([op]) => op);
  for (const esperado of [
    'profile.deleteMany',
    'session.deleteMany',
    'pushSubscription.deleteMany',
    'membership.deleteMany',
    'asientoAventon.deleteMany',
    'post.updateMany',
    'comment.updateMany',
    'message.updateMany',
    'auditLog.create',
  ]) {
    assert.ok(ops.includes(esperado), `falta ${esperado}`);
  }

  const update = llamadas.find(([op]) => op === 'user.update')?.[1] as {
    data: { estado: string; email: string };
  };
  assert.equal(update.data.estado, 'BAJA');
  assert.ok(!update.data.email.includes('ana.lopez'), 'el correo real no se conserva');

  const audit = JSON.stringify(llamadas.find(([op]) => op === 'auditLog.create')?.[1]);
  assert.ok(!audit.includes('ana.lopez'), 'el audit log solo guarda el hash del correo');
});

test('una cuenta sin perfil se confirma con ELIMINAR', async () => {
  const { prisma, llamadas } = prismaFalso({ ...ACTIVO, profile: null });
  await new CuentaService(prisma).eliminar('u1', 'eliminar');
  assert.ok(llamadas.some(([op]) => op === 'user.update'));
});
