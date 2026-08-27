import { Injectable } from '@nestjs/common';
import type { AnalyticsCrash, AnalyticsEvento } from '@agora/contracts';
import type { Prisma } from '@agora/db';

import { PrismaService } from '../prisma/prisma.service.js';
import { GamificacionService } from '../gamificacion/gamificacion.service.js';

/** Registro normalizado antes de persistir. */
export interface AnalyticsRecord {
  readonly userId: string;
  readonly nombre: string;
  readonly propiedades: Record<string, unknown>;
  readonly clientTimestamp?: Date;
}

/** Interfaz enchufable: hoy Prisma; mañana Amplitude/PostHog sin tocar clientes. */
export interface AnalyticsSink {
  record(evento: AnalyticsRecord): Promise<void>;
}

@Injectable()
export class PrismaAnalyticsSink implements AnalyticsSink {
  constructor(private readonly prisma: PrismaService) {}

  async record(evento: AnalyticsRecord): Promise<void> {
    await this.prisma.analyticsEvent.create({
      data: {
        userId: evento.userId,
        nombre: evento.nombre,
        propiedades: evento.propiedades as Prisma.InputJsonValue,
        clientTimestamp: evento.clientTimestamp,
      },
    });
  }
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly sink: PrismaAnalyticsSink,
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
  ) {}

  async registrar(userId: string, datos: AnalyticsEvento): Promise<void> {
    const clientTimestamp =
      datos.timestamp == null
        ? undefined
        : typeof datos.timestamp === 'number'
          ? new Date(datos.timestamp)
          : new Date(datos.timestamp);

    await this.sink.record({
      userId,
      nombre: datos.nombre,
      propiedades: datos.propiedades ?? {},
      clientTimestamp,
    });

    if (datos.nombre === 'login') {
      await this.gamificacion.registrarActividad(userId);
      await this.gamificacion.evaluarBadges(userId);
    }
  }

  async registrarCrash(userId: string, datos: AnalyticsCrash): Promise<void> {
    await this.sink.record({
      userId,
      nombre: 'crash',
      propiedades: {
        mensaje: datos.mensaje,
        stack: datos.stack ?? null,
        plataforma: datos.plataforma,
        version: datos.version ?? null,
      },
    });
  }

  /** Usuarios con login que vuelven al día siguiente (D1) y a la semana (D7). */
  async retencionD1D7() {
    const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const logins = await this.prisma.analyticsEvent.findMany({
      where: { nombre: 'login', createdAt: { gte: hace7 } },
      select: { userId: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const porUsuario = new Map<string, Date[]>();
    for (const row of logins) {
      const fechas = porUsuario.get(row.userId) ?? [];
      fechas.push(row.createdAt);
      porUsuario.set(row.userId, fechas);
    }

    let cohorte = 0;
    let d1 = 0;
    let d7 = 0;
    const msDia = 24 * 60 * 60 * 1000;

    for (const fechas of porUsuario.values()) {
      fechas.sort((a, b) => a.getTime() - b.getTime());
      const inicio = fechas[0]!;
      cohorte += 1;
      const inicioMs = inicio.getTime();
      if (fechas.some((f) => {
        const diff = f.getTime() - inicioMs;
        return diff >= msDia && diff < 2 * msDia;
      })) {
        d1 += 1;
      }
      if (fechas.some((f) => {
        const diff = f.getTime() - inicioMs;
        return diff >= 7 * msDia && diff < 8 * msDia;
      })) {
        d7 += 1;
      }
    }

    return {
      cohorteUltimos7Dias: cohorte,
      retencionD1: cohorte > 0 ? Math.round((d1 / cohorte) * 1000) / 10 : 0,
      retencionD7: cohorte > 0 ? Math.round((d7 / cohorte) * 1000) / 10 : 0,
      unidad: 'porcentaje',
    };
  }
}
