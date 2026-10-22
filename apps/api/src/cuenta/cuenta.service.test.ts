import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { CuentaService } from './cuenta.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/**
 * Prisma de mentira que anota cada operacion como "modelo.metodo" con sus
 * argumentos. `$transaction` recibe esas mismas promesas ya creadas.
 */
function prismaFalso(
  usuario: unknown,
  datos: {
    media?: Array<{ id: string; url: string; thumbUrl: string | null }>;
    perfil?: { fotoUrl: string | null; portadaUrl: string | null };
  } = {},
) {
  const llamadas: Array<[string, unknown]> = [];
  const modelo = (nombre: string) =>
    new Proxy(
      {},
      {
        get: (_t, metodo: string) => (args: unknown) => {
          llamadas.push([`${nombre}.${metodo}`, args]);
          if (nombre === 'media' && metodo === 'findMany') return Promise.resolve(datos.media ?? []);
          if (nombre === 'profile' && metodo === 'findUnique') return Promise.resolve(datos.perfil ?? null);
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
      $executeRaw: (sql: TemplateStringsArray, ...valores: unknown[]) => {
        llamadas.push(['$executeRaw', { sql: sql.join('?'), valores }]);
        return Promise.resolve(0);
      },
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    } as Record<string, unknown>,
    { get: (t, k: string) => (k in t ? t[k] : modelo(k)) },
  ) as unknown as PrismaService;
  return { prisma, llamadas };
}

/** Almacen de mentira: anota lo que se borra; una URL con "falla" revienta. */
const almacenFalso = () => {
  const borradas: string[] = [];
  return {
    borradas,
    borrar: async (url: string) => {
      if (url.includes('falla')) throw new Error('MinIO caido');
      borradas.push(url);
    },
  };
};

const conAlmacen = (servicio: CuentaService, almacen: ReturnType<typeof almacenFalso>) => {
  (servicio as unknown as { almacen: unknown }).almacen = almacen;
  return servicio;
};

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
  await conAlmacen(new CuentaService(prisma), almacenFalso()).eliminar('u1', '@Ana');

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

  const descuento = ops.indexOf('$executeRaw');
  assert.ok(descuento >= 0 && descuento < ops.indexOf('comment.updateMany'), 'descuenta numComments antes de ocultar');
  const raw = llamadas[descuento]![1] as { sql: string; valores: unknown[] };
  assert.match(raw.sql, /"numComments"/);
  assert.deepEqual(raw.valores, ['u1']);

  const update = llamadas.find(([op]) => op === 'user.update')?.[1] as {
    data: { estado: string; email: string; passwordHash: null; correoPersonal: null };
  };
  assert.equal(update.data.estado, 'BAJA');
  assert.ok(!update.data.email.includes('ana.lopez'), 'el correo real no se conserva');
  assert.equal(update.data.passwordHash, null, 'el hash de la contraseña no se conserva');
  assert.equal(update.data.correoPersonal, null, 'el correo personal no se conserva');

  const audit = JSON.stringify(llamadas.find(([op]) => op === 'auditLog.create')?.[1]);
  assert.ok(!audit.includes('ana.lopez'), 'el audit log solo guarda el hash del correo');
});

test('una cuenta sin perfil se confirma con ELIMINAR', async () => {
  const { prisma, llamadas } = prismaFalso({ ...ACTIVO, profile: null });
  await conAlmacen(new CuentaService(prisma), almacenFalso()).eliminar('u1', 'eliminar');
  assert.ok(llamadas.some(([op]) => op === 'user.update'));
});

test('la baja borra sus fotos y videos del almacen publico, y la foto de perfil', async () => {
  const { prisma, llamadas } = prismaFalso(ACTIVO, {
    media: [
      { id: 'm1', url: '/m/foto.jpg', thumbUrl: '/m/foto-t.webp' },
      { id: 'm2', url: '/m/falla.mp4', thumbUrl: null },
    ],
    perfil: { fotoUrl: '/m/avatar-viejo.jpg', portadaUrl: null },
  });
  const almacen = almacenFalso();

  await conAlmacen(new CuentaService(prisma), almacen).eliminar('u1', 'ana');

  assert.deepEqual(almacen.borradas, ['/m/foto.jpg', '/m/foto-t.webp', '/m/avatar-viejo.jpg']);
  // Solo la fila cuyo archivo si se borro; la otra queda para reintentar.
  const filas = llamadas.find(([op]) => op === 'media.deleteMany')?.[1] as {
    where: { id: { in: string[] } };
  };
  assert.deepEqual(filas.where.id.in, ['m1']);

  // Lo que esta bajo un reporte abierto se conserva como evidencia.
  const consulta = JSON.stringify(llamadas.find(([op]) => op === 'media.findMany')?.[1]);
  assert.match(consulta, /ABIERTO/);
});
