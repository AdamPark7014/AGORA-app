import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import {
  MARGEN_MINIMO_MS,
  RecordatoriosAventonService,
  VENTANA_AVISO_MS,
  textoConductor,
  textoPasajero,
} from './recordatorios.service.js';

const AHORA = new Date('2026-10-23T12:40:00Z'); // 6:40 en el campus

interface Aventon {
  id: string;
  conductorId: string;
  conductorNombre: string | null;
  origen: string;
  destino: string;
  salidaAt: Date;
  estado: string;
  recordatorioAt: Date | null;
}

interface Asiento {
  id: string;
  aventonId: string;
  userId: string;
  recordatorioAt: Date | null;
}

type Rango = { gt: Date; lte: Date };

/** Prisma de mentira que aplica los WHERE del cron y los updates condicionados como Postgres. */
function escenario(aventones: Aventon[], asientos: Asiento[]) {
  const avisos: Array<{ userId: string; texto: string; url: string; tipo: string }> = [];
  const enRango = (v: Aventon, r: Rango) => v.estado === 'PUBLICADO' && v.salidaAt > r.gt && v.salidaAt <= r.lte;
  const prisma = {
    asientoAventon: {
      findMany: async ({ where }: { where: { aventon: { salidaAt: Rango } } }) =>
        asientos
          .filter((a) => a.recordatorioAt === null)
          .map((a) => ({ a, v: aventones.find((v) => v.id === a.aventonId)! }))
          .filter(({ v }) => enRango(v, where.aventon.salidaAt))
          .map(({ a, v }) => ({
            id: a.id,
            userId: a.userId,
            aventon: {
              origen: v.origen,
              destino: v.destino,
              salidaAt: v.salidaAt,
              conductor: { profile: v.conductorNombre ? { nombre: v.conductorNombre } : null },
            },
          })),
      updateMany: async ({ where, data }: { where: { id: string }; data: { recordatorioAt: Date } }) => {
        const a = asientos.find((x) => x.id === where.id && x.recordatorioAt === null);
        if (!a) return { count: 0 };
        a.recordatorioAt = data.recordatorioAt;
        return { count: 1 };
      },
    },
    aventon: {
      findMany: async ({ where }: { where: { salidaAt: Rango } }) =>
        aventones
          .filter((v) => v.recordatorioAt === null && enRango(v, where.salidaAt))
          .map((v) => ({ v, n: asientos.filter((a) => a.aventonId === v.id).length }))
          .filter(({ n }) => n > 0)
          .map(({ v, n }) => ({ ...v, _count: { asientos: n } })),
      updateMany: async ({ where, data }: { where: { id: string }; data: { recordatorioAt: Date } }) => {
        const v = aventones.find((x) => x.id === where.id && x.recordatorioAt === null);
        if (!v) return { count: 0 };
        v.recordatorioAt = data.recordatorioAt;
        return { count: 1 };
      },
    },
  } as unknown as PrismaService;
  const notificaciones = {
    crear: async (d: { userId: string; texto: string; url: string; tipo: string }) => {
      avisos.push(d);
    },
  } as unknown as NotificacionesService;
  return { servicio: new RecordatoriosAventonService(prisma, notificaciones), avisos };
}

const aventon = (id: string, minutosParaSalir: number, extra: Partial<Aventon> = {}): Aventon => ({
  id,
  conductorId: `c-${id}`,
  conductorNombre: 'Sofía',
  origen: 'Angelópolis',
  destino: 'Campus',
  salidaAt: new Date(AHORA.getTime() + minutosParaSalir * 60_000),
  estado: 'PUBLICADO',
  recordatorioAt: null,
  ...extra,
});

const asiento = (id: string, aventonId: string): Asiento => ({ id, aventonId, userId: `p-${id}`, recordatorioAt: null });

test('avisa a cada pasajero y al conductor media hora antes de salir', async () => {
  const { servicio, avisos } = escenario([aventon('a', 25)], [asiento('1', 'a'), asiento('2', 'a')]);
  assert.equal(await servicio.avisar(AHORA), 3);
  const pasajero = avisos.find((x) => x.userId === 'p-1')!;
  assert.equal(pasajero.tipo, 'AVENTON_RECORDATORIO');
  assert.equal(pasajero.url, '/aventones');
  assert.equal(pasajero.texto, 'Tu aventón con Sofía sale en 25 min · Angelópolis → Campus');
  const conductor = avisos.find((x) => x.userId === 'c-a')!;
  assert.equal(conductor.texto, 'Tu aventón sale en 25 min y 2 personas van contigo · Angelópolis → Campus');
});

test('no avisa dos veces aunque el cron vuelva a pasar', async () => {
  const { servicio, avisos } = escenario([aventon('a', 25)], [asiento('1', 'a')]);
  await servicio.avisar(AHORA);
  assert.equal(await servicio.avisar(new Date(AHORA.getTime() + 5 * 60_000)), 0);
  assert.equal(avisos.length, 2);
});

test('fuera de la ventana no avisa: ni muy pronto ni ya encima', async () => {
  const lejos = VENTANA_AVISO_MS / 60_000 + 5;
  const encima = MARGEN_MINIMO_MS / 60_000 - 1;
  const { servicio, avisos } = escenario(
    [aventon('lejos', lejos), aventon('encima', encima)],
    [asiento('1', 'lejos'), asiento('2', 'encima')],
  );
  assert.equal(await servicio.avisar(AHORA), 0);
  assert.equal(avisos.length, 0);
});

test('al conductor sin pasajeros no le llega nada, y un aventón cancelado no avisa', async () => {
  const { servicio, avisos } = escenario(
    [aventon('solo', 20), aventon('cancelado', 20, { estado: 'RETIRADO' })],
    [asiento('1', 'cancelado')],
  );
  assert.equal(await servicio.avisar(AHORA), 0);
  assert.equal(avisos.length, 0);
});

test('textos: singular, conductor sin perfil y tope de 300', () => {
  assert.equal(
    textoConductor(1, 'Cholula', 'Campus', new Date(AHORA.getTime() + 30 * 60_000), AHORA),
    'Tu aventón sale en 30 min y 1 persona va contigo · Cholula → Campus',
  );
  const { servicio } = escenario([], []);
  assert.ok(servicio);
  const largo = textoPasajero('A'.repeat(400), 'x', 'y', new Date(AHORA.getTime() + 10 * 60_000), AHORA);
  assert.ok(largo.length <= 300);
  assert.ok(largo.endsWith('…'));
});

test('sin perfil del conductor dice «tu conductor»', async () => {
  const { servicio, avisos } = escenario([aventon('a', 15, { conductorNombre: null })], [asiento('1', 'a')]);
  await servicio.avisar(AHORA);
  assert.match(avisos.find((x) => x.userId === 'p-1')!.texto, /^Tu aventón con tu conductor sale en 15 min/);
});
