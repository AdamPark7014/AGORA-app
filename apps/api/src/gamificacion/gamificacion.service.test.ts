import assert from 'node:assert/strict';
import { test } from 'node:test';

import { GamificacionService } from './gamificacion.service.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

interface UserStreakRow {
  userId: string;
  rachaActual: number;
  rachaMaxima: number;
  ultimoDiaActivo: Date | null;
}

const notificacionesMock = {
  crear: async () => {},
} as unknown as NotificacionesService;

function crearServicio(prisma: PrismaService) {
  return new GamificacionService(prisma, notificacionesMock);
}

/** Misma lógica de corte que GamificacionService.hoy() para preparar fixtures. */
function hoyMexico(): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = partes.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function diaAnterior(fecha: Date): Date {
  return new Date(fecha.getTime() - 86_400_000);
}

/** Lunes–lunes siguiente, ISO en calendario campus (espejo del servicio). */
function semanaIsoRango(): { inicio: Date; fin: Date } {
  const hoy = hoyMexico();
  const isoDow = hoy.getUTCDay() === 0 ? 7 : hoy.getUTCDay();
  const inicio = new Date(hoy.getTime() - (isoDow - 1) * 86_400_000);
  const fin = new Date(inicio.getTime() + 7 * 86_400_000);
  return { inicio, fin };
}

function crearPrismaStreakMock() {
  const streaks = new Map<string, UserStreakRow>();
  let updates = 0;

  const prisma = {
    userStreak: {
      findUnique: async ({ where }: { where: { userId: string } }) =>
        streaks.get(where.userId) ?? null,
      create: async ({
        data,
      }: {
        data: { userId: string; rachaActual: number; rachaMaxima: number; ultimoDiaActivo: Date };
      }) => {
        streaks.set(data.userId, { ...data });
        return data;
      },
      update: async ({
        where,
        data,
      }: {
        where: { userId: string };
        data: { rachaActual: number; rachaMaxima: number; ultimoDiaActivo: Date };
      }) => {
        updates += 1;
        const existente = streaks.get(where.userId)!;
        const actualizado = { ...existente, ...data };
        streaks.set(where.userId, actualizado);
        return actualizado;
      },
    },
  };

  return {
    prisma: prisma as unknown as PrismaService,
    getStreak: (userId: string) => streaks.get(userId),
    seed: (row: UserStreakRow) => streaks.set(row.userId, row),
    updates: () => updates,
  };
}

test('primera actividad inicia racha en 1', async () => {
  const mock = crearPrismaStreakMock();
  const svc = crearServicio(mock.prisma);

  await svc.registrarActividad('u1');

  const streak = mock.getStreak('u1');
  assert.equal(streak?.rachaActual, 1);
  assert.equal(streak?.rachaMaxima, 1);
  assert.equal(streak?.ultimoDiaActivo?.getTime(), hoyMexico().getTime());
});

test('mismo dia no incrementa ni reescribe la racha', async () => {
  const hoy = hoyMexico();
  const mock = crearPrismaStreakMock();
  mock.seed({ userId: 'u1', rachaActual: 4, rachaMaxima: 6, ultimoDiaActivo: hoy });

  const svc = crearServicio(mock.prisma);
  await svc.registrarActividad('u1');

  assert.equal(mock.updates(), 0);
  assert.equal(mock.getStreak('u1')?.rachaActual, 4);
  assert.equal(mock.getStreak('u1')?.rachaMaxima, 6);
});

test('dia consecutivo incrementa la racha', async () => {
  const hoy = hoyMexico();
  const ayer = diaAnterior(hoy);
  const mock = crearPrismaStreakMock();
  mock.seed({ userId: 'u1', rachaActual: 3, rachaMaxima: 5, ultimoDiaActivo: ayer });

  const svc = crearServicio(mock.prisma);
  await svc.registrarActividad('u1');

  const streak = mock.getStreak('u1');
  assert.equal(streak?.rachaActual, 4);
  assert.equal(streak?.rachaMaxima, 5);
  assert.equal(streak?.ultimoDiaActivo?.getTime(), hoy.getTime());
});

