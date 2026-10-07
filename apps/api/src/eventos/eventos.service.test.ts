import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';

import { EventosService } from './eventos.service.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const notificacionesMock = { crear: async () => {} } as unknown as NotificacionesService;

function prismaConCupo(cupo: number, vanOtros: number) {
  const registro = { candado: false, escrito: false };
  const tx = {
    $queryRaw: async (partes: TemplateStringsArray) => {
      if (partes.join('?').includes('FOR UPDATE')) registro.candado = true;
      return [];
    },
    asistenciaEvento: {
      count: async () => vanOtros,
      upsert: async () => {
        registro.escrito = true;
      },
    },
  };
  const prisma = {
    evento: { findUnique: async () => ({ id: 'e1', cupo, estado: 'PUBLICADO' }) },
    asistenciaEvento: {
      findUnique: async () => null,
      upsert: async () => {
        throw new Error('con cupo no debe escribir fuera de la transaccion');
      },
    },
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;
  return { prisma, registro };
}

test('responder VOY con cupo lleno falla bajo candado', async () => {
  const { prisma, registro } = prismaConCupo(10, 10);
  const servicio = new EventosService(prisma, notificacionesMock);

  await assert.rejects(
    () => servicio.responder('e1', 'yo', { respuesta: 'VOY' }),
    (err: unknown) => err instanceof BadRequestException,
  );
  assert.equal(registro.candado, true);
  assert.equal(registro.escrito, false);
});

test('responder VOY con lugar libre escribe dentro de la transaccion', async () => {
  const { prisma, registro } = prismaConCupo(10, 9);
  const servicio = new EventosService(prisma, notificacionesMock);

  const r = await servicio.responder('e1', 'yo', { respuesta: 'VOY' });
  assert.deepEqual(r, { miRespuesta: 'VOY' });
  assert.equal(registro.candado, true);
  assert.equal(registro.escrito, true);
});
