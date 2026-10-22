import { Injectable, Logger } from '@nestjs/common';
import type { TipoNotificacion } from '@agora/db';

import { PrismaService } from '../prisma/prisma.service.js';
import { PushService } from '../push/push.service.js';
import { enSegundoPlano } from '../comun/segundo-plano.js';
import { NotificacionesStreamService } from './notificaciones-stream.service.js';
import { callarAvisoDe } from '../bloqueos/bloqueos.js';

const TIPOS: TipoNotificacion[] = [
  'COMENTARIO',
  'REACCION',
  'MENSAJE',
  'EVENTO_NUEVO',
  'EVENTO_RECORDATORIO',
  'AVENTON_APARTADO',
  'AVENTON_CANCELADO',
  'AVENTON_RECORDATORIO',
  'MODERACION',
  'MENCION',
  'SEGUIDOR',
  'INSIGNIA',
  'RETO',
];

const PUSH_OFF_POR_DEFECTO: TipoNotificacion[] = ['EVENTO_NUEVO'];

/**
 * Notificaciones dentro de la app.
 *
 * Regla que manda sobre todo lo demás: **solo hechos dirigidos a la persona**.
 * Te comentaron, te reaccionaron, tomaron tu aventón, moderaron tu contenido.
 * Nunca "mira lo nuevo del feed".
 */
@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly stream: NotificacionesStreamService,
  ) {}

  private async permitido(userId: string, tipo: TipoNotificacion, canal: 'inApp' | 'push') {
    const pref = await this.prisma.preferenciaNotificacion.findUnique({
      where: { userId_tipo: { userId, tipo } },
    });
    if (!pref) {
      if (canal === 'push' && PUSH_OFF_POR_DEFECTO.includes(tipo)) return false;
      return true;
    }
    return canal === 'inApp' ? pref.inApp : pref.push;
  }

  async crear(datos: {
    userId: string;
    tipo: TipoNotificacion;
    texto: string;
    url: string;
    actorId?: string;
  }): Promise<void> {
    if (datos.actorId === datos.userId) return;

    // Todo dentro del try: este metodo se llama sin await desde muchos sitios,
    // y un rechazo que se escape aqui tumba el proceso entero.
    try {
      if (datos.actorId && (await callarAvisoDe(this.prisma, datos.userId, datos.actorId))) return;

      const inApp = await this.permitido(datos.userId, datos.tipo, 'inApp');
      if (!inApp) return;

      await this.prisma.notificacion.create({ data: datos });
      const push = await this.permitido(datos.userId, datos.tipo, 'push');
      if (push) {
        enSegundoPlano(
          this.push.enviar(datos.userId, {
            titulo: 'Ágora',
            cuerpo: datos.texto,
            url: datos.url,
            tipo: datos.tipo,
          }),
          this.logger,
          'Push',
        );
      }
      const { total } = await this.sinLeer(datos.userId);
      this.stream.emitir(datos.userId, { tipo: 'actualizacion', total });
    } catch (error) {
      this.logger.warn(
        `No se pudo crear notificación: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async listar(userId: string, cursor?: string, limite = 30) {
    const notificaciones = await this.prisma.notificacion.findMany({
      where: { userId },
      include: {
        actor: { select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hayMas = notificaciones.length > limite;
    const pagina = hayMas ? notificaciones.slice(0, limite) : notificaciones;

    return {
      notificaciones: pagina.map((n) => ({
        id: n.id,
        tipo: n.tipo,
        texto: n.texto,
        url: n.url,
        leida: n.leidoAt !== null,
        createdAt: n.createdAt,
        actor: n.actor?.profile
          ? {
              handle: n.actor.profile.handle,
              nombre: `${n.actor.profile.nombre} ${n.actor.profile.apellidos}`,
              fotoUrl: n.actor.profile.fotoUrl,
            }
          : null,
      })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

  async preferencias(userId: string) {
    const guardadas = await this.prisma.preferenciaNotificacion.findMany({ where: { userId } });
    const porTipo = new Map(guardadas.map((p) => [p.tipo, p]));

    return {
      preferencias: TIPOS.map((tipo) => {
        const p = porTipo.get(tipo);
        return {
          tipo,
          inApp: p?.inApp ?? true,
          push: p?.push ?? !PUSH_OFF_POR_DEFECTO.includes(tipo),
        };
      }),
    };
  }

  async actualizarPreferencias(
    userId: string,
    cambios: Array<{ tipo: TipoNotificacion; inApp: boolean; push: boolean }>,
  ) {
    await Promise.all(
      cambios.map((c) =>
        this.prisma.preferenciaNotificacion.upsert({
          where: { userId_tipo: { userId, tipo: c.tipo } },
          create: { userId, tipo: c.tipo, inApp: c.inApp, push: c.push },
          update: { inApp: c.inApp, push: c.push },
        }),
      ),
    );
    return this.preferencias(userId);
  }

  async sinLeer(userId: string): Promise<{ total: number }> {
    const total = await this.prisma.notificacion.count({
      where: { userId, leidoAt: null },
    });
    return { total };
  }

  async marcarLeidas(userId: string): Promise<void> {
    await this.prisma.notificacion.updateMany({
      where: { userId, leidoAt: null },
      data: { leidoAt: new Date() },
    });
    this.stream.emitir(userId, { tipo: 'actualizacion', total: 0 });
  }

  async cumplenHoy(userId: string) {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const dia = hoy.getDate();

    const misComunidades = await this.prisma.membership.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const ids = misComunidades.map((m) => m.communityId);
    if (ids.length === 0) return { cumples: [] };

    const perfiles = await this.prisma.profile.findMany({
      where: {
        cumpleMes: mes,
        cumpleDia: dia,
        userId: { not: userId },
        user: {
          estado: 'ACTIVO',
          memberships: { some: { communityId: { in: ids } } },
        },
      },
      select: { handle: true, nombre: true, apellidos: true, fotoUrl: true },
      take: 10,
    });

    return {
      cumples: perfiles.map((p) => ({
        handle: p.handle,
        nombre: `${p.nombre} ${p.apellidos}`,
        fotoUrl: p.fotoUrl,
      })),
    };
  }
}
