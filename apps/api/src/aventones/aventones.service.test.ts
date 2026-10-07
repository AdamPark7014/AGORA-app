import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AventonesService } from './aventones.service.js';
import type { GamificacionService } from '../gamificacion/gamificacion.service.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const notificacionesMock = { crear: async () => {} } as unknown as NotificacionesService;
const gamificacionMock = {
  evaluarBadges: async () => [],
} as unknown as GamificacionService;

function servicio(prisma: PrismaService) {
  return new AventonesService(prisma, notificacionesMock, gamificacionMock);
}

test('crear rechaza salidas demasiado en el pasado', async () => {
  const prisma = {
    user: { findUnique: async () => ({ universityId: 'uni-1' }) },
  } as unknown as PrismaService;

  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
  await assert.rejects(
    () =>
      servicio(prisma).crear('u1', {
        sentido: 'A_CAMPUS',
        origen: 'Angelopolis',
        destino: 'UDLAP',
        salidaAt: haceUnaHora,
        lugares: 3,
        cuotaMxn: 40,
      }),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('apartar no deja al conductor sentarse en su propio aventon', async () => {
  const prisma = {
    aventon: {
      findUnique: async () => ({
        id: 'av1',
        estado: 'PUBLICADO',
        conductorId: 'yo',
        salidaAt: new Date(Date.now() + 3_600_000),
        lugares: 3,
        asientos: [],
      }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).apartar('av1', 'yo'),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('apartar falla si ya no hay lugares', async () => {
  const prisma = {
    aventon: {
      findUnique: async () => ({
        id: 'av1',
        estado: 'PUBLICADO',
        conductorId: 'cond',
        salidaAt: new Date(Date.now() + 3_600_000),
        lugares: 1,
        asientos: [{ id: 's1', userId: 'otro' }],
      }),
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).apartar('av1', 'yo'),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('apartar es interruptor: si ya voy, libera el asiento', async () => {
  let borrado = false;
  const prisma = {
    aventon: {
      findUnique: async () => ({
        id: 'av1',
        estado: 'PUBLICADO',
        conductorId: 'cond',
        salidaAt: new Date(Date.now() + 3_600_000),
        lugares: 3,
        asientos: [
          { id: 's1', userId: 'yo' },
          { id: 's2', userId: 'otro' },
        ],
      }),
    },
    asientoAventon: {
      delete: async () => {
        borrado = true;
      },
    },
  } as unknown as PrismaService;

  const r = await servicio(prisma).apartar('av1', 'yo');
  assert.equal(borrado, true);
  assert.deepEqual(r, { voyYo: false, ocupados: 1 });
});

test('apartar vuelve a contar bajo candado: si otro tomo el ultimo lugar, falla', async () => {
  const consultas: string[] = [];
  const tx = {
    $queryRaw: async (partes: TemplateStringsArray) => {
      consultas.push(partes.join('?'));
      return [];
    },
    // Entre la lectura sin candado y el candado, otra persona aparto.
    asientoAventon: {
      count: async () => 1,
      create: async () => {
        throw new Error('no debe crear');
      },
    },
  };
  const prisma = {
    aventon: {
      findUnique: async () => ({
        id: 'av1',
        estado: 'PUBLICADO',
        conductorId: 'cond',
        salidaAt: new Date(Date.now() + 3_600_000),
        lugares: 1,
        asientos: [],
      }),
    },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).apartar('av1', 'yo'),
    (err: unknown) => err instanceof BadRequestException,
  );
  assert.ok(consultas.some((c) => c.includes('FOR UPDATE')), 'debe bloquear la fila');
});

test('apartar con lugar libre crea el asiento dentro de la transaccion', async () => {
  let creado = false;
  const tx = {
    $queryRaw: async () => [],
    asientoAventon: {
      count: async () => 1,
      create: async () => {
        creado = true;
      },
    },
  };
  const prisma = {
    aventon: {
      findUnique: async () => ({
        id: 'av1',
        estado: 'PUBLICADO',
        conductorId: 'cond',
        salidaAt: new Date(Date.now() + 3_600_000),
        lugares: 3,
        asientos: [{ id: 's1', userId: 'otro' }],
      }),
    },
    profile: { findUnique: async () => ({ nombre: 'Ana' }) },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;

  const r = await servicio(prisma).apartar('av1', 'yo');
  assert.equal(creado, true);
  assert.deepEqual(r, { voyYo: true, ocupados: 2 });
});

test('cancelar solo lo puede el conductor', async () => {
  const prisma = {
    aventon: {
      findUnique: async () => ({ conductorId: 'otro' }),
      update: async () => {
        throw new Error('no debe cancelar');
      },
    },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).cancelar('av1', 'yo'),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('apartar aventon inexistente es 404', async () => {
  const prisma = {
    aventon: { findUnique: async () => null },
  } as unknown as PrismaService;

  await assert.rejects(
    () => servicio(prisma).apartar('av1', 'yo'),
    (err: unknown) => err instanceof NotFoundException,
  );
});

function prismaCancelar(estado: string, salidaAt: Date) {
  const avisos: { userId: string; tipo: string }[] = [];
  let actualizaciones = 0;
  const prisma = {
    aventon: {
      findUnique: async () => ({
        conductorId: 'yo',
        estado,
        destino: 'UDLAP',
        salidaAt,
        asientos: [{ userId: 'p1' }, { userId: 'p2' }],
      }),
      update: async () => {
        actualizaciones += 1;
        return {};
      },
    },
    profile: { findUnique: async () => ({ nombre: 'Ana' }) },
  } as unknown as PrismaService;
  const notificaciones = {
    crear: async (d: { userId: string; tipo: string }) => {
      avisos.push(d);
    },
  } as unknown as NotificacionesService;
  const svc = new AventonesService(prisma, notificaciones, gamificacionMock);
  return { svc, avisos, actualizaciones: () => actualizaciones };
}

const enUnaHora = () => new Date(Date.now() + 60 * 60 * 1000);

test('cancelar avisa a cada pasajero que aparto lugar', async () => {
  const { svc, avisos, actualizaciones } = prismaCancelar('PUBLICADO', enUnaHora());
  await svc.cancelar('a1', 'yo');
  assert.equal(actualizaciones(), 1);
  assert.deepEqual(
    avisos.map((a) => [a.userId, a.tipo]),
    [
      ['p1', 'AVENTON_CANCELADO'],
      ['p2', 'AVENTON_CANCELADO'],
    ],
  );
});

test('cancelar un aventon que ya salio no avisa a nadie', async () => {
  const { svc, avisos } = prismaCancelar('PUBLICADO', new Date(Date.now() - 60_000));
  await svc.cancelar('a1', 'yo');
  assert.equal(avisos.length, 0);
});

test('cancelar dos veces no repite avisos ni escrituras', async () => {
  const { svc, avisos, actualizaciones } = prismaCancelar('BORRADO_POR_AUTOR', enUnaHora());
  await svc.cancelar('a1', 'yo');
  assert.equal(actualizaciones(), 0);
  assert.equal(avisos.length, 0);
});