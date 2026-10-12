import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PrismaService } from '../prisma/prisma.service.js';
import type { PushService } from '../push/push.service.js';
import { PreguntaService } from './pregunta.service.js';
import { diaCampus } from './relampago.js';

const gamificacion = { evaluarBadges: async () => [] } as never;

function preguntaDeHoy(extra: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    universityId: 'udlap',
    texto: '¿Café o energético?',
    opciones: ['Café', 'Energético'],
    fecha: diaCampus(),
    abreAt: null as Date | null,
    avisadaAt: null as Date | null,
    ...extra,
  };
}

test('el aviso de la pregunta sale una sola vez, cuando ya cayo', async () => {
  const ahora = new Date();
  let marcada = 0;
  const enviados: string[] = [];
  let estado = preguntaDeHoy({ abreAt: new Date(ahora.getTime() - 60_000) });
  const prisma = {
    university: { findMany: async () => [{ id: 'udlap' }] },
    preguntaDelDia: {
      findUnique: async () => estado,
      updateMany: async () => {
        if (estado.avisadaAt) return { count: 0 };
        marcada += 1;
        estado = { ...estado, avisadaAt: ahora };
        return { count: 1 };
      },
    },
    user: { findMany: async () => [{ id: 'u1' }, { id: 'u2' }] },
  } as unknown as PrismaService;
  const push = {
    enviar: async (id: string) => {
      enviados.push(id);
    },
  } as unknown as PushService;
  const servicio = new PreguntaService(prisma, gamificacion, push);

  assert.equal(await servicio.avisarSiCayo(ahora), 1);
  assert.equal(await servicio.avisarSiCayo(ahora), 0);
  await new Promise((r) => setImmediate(r));
  assert.equal(marcada, 1);
  assert.deepEqual(enviados.sort(), ['u1', 'u2']);
});

test('antes de la hora sorpresa no se avisa', async () => {
  const ahora = new Date();
  let tocada = false;
  const prisma = {
    university: { findMany: async () => [{ id: 'udlap' }] },
    preguntaDelDia: {
      findUnique: async () => preguntaDeHoy({ abreAt: new Date(ahora.getTime() + 60_000) }),
      updateMany: async () => {
        tocada = true;
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;
  const servicio = new PreguntaService(prisma, gamificacion, {} as PushService);

  assert.equal(await servicio.avisarSiCayo(ahora), 0);
  assert.equal(tocada, false);
});

test('contestar en la ventana marca a tiempo; rectificar no lo cambia', async () => {
  let creada: Record<string, unknown> | undefined;
  let actualizada: Record<string, unknown> | undefined;
  const prisma = {
    preguntaDelDia: {
      findUnique: async () => preguntaDeHoy({ abreAt: new Date(Date.now() - 30_000) }),
    },
    respuestaPregunta: {
      upsert: async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        creada = create;
        actualizada = update;
      },
      groupBy: async () => [],
      findUnique: async () => null,
    },
    user: { findUnique: async () => ({ universityId: 'udlap' }) },
  } as unknown as PrismaService;
  const servicio = new PreguntaService(prisma, gamificacion, {} as PushService);

  await servicio.responder('yo', 'p1', 1);

  assert.equal(creada?.aTiempo, true);
  assert.deepEqual(actualizada, { opcion: 1 });
});
