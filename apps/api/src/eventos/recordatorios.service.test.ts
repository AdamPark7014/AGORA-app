import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  MARGEN_MINIMO_MS,
  RecordatoriosEventoService,
  VENTANA_AVISO_MS,
  horaCampus,
  textoRecordatorio,
} from './recordatorios.service.js';

const AHORA = new Date('2026-10-22T23:00:00Z'); // 17:00 en el campus

interface Fila {
  id: string;
  userId: string;
  respuesta: 'VOY' | 'ME_INTERESA';
  recordatorioAt: Date | null;
  evento: { id: string; titulo: string; lugar: string; inicioAt: Date; autorId: string; estado: string };
}

/** Prisma de mentira que aplica el WHERE del cron y el update condicionado como lo haría Postgres. */
function escenario(filas: Fila[]) {
  const avisos: Array<{ userId: string; texto: string; url: string; tipo: string }> = [];
  let consultaWhere: unknown;
  const prisma = {
    asistenciaEvento: {
      findMany: async ({ where }: { where: { evento: { inicioAt: { gt: Date; lte: Date } } } }) => {
        consultaWhere = where;
        const { gt, lte } = where.evento.inicioAt;
        return filas.filter(
          (f) =>
            f.recordatorioAt === null &&
            f.evento.estado === 'PUBLICADO' &&
            f.evento.inicioAt > gt &&
            f.evento.inicioAt <= lte,
        );
      },
      updateMany: async ({ where, data }: { where: { id: string }; data: { recordatorioAt: Date } }) => {
        const f = filas.find((x) => x.id === where.id && x.recordatorioAt === null);
        if (!f) return { count: 0 };
        f.recordatorioAt = data.recordatorioAt;
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;
  const notificaciones = {
    crear: async (d: { userId: string; texto: string; url: string; tipo: string }) => {
      avisos.push(d);
    },
  } as unknown as NotificacionesService;
  return { servicio: new RecordatoriosEventoService(prisma, notificaciones), avisos, filas, where: () => consultaWhere };
}

const fila = (id: string, minutosParaInicio: number, extra: Partial<Fila> = {}): Fila => ({
  id,
  userId: `u-${id}`,
  respuesta: 'VOY',
  recordatorioAt: null,
  evento: {
    id: `e-${id}`,
    titulo: 'Noche de juegos',
    lugar: 'Cafetería Central',
    inicioAt: new Date(AHORA.getTime() + minutosParaInicio * 60_000),
    autorId: 'autor',
    estado: 'PUBLICADO',
  },
  ...extra,
});

test('avisa a quien va a un evento que empieza dentro de la siguiente hora', async () => {
  const { servicio, avisos } = escenario([fila('a', 45)]);
  assert.equal(await servicio.avisar(AHORA), 1);
  assert.equal(avisos[0]?.userId, 'u-a');
  assert.equal(avisos[0]?.tipo, 'EVENTO_RECORDATORIO');
  assert.equal(avisos[0]?.url, '/eventos/e-a');
  assert.match(avisos[0]!.texto, /«Noche de juegos» empieza en 45 min · Cafetería Central/);
});

test('no avisa dos veces aunque el cron vuelva a pasar', async () => {
  const { servicio, avisos } = escenario([fila('a', 45)]);
  await servicio.avisar(AHORA);
  await servicio.avisar(new Date(AHORA.getTime() + 5 * 60_000));
  assert.equal(avisos.length, 1);
});

test('fuera de la ventana no avisa: ni a más de una hora ni a menos de diez minutos', async () => {
  const { servicio, avisos } = escenario([fila('lejos', 90), fila('encima', 5), fila('pasado', -10)]);
  assert.equal(await servicio.avisar(AHORA), 0);
  assert.equal(avisos.length, 0);
});

test('un evento retirado o borrado no avisa', async () => {
  const retirado = fila('r', 30);
  retirado.evento.estado = 'RETIRADO';
  const { servicio, avisos } = escenario([retirado]);
  await servicio.avisar(AHORA);
  assert.equal(avisos.length, 0);
});

test('la consulta pide solo VOY y ME_INTERESA y la ventana correcta', async () => {
  const { servicio, where } = escenario([]);
  await servicio.avisar(AHORA);
  const w = where() as {
    respuesta: { in: string[] };
    recordatorioAt: null;
    evento: { inicioAt: { gt: Date; lte: Date } };
  };
  assert.deepEqual(w.respuesta.in, ['VOY', 'ME_INTERESA']);
  assert.equal(w.recordatorioAt, null);
  assert.equal(w.evento.inicioAt.gt.getTime(), AHORA.getTime() + MARGEN_MINIMO_MS);
  assert.equal(w.evento.inicioAt.lte.getTime(), AHORA.getTime() + VENTANA_AVISO_MS);
});

test('la hora del texto es la del campus, no la del contenedor', () => {
  assert.equal(horaCampus(new Date('2026-10-23T00:30:00Z')), '18:30');
  const texto = textoRecordatorio('Expo', 'Auditorio', new Date(AHORA.getTime() + 60 * 60_000), AHORA);
  assert.equal(texto, '«Expo» empieza a las 18:00 · Auditorio');
});

test('un título larguísimo no rompe el límite de 300 caracteres de la notificación', () => {
  const texto = textoRecordatorio('x'.repeat(400), 'Aula', new Date(AHORA.getTime() + 20 * 60_000), AHORA);
  assert.ok(texto.length <= 300);
});
