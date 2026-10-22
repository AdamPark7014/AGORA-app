import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { horaCampus } from '../eventos/recordatorios.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Recordatorio de aventones: media hora antes de la salida, aviso a cada
 * pasajero con lugar apartado y al conductor si alguien va con él. El fallo que
 * resuelve es el de siempre: apartaste el martes para el jueves a las 7:10 y se
 * te olvidó, y el conductor espera en la caseta.
 *
 * Igual que el de eventos: una marca `recordatorioAt` por asiento y otra por
 * aventón, puestas con un update condicionado antes de avisar, así dos vueltas
 * del cron no mandan el aviso doble. La ventana empieza 5 minutos antes de la
 * salida: más tarde ya no da tiempo de llegar.
 */
export const VENTANA_AVISO_MS = 30 * 60_000;
export const MARGEN_MINIMO_MS = 5 * 60_000;
export const TOPE_POR_VUELTA = 500;

const recortar = (texto: string): string => (texto.length > 300 ? `${texto.slice(0, 297)}…` : texto);

const cuando = (salida: Date, ahora: Date): string => {
  const minutos = Math.max(1, Math.round((salida.getTime() - ahora.getTime()) / 60_000));
  return minutos <= 59 ? `en ${minutos} min` : `a las ${horaCampus(salida)}`;
};

export const textoPasajero = (
  conductor: string,
  origen: string,
  destino: string,
  salida: Date,
  ahora: Date,
): string => recortar(`Tu aventón con ${conductor} sale ${cuando(salida, ahora)} · ${origen} → ${destino}`);

export const textoConductor = (
  apartados: number,
  origen: string,
  destino: string,
  salida: Date,
  ahora: Date,
): string => {
  const quienes = apartados === 1 ? '1 persona va contigo' : `${apartados} personas van contigo`;
  return recortar(`Tu aventón sale ${cuando(salida, ahora)} y ${quienes} · ${origen} → ${destino}`);
};

@Injectable()
export class RecordatoriosAventonService {
  private readonly log = new Logger('RecordatoriosAventon');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  @Cron('*/5 * * * *', { name: 'recordatorio-aventones' })
  async avisar(ahora: Date = new Date()): Promise<number> {
    const salidaAt = {
      gt: new Date(ahora.getTime() + MARGEN_MINIMO_MS),
      lte: new Date(ahora.getTime() + VENTANA_AVISO_MS),
    };
    const pasajeros = await this.avisarPasajeros(ahora, salidaAt);
    const conductores = await this.avisarConductores(ahora, salidaAt);
    const enviados = pasajeros + conductores;
    if (enviados > 0) this.log.log(`Recordatorios de aventón: ${pasajeros} pasajeros, ${conductores} conductores`);
    return enviados;
  }

  private async avisarPasajeros(ahora: Date, salidaAt: { gt: Date; lte: Date }): Promise<number> {
    const asientos = await this.prisma.asientoAventon.findMany({
      where: { recordatorioAt: null, aventon: { estado: 'PUBLICADO', salidaAt } },
      select: {
        id: true,
        userId: true,
        aventon: {
          select: {
            origen: true,
            destino: true,
            salidaAt: true,
            conductor: { select: { profile: { select: { nombre: true } } } },
          },
        },
      },
      orderBy: { aventon: { salidaAt: 'asc' } },
      take: TOPE_POR_VUELTA,
    });

    let enviados = 0;
    for (const a of asientos) {
      const marcado = await this.prisma.asientoAventon.updateMany({
        where: { id: a.id, recordatorioAt: null },
        data: { recordatorioAt: ahora },
      });
      if (marcado.count !== 1) continue;
      const v = a.aventon;
      await this.notificaciones.crear({
        userId: a.userId,
        tipo: 'AVENTON_RECORDATORIO',
        texto: textoPasajero(v.conductor.profile?.nombre ?? 'tu conductor', v.origen, v.destino, v.salidaAt, ahora),
        url: '/aventones',
      });
      enviados += 1;
    }
    return enviados;
  }

  private async avisarConductores(ahora: Date, salidaAt: { gt: Date; lte: Date }): Promise<number> {
    const aventones = await this.prisma.aventon.findMany({
      where: { recordatorioAt: null, estado: 'PUBLICADO', salidaAt, asientos: { some: {} } },
      select: {
        id: true,
        conductorId: true,
        origen: true,
        destino: true,
        salidaAt: true,
        _count: { select: { asientos: true } },
      },
      orderBy: { salidaAt: 'asc' },
      take: TOPE_POR_VUELTA,
    });

    let enviados = 0;
    for (const v of aventones) {
      const marcado = await this.prisma.aventon.updateMany({
        where: { id: v.id, recordatorioAt: null },
        data: { recordatorioAt: ahora },
      });
      if (marcado.count !== 1) continue;
      await this.notificaciones.crear({
        userId: v.conductorId,
        tipo: 'AVENTON_RECORDATORIO',
        texto: textoConductor(v._count.asientos, v.origen, v.destino, v.salidaAt, ahora),
        url: '/aventones',
      });
      enviados += 1;
    }
    return enviados;
  }
}
