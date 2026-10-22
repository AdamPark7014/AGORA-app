import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';

/**
 * Recordatorio de eventos: a quien dijo «Voy» o «Me interesa» le llega un aviso
 * cuando el evento empieza dentro de la siguiente hora. Uno por persona y
 * evento: la marca `recordatorioAt` se pone con un update condicionado antes de
 * avisar, así dos réplicas o dos vueltas del cron no mandan el aviso doble.
 *
 * La ventana empieza 10 minutos antes del inicio: a quien responde a última hora
 * no le sirve un recordatorio de algo que ya está por empezar.
 */
export const VENTANA_AVISO_MS = 60 * 60_000;
export const MARGEN_MINIMO_MS = 10 * 60_000;
/** Tope por vuelta: un evento del campus con miles de asistentes se reparte en varias vueltas. */
export const TOPE_POR_VUELTA = 500;

/** Hora del campus «18:30», sin depender de la zona del contenedor (UTC). */
export const horaCampus = (fecha: Date): string =>
  new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Mexico_City',
  }).format(fecha);

export const textoRecordatorio = (titulo: string, lugar: string, inicio: Date, ahora: Date): string => {
  const minutos = Math.max(1, Math.round((inicio.getTime() - ahora.getTime()) / 60_000));
  const cuando = minutos <= 59 ? `en ${minutos} min` : `a las ${horaCampus(inicio)}`;
  const texto = `«${titulo}» empieza ${cuando} · ${lugar}`;
  return texto.length > 300 ? `${texto.slice(0, 297)}…` : texto;
};

@Injectable()
export class RecordatoriosEventoService {
  private readonly log = new Logger('RecordatoriosEvento');

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  @Cron('*/5 * * * *', { name: 'recordatorio-eventos' })
  async avisar(ahora: Date = new Date()): Promise<number> {
    const desde = new Date(ahora.getTime() + MARGEN_MINIMO_MS);
    const hasta = new Date(ahora.getTime() + VENTANA_AVISO_MS);

    const pendientes = await this.prisma.asistenciaEvento.findMany({
      where: {
        recordatorioAt: null,
        respuesta: { in: ['VOY', 'ME_INTERESA'] },
        evento: { estado: 'PUBLICADO', inicioAt: { gt: desde, lte: hasta } },
      },
      select: {
        id: true,
        userId: true,
        evento: { select: { id: true, titulo: true, lugar: true, inicioAt: true, autorId: true } },
      },
      orderBy: { evento: { inicioAt: 'asc' } },
      take: TOPE_POR_VUELTA,
    });

    let enviados = 0;
    for (const p of pendientes) {
      const marcado = await this.prisma.asistenciaEvento.updateMany({
        where: { id: p.id, recordatorioAt: null },
        data: { recordatorioAt: ahora },
      });
      if (marcado.count !== 1) continue;
      await this.notificaciones.crear({
        userId: p.userId,
        tipo: 'EVENTO_RECORDATORIO',
        texto: textoRecordatorio(p.evento.titulo, p.evento.lugar, p.evento.inicioAt, ahora),
        url: `/eventos/${p.evento.id}`,
      });
      enviados += 1;
    }
    if (enviados > 0) this.log.log(`Recordatorios de eventos enviados: ${enviados}`);
    return enviados;
  }
}