test('dia consecutivo actualiza rachaMaxima si supera el record', async () => {
  const hoy = hoyMexico();
  const ayer = diaAnterior(hoy);
  const mock = crearPrismaStreakMock();
  mock.seed({ userId: 'u1', rachaActual: 6, rachaMaxima: 6, ultimoDiaActivo: ayer });

  const svc = crearServicio(mock.prisma);
  await svc.registrarActividad('u1');

  const streak = mock.getStreak('u1');
  assert.equal(streak?.rachaActual, 7);
  assert.equal(streak?.rachaMaxima, 7);
});

test('salto de un dia o mas reinicia la racha a 1', async () => {
  const hoy = hoyMexico();
  const haceTresDias = new Date(hoy.getTime() - 3 * 86_400_000);
  const mock = crearPrismaStreakMock();
  mock.seed({ userId: 'u1', rachaActual: 12, rachaMaxima: 12, ultimoDiaActivo: haceTresDias });

  const svc = crearServicio(mock.prisma);
  await svc.registrarActividad('u1');

  const streak = mock.getStreak('u1');
  assert.equal(streak?.rachaActual, 1);
  assert.equal(streak?.rachaMaxima, 12, 'el maximo historico no baja');
  assert.equal(streak?.ultimoDiaActivo?.getTime(), hoy.getTime());
});

test('evaluarBadges es idempotente: solo crea insignias faltantes', async () => {
  const badges = new Map<string, { userId: string; codigo: string }>();
  let creates = 0;
  const diasHistoricos = Array.from({ length: 7 }, (_, i) => ({
    pregunta: { fecha: new Date(Date.UTC(2026, 0, 1 + i)) },
  }));

  const prisma = {
    respuestaPregunta: {
      findMany: async ({
        where,
      }: {
        where: {
          userId: string;
          pregunta?: { fecha?: { gte?: Date; lt?: Date } };
        };
      }) => {
        if (where.pregunta?.fecha) return [];
        return diasHistoricos;
      },
    },
    aventon: { count: async () => 0 },
    post: { count: async () => 0 },
    userStreak: { findUnique: async () => null },
    userBadge: {
      findMany: async ({ where }: { where: { userId: string; codigo: { in: string[] } } }) =>
        [...badges.values()].filter(
          (b) => b.userId === where.userId && where.codigo.in.includes(b.codigo),
        ),
      create: async ({ data }: { data: { userId: string; codigo: string } }) => {
        creates += 1;
        badges.set(`${data.userId}:${data.codigo}`, data);
        return data;
      },
    },
  };

  const svc = crearServicio(prisma as unknown as PrismaService);

  const primera = await svc.evaluarBadges('u1');
  assert.deepEqual(primera, ['PREGUNTA_7']);
  assert.equal(creates, 1);

  const segunda = await svc.evaluarBadges('u1');
  assert.deepEqual(segunda, []);
  assert.equal(creates, 1, 'no vuelve a crear insignias ya otorgadas');
});

test('semanaPregunta cuenta dias distintos en la semana ISO actual', async () => {
  const { inicio, fin } = semanaIsoRango();
  const lunes = inicio;
  const martes = new Date(lunes.getTime() + 86_400_000);
  const semanaPasada = new Date(lunes.getTime() - 86_400_000);

  const prisma = {
    userBadge: { findMany: async () => [] },
    user: { findUnique: async () => ({ universityId: 'udlap' }) },
    userStreak: {
      findUnique: async () => null,
      aggregate: async () => ({ _avg: { rachaActual: 3 } }),
    },
    respuestaPregunta: {
      findMany: async ({
        where,
      }: {
        where: {
          userId: string;
          pregunta?: { fecha?: { gte?: Date; lt?: Date } };
        };
      }) => {
        if (where.pregunta?.fecha) {
          const todas = [
            { pregunta: { fecha: lunes } },
            { pregunta: { fecha: lunes } },
            { pregunta: { fecha: martes } },
            { pregunta: { fecha: semanaPasada } },
          ];
          const { gte, lt } = where.pregunta.fecha;
          return todas.filter(
            (r) =>
              (!gte || r.pregunta.fecha.getTime() >= gte.getTime()) &&
              (!lt || r.pregunta.fecha.getTime() < lt.getTime()),
          );
        }
        return [];
      },
    },
  };

  const svc = crearServicio(prisma as unknown as PrismaService);
  const resultado = await svc.obtener('u1');

  assert.equal(resultado.semanaPregunta?.meta, 7);
  assert.equal(resultado.semanaPregunta?.respondidas, 2, 'lunes y martes; duplicado y semana pasada no cuentan');
  assert.equal(resultado.retoSemanal?.titulo, 'Reto semanal: 7 preguntas');
  assert.equal(resultado.retoSemanal?.progreso, 2);
  assert.equal(resultado.retoSemanal?.completado, false);
  assert.ok(inicio.getTime() < fin.getTime());
});

