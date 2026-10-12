import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BADGES_CAMPUS,
  mensajeNuevaInsignia,
  type BadgeCodigo,
  type GamificacionPingResponse,
  type GamificacionResponse,
  type LeaderboardResponse,
} from '@agora/contracts';

import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const META_SEMANA_PREGUNTA = 7 as const;
const TITULO_RETO_SEMANAL = 'Reto semanal: 7 preguntas' as const;

@Injectable()
export class GamificacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * Medianoche UTC del día calendario en America/Mexico_City.
   *
   * Misma idea que PreguntaService.hoy(): la columna es `@db.Date` y Prisma
   * devuelve medianoche UTC; el corte debe ser medianoche del campus, no del
   * servidor.
   */
  private hoy(): Date {
    const partes = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const [year, month, day] = partes.split('-').map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  private diaAnterior(fecha: Date): Date {
    return new Date(fecha.getTime() - 86_400_000);
  }

  /** Lunes 00:00 de la semana ISO actual (calendario campus). */
  inicioSemanaIso(): Date {
    return this.semanaIsoRango().inicio;
  }

  /** Lunes 00:00 — lunes siguiente 00:00 (ISO, calendario campus). */
  private semanaIsoRango(): { inicio: Date; fin: Date } {
    const hoy = this.hoy();
    const isoDow = hoy.getUTCDay() === 0 ? 7 : hoy.getUTCDay();
    const inicio = new Date(hoy.getTime() - (isoDow - 1) * 86_400_000);
    const fin = new Date(inicio.getTime() + 7 * 86_400_000);
    return { inicio, fin };
  }

  /** Registra actividad del día y actualiza la racha consecutiva. */
  async registrarActividad(userId: string): Promise<void> {
    const hoy = this.hoy();
    const existente = await this.prisma.userStreak.findUnique({ where: { userId } });

    if (!existente) {
      await this.prisma.userStreak.create({
        data: {
          userId,
          rachaActual: 1,
          rachaMaxima: 1,
          ultimoDiaActivo: hoy,
        },
      });
      return;
    }

    const ultimo = existente.ultimoDiaActivo;
    if (ultimo?.getTime() === hoy.getTime()) return;

    const ayer = this.diaAnterior(hoy);
    const rachaActual =
      ultimo?.getTime() === ayer.getTime() ? existente.rachaActual + 1 : 1;
    const rachaMaxima = Math.max(existente.rachaMaxima, rachaActual);

    await this.prisma.userStreak.update({
      where: { userId },
      data: { rachaActual, rachaMaxima, ultimoDiaActivo: hoy },
    });
  }

  /** Evalúa condiciones y otorga badges pendientes. Devuelve códigos recién otorgados. */
  async evaluarBadges(userId: string): Promise<BadgeCodigo[]> {
    const [diasPregunta, respondidasSemana, aventones, posts, streak] = await Promise.all([
      this.contarDiasPregunta(userId),
      this.contarSemanaPregunta(userId),
      this.prisma.aventon.count({ where: { conductorId: userId } }),
      // La insignia es publica: contar las anonimas delataria a su autor.
      this.prisma.post.count({ where: { authorId: userId, anonimo: false } }),
      this.prisma.userStreak.findUnique({ where: { userId } }),
    ]);

    const candidatos: BadgeCodigo[] = [];
    if (diasPregunta >= 7) candidatos.push('PREGUNTA_7');
    if (respondidasSemana >= 7) candidatos.push('SEMANA_PERFECTA');
    if (aventones >= 3) candidatos.push('AVENTONERO');
    if ((streak?.rachaActual ?? 0) >= 7) candidatos.push('EARLY_BIRD');
    if (posts >= 10) candidatos.push('SOCIAL');

    if (candidatos.length === 0) return [];

    const existentes = await this.prisma.userBadge.findMany({
      where: { userId, codigo: { in: candidatos } },
      select: { codigo: true },
    });
    const yaTiene = new Set(existentes.map((b) => b.codigo));
    const nuevas = candidatos.filter((c) => !yaTiene.has(c));
    if (nuevas.length === 0) return [];

    await Promise.all(
      nuevas.map((codigo) =>
        this.prisma.userBadge.create({ data: { userId, codigo } }),
      ),
    );

    await Promise.all(
      nuevas.map((codigo) =>
        this.notificaciones.crear({
          userId,
          tipo: 'INSIGNIA',
          texto: mensajeNuevaInsignia(codigo),
          url: '/perfil/mio',
        }),
      ),
    );

    return nuevas;
  }

  /** Registra actividad de hoy, evalúa insignias y devuelve estado actualizado. */
  async ping(userId: string): Promise<GamificacionPingResponse> {
    await this.registrarActividad(userId);
    const nuevasInsignias = await this.evaluarBadges(userId);
    const gamificacion = await this.obtener(userId);
    return { nuevasInsignias, gamificacion };
  }

  /** Top rachas del campus (misma universidad), mínimo 2 días seguidos. */
  async leaderboard(userId: string, limite = 5): Promise<LeaderboardResponse> {
    const [yo, miStreak] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { universityId: true },
      }),
      this.prisma.userStreak.findUnique({
        where: { userId },
        select: { rachaActual: true, rachaMaxima: true },
      }),
    ]);
    if (!yo) return { entradas: [], miPosicion: null };

    const filtroCampus = {
      universityId: yo.universityId,
      estado: { not: 'BAJA' as const },
      profile: { isNot: null },
    };

    const [streaks, miPosicion] = await Promise.all([
      this.prisma.userStreak.findMany({
        where: {
          rachaActual: { gte: 2 },
          user: filtroCampus,
        },
        orderBy: [{ rachaActual: 'desc' }, { rachaMaxima: 'desc' }],
        take: limite,
        select: {
          rachaActual: true,
          user: {
            select: {
              profile: {
                select: { handle: true, nombre: true, fotoUrl: true },
              },
            },
          },
        },
      }),
      this.calcularMiPosicion(userId, miStreak, filtroCampus),
    ]);

    return {
      entradas: streaks
        .filter((s) => s.user.profile)
        .map((s) => ({
          handle: s.user.profile!.handle,
          nombre: s.user.profile!.nombre,
          fotoUrl: s.user.profile!.fotoUrl,
          rachaActual: s.rachaActual,
        })),
      miPosicion,
    };
  }

  /** Rachas e insignias públicas de un perfil (misma universidad). */
  async porHandle(solicitanteId: string, handle: string): Promise<GamificacionResponse> {
    const perfil = await this.prisma.profile.findUnique({
      where: { handle: handle.toLowerCase() },
      select: {
        userId: true,
        user: { select: { universityId: true, estado: true } },
      },
    });
    if (!perfil || perfil.user.estado === 'BAJA') {
      throw new NotFoundException('No existe ese perfil.');
    }

    const yo = await this.prisma.user.findUnique({
      where: { id: solicitanteId },
      select: { universityId: true },
    });
    if (!yo || yo.universityId !== perfil.user.universityId) {
      throw new NotFoundException('No existe ese perfil.');
    }

    return this.obtenerPublico(perfil.userId);
  }

  /** Rachas y badges del usuario autenticado. */
  async obtener(userId: string): Promise<GamificacionResponse> {
    const [streak, badges, respondidasSemana, yo, duelosGanados] = await Promise.all([
      this.prisma.userStreak.findUnique({ where: { userId } }),
      this.prisma.userBadge.findMany({
        where: { userId },
        orderBy: { otorgadoAt: 'asc' },
      }),
      this.contarSemanaPregunta(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { universityId: true },
      }),
      this.contarDuelosGanados(userId),
    ]);

    const tuRacha = streak?.rachaActual ?? 0;
    const comparacionCampus = yo
      ? await this.comparacionCampus(yo.universityId, tuRacha)
      : { promedioRacha: 0, tuRacha, porEncimaDelPromedio: false };

    return {
      rachaActual: tuRacha,
      rachaMaxima: streak?.rachaMaxima ?? 0,
      badges: badges.map((b) => {
        const def = BADGES_CAMPUS[b.codigo as BadgeCodigo];
        return {
          codigo: b.codigo as BadgeCodigo,
          etiqueta: def?.etiqueta ?? b.codigo,
          emoji: def?.emoji ?? '🏅',
          otorgadoAt: b.otorgadoAt,
        };
      }),
      semanaPregunta: { respondidas: respondidasSemana, meta: META_SEMANA_PREGUNTA },
      retoSemanal: this.retoSemanal(respondidasSemana),
      comparacionCampus,
      duelosGanados,
    };
  }

  /** Solo campos públicos (sin progreso semanal privado). */
  private async obtenerPublico(userId: string): Promise<GamificacionResponse> {
    const [streak, badges, duelosGanados] = await Promise.all([
      this.prisma.userStreak.findUnique({ where: { userId } }),
      this.prisma.userBadge.findMany({
        where: { userId },
        orderBy: { otorgadoAt: 'asc' },
      }),
      this.contarDuelosGanados(userId),
    ]);

    return {
      rachaActual: streak?.rachaActual ?? 0,
      rachaMaxima: streak?.rachaMaxima ?? 0,
      badges: badges.map((b) => {
        const def = BADGES_CAMPUS[b.codigo as BadgeCodigo];
        return {
          codigo: b.codigo as BadgeCodigo,
          etiqueta: def?.etiqueta ?? b.codigo,
          emoji: def?.emoji ?? '🏅',
          otorgadoAt: b.otorgadoAt,
        };
      }),
      duelosGanados,
    };
  }

  /** Días distintos con respuesta a la pregunta del día (modelo RespuestaPregunta). */
  private async contarDiasPregunta(userId: string): Promise<number> {
    const respuestas = await this.prisma.respuestaPregunta.findMany({
      where: { userId },
      select: { pregunta: { select: { fecha: true } } },
    });
    return new Set(respuestas.map((r) => r.pregunta.fecha.getTime())).size;
  }

  private retoSemanal(respondidas: number) {
    return {
      titulo: TITULO_RETO_SEMANAL,
      progreso: respondidas,
      meta: META_SEMANA_PREGUNTA,
      completado: respondidas >= META_SEMANA_PREGUNTA,
    };
  }

  /** Promedio de rachaActual en el campus (usuarios activos con racha > 0). */
  private async comparacionCampus(universityId: string, tuRacha: number) {
    const agg = await this.prisma.userStreak.aggregate({
      where: {
        rachaActual: { gt: 0 },
        user: {
          universityId,
          estado: { not: 'BAJA' },
        },
      },
      _avg: { rachaActual: true },
    });
    const promedioRacha = agg._avg.rachaActual ?? 0;
    return {
      promedioRacha,
      tuRacha,
      porEncimaDelPromedio: tuRacha > promedioRacha,
    };
  }

  /** Posición 1-based en el ranking del campus; null si racha < 2. */
  private async calcularMiPosicion(
    userId: string,
    miStreak: { rachaActual: number; rachaMaxima: number } | null,
    filtroCampus: {
      universityId: string;
      estado: { not: 'BAJA' };
      profile: { isNot: null };
    },
  ): Promise<number | null> {
    const miRacha = miStreak?.rachaActual ?? 0;
    if (miRacha < 2) return null;

    const porDelante = await this.prisma.userStreak.count({
      where: {
        userId: { not: userId },
        user: filtroCampus,
        OR: [
          { rachaActual: { gt: miRacha } },
          {
            rachaActual: miRacha,
            rachaMaxima: { gt: miStreak?.rachaMaxima ?? 0 },
          },
        ],
      },
    });

    return porDelante + 1;
  }

  /** Días distintos respondidos en la semana ISO actual (America/Mexico_City). */
  private async contarSemanaPregunta(userId: string): Promise<number> {
    const { inicio, fin } = this.semanaIsoRango();
    const respuestas = await this.prisma.respuestaPregunta.findMany({
      where: {
        userId,
        pregunta: { fecha: { gte: inicio, lt: fin } },
      },
      select: { pregunta: { select: { fecha: true } } },
    });
    return new Set(respuestas.map((r) => r.pregunta.fecha.getTime())).size;
  }

  /** Puntaje en vivo para un reto entre amigos (racha o semana de pregunta). */
  async puntajeReto(userId: string, tipo: 'RACHA' | 'SEMANA_PREGUNTA'): Promise<number> {
    if (tipo === 'RACHA') {
      const streak = await this.prisma.userStreak.findUnique({ where: { userId } });
      return streak?.rachaActual ?? 0;
    }
    return this.contarSemanaPregunta(userId);
  }

  /** Duelos activos donde el usuario va ganando al rival. */
  private async contarDuelosGanados(userId: string): Promise<number> {
    const retos = await this.prisma.retoAmigo.findMany({
      where: {
        estado: 'ACTIVO',
        OR: [{ retadorId: userId }, { retadoId: userId }],
      },
      select: { retadorId: true, retadoId: true, tipo: true },
    });

    let ganados = 0;
    for (const reto of retos) {
      const [puntajeRetador, puntajeRetado] = await Promise.all([
        this.puntajeReto(reto.retadorId, reto.tipo),
        this.puntajeReto(reto.retadoId, reto.tipo),
      ]);
      const miPuntaje = reto.retadorId === userId ? puntajeRetador : puntajeRetado;
      const suPuntaje = reto.retadorId === userId ? puntajeRetado : puntajeRetador;
      if (miPuntaje > suPuntaje) ganados++;
    }
    return ganados;
  }
}
