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
