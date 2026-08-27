import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RetosService } from './retos.service.js';
import type { GamificacionService } from '../gamificacion/gamificacion.service.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type TipoReto = 'RACHA' | 'SEMANA_PREGUNTA';

interface RetoActivoRow {
  retadorId: string;
  retadoId: string;
  tipo: TipoReto;
}

interface ProfileRow {
  userId: string;
  handle: string;
  nombre: string;
  fotoUrl: string | null;
}

const notificacionesMock = {
  crear: async () => {},
} as unknown as NotificacionesService;

const INICIO_SEMANA = new Date(Date.UTC(2026, 7, 18, 0, 0, 0, 0)); // lunes ISO

function crearServicio(puntajes: Record<string, number>, retos: RetoActivoRow[] = []) {
  const gamificacion = {
    inicioSemanaIso: () => INICIO_SEMANA,
    puntajeReto: async (userId: string, _tipo: TipoReto) => puntajes[userId] ?? 0,
  } as unknown as GamificacionService;

  const perfiles = new Map<string, ProfileRow>([
    ['u1', { userId: 'u1', handle: 'ana', nombre: 'Ana', fotoUrl: null }],
    ['u2', { userId: 'u2', handle: 'luis', nombre: 'Luis', fotoUrl: '/f.jpg' }],
    ['u3', { userId: 'u3', handle: 'bea', nombre: 'Bea', fotoUrl: null }],
  ]);

  const prismaMock = {
    user: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === 'viewer' ? { universityId: 'campus-1' } : null,
    },
    retoAmigo: {
      findMany: async ({
        where,
      }: {
        where: { estado: string; activadoAt: { gte: Date } };
      }) => {
        assert.equal(where.estado, 'ACTIVO');
        assert.equal(where.activadoAt.gte.getTime(), INICIO_SEMANA.getTime());
        return retos;
      },
    },
    profile: {
      findMany: async ({ where }: { where: { userId: { in: string[] } } }) =>
        where.userId.in
          .map((id) => perfiles.get(id))
          .filter((p): p is ProfileRow => p !== undefined),
    },
  } as unknown as PrismaService;

  return new RetosService(prismaMock, gamificacion, notificacionesMock);
}

test('rankingSemanal: suma victorias por duelo activo de la semana', async () => {
  const retos: RetoActivoRow[] = [
    { retadorId: 'u1', retadoId: 'u2', tipo: 'RACHA' }, // ana gana
    { retadorId: 'u1', retadoId: 'u3', tipo: 'SEMANA_PREGUNTA' }, // ana gana
    { retadorId: 'u2', retadoId: 'u3', tipo: 'RACHA' }, // luis gana
  ];
  const puntajes = { u1: 10, u2: 5, u3: 3 };

  const servicio = crearServicio(puntajes, retos);
  const resultado = await servicio.rankingSemanal('viewer', 5);

  assert.equal(resultado.entradas.length, 2);
  assert.deepEqual(resultado.entradas[0], {
    handle: 'ana',
    nombre: 'Ana',
    fotoUrl: null,
    victorias: 2,
  });
  assert.deepEqual(resultado.entradas[1], {
    handle: 'luis',
    nombre: 'Luis',
    fotoUrl: '/f.jpg',
    victorias: 1,
  });
});

test('rankingSemanal: empate no suma victoria a nadie', async () => {
  const retos: RetoActivoRow[] = [{ retadorId: 'u1', retadoId: 'u2', tipo: 'RACHA' }];
  const puntajes = { u1: 4, u2: 4 };

  const servicio = crearServicio(puntajes, retos);
  const resultado = await servicio.rankingSemanal('viewer', 5);

  assert.deepEqual(resultado.entradas, []);
});

test('rankingSemanal: respeta limite', async () => {
  const retos: RetoActivoRow[] = [
    { retadorId: 'u1', retadoId: 'u2', tipo: 'RACHA' },
    { retadorId: 'u2', retadoId: 'u3', tipo: 'RACHA' },
    { retadorId: 'u3', retadoId: 'u1', tipo: 'RACHA' },
  ];
  const puntajes = { u1: 9, u2: 7, u3: 5 };

  const servicio = crearServicio(puntajes, retos);
  const resultado = await servicio.rankingSemanal('viewer', 2);

  assert.equal(resultado.entradas.length, 2);
  assert.equal(resultado.entradas[0]?.handle, 'ana');
  assert.equal(resultado.entradas[0]?.victorias, 2);
  assert.equal(resultado.entradas[1]?.handle, 'luis');
  assert.equal(resultado.entradas[1]?.victorias, 1);
});

test('historial: incluye rechazados y duelos activos de semanas pasadas', async () => {
  const inicioSemana = INICIO_SEMANA;
  const semanaPasada = new Date(inicioSemana.getTime() - 86400000);

  const rows = [
    {
      id: 'r1',
      retadorId: 'u1',
      retadoId: 'u2',
      tipo: 'RACHA' as const,
      estado: 'RECHAZADO' as const,
      createdAt: new Date('2026-08-20T12:00:00Z'),
      activadoAt: null,
      retador: { profile: { handle: 'ana', nombre: 'Ana', apellidos: 'X' } },
      retado: { profile: { handle: 'luis', nombre: 'Luis', apellidos: 'Y' } },
    },
    {
      id: 'r2',
      retadorId: 'u1',
      retadoId: 'u3',
      tipo: 'SEMANA_PREGUNTA' as const,
      estado: 'ACTIVO' as const,
      createdAt: semanaPasada,
      activadoAt: semanaPasada,
      retador: { profile: { handle: 'ana', nombre: 'Ana', apellidos: 'X' } },
      retado: { profile: { handle: 'bea', nombre: 'Bea', apellidos: 'Z' } },
    },
  ];

  const prismaMock = {
    retoAmigo: {
      findMany: async () => rows,
    },
  } as unknown as PrismaService;

  const gamificacion = {
    inicioSemanaIso: () => INICIO_SEMANA,
    puntajeReto: async (userId: string, _tipo: TipoReto) =>
      userId === 'u1' ? 8 : userId === 'u3' ? 2 : 5,
  } as unknown as GamificacionService;

  const servicio = new RetosService(prismaMock, gamificacion, notificacionesMock);
  const resultado = await servicio.historial('u1', undefined, 10);

  assert.equal(resultado.items.length, 2);
  assert.equal(resultado.items[0]?.resultado, 'rechazado');
  assert.equal(resultado.items[1]?.resultado, 'ganaste');
  assert.equal(resultado.siguienteCursor, null);
});