test('evaluarBadges otorga SEMANA_PERFECTA con 7 respuestas en la semana ISO', async () => {
  const badges = new Map<string, { userId: string; codigo: string }>();
  let creates = 0;
  const { inicio } = semanaIsoRango();
  const diasSemana = Array.from({ length: 7 }, (_, i) => ({
    pregunta: { fecha: new Date(inicio.getTime() + i * 86_400_000) },
  }));

  const prisma = {
    respuestaPregunta: {
      findMany: async ({
        where,
      }: {
        where: {
          userId: string;
          pregunta?: { fecha?: { gte?: Date; lt?: Date } };
        };
      }) => {
        if (where.pregunta?.fecha) {
          const { gte, lt } = where.pregunta.fecha;
          return diasSemana.filter(
            (r) =>
              (!gte || r.pregunta.fecha.getTime() >= gte.getTime()) &&
              (!lt || r.pregunta.fecha.getTime() < lt.getTime()),
          );
        }
        return diasSemana;
      },
    },
    aventon: { count: async () => 0 },
    post: { count: async () => 0 },
    userStreak: { findUnique: async () => null },
    userBadge: {
      findMany: async ({ where }: { where: { userId: string; codigo: { in: string[] } } }) =>
        [...badges.values()].filter(
          (b) => b.userId === where.userId && where.codigo.in.includes(b.codigo),
        ),
      create: async ({ data }: { data: { userId: string; codigo: string } }) => {
        creates += 1;
        badges.set(`${data.userId}:${data.codigo}`, data);
        return data;
      },
    },
  };

  const svc = crearServicio(prisma as unknown as PrismaService);
  const nuevas = await svc.evaluarBadges('u1');

  assert.ok(nuevas.includes('SEMANA_PERFECTA'));
  assert.ok(nuevas.includes('PREGUNTA_7'));
  assert.equal(creates, 2);
});

test('comparacionCampus calcula promedioRacha del campus y si tuRacha esta por encima', async () => {
  const prisma = {
    user: { findUnique: async () => ({ universityId: 'udlap' }) },
    userStreak: {
      findUnique: async () => ({ rachaActual: 5, rachaMaxima: 8, ultimoDiaActivo: hoyMexico() }),
      aggregate: async () => ({ _avg: { rachaActual: 3.5 } }),
    },
    userBadge: { findMany: async () => [] },
    respuestaPregunta: { findMany: async () => [] },
  };

  const svc = crearServicio(prisma as unknown as PrismaService);
  const resultado = await svc.obtener('u1');

  assert.equal(resultado.comparacionCampus?.promedioRacha, 3.5);
  assert.equal(resultado.comparacionCampus?.tuRacha, 5);
  assert.equal(resultado.comparacionCampus?.porEncimaDelPromedio, true);
});

test('leaderboard devuelve miPosicion null si racha menor a 2', async () => {
  const prisma = {
    user: { findUnique: async () => ({ universityId: 'udlap' }) },
    userStreak: {
      findUnique: async () => ({ rachaActual: 1, rachaMaxima: 1 }),
      findMany: async () => [],
      count: async () => 0,
    },
  };

  const svc = crearServicio(prisma as unknown as PrismaService);
  const resultado = await svc.leaderboard('u1');

  assert.equal(resultado.miPosicion, null);
});

test('leaderboard devuelve miPosicion 1-based entre campus', async () => {
  const prisma = {
    user: { findUnique: async () => ({ universityId: 'udlap' }) },
    userStreak: {
      findUnique: async () => ({ rachaActual: 5, rachaMaxima: 10 }),
      findMany: async () => [
        {
          rachaActual: 8,
          user: { profile: { handle: 'top', nombre: 'Top', fotoUrl: null } },
        },
        {
          rachaActual: 5,
          user: { profile: { handle: 'yo', nombre: 'Yo', fotoUrl: null } },
        },
      ],
      count: async () => 1,
    },
  };

  const svc = crearServicio(prisma as unknown as PrismaService);
  const resultado = await svc.leaderboard('u1');

  assert.equal(resultado.miPosicion, 2);
  assert.equal(resultado.entradas.length, 2);
});
