import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { EnviarMensaje, ListarMensajes } from '@agora/contracts';
import { DECISIONES, moderarTexto } from '@agora/moderation';
import { esStaff } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';
import { moderacionPreviaActiva } from '../comun/moderacion.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { MensajesStreamService } from './mensajes-stream.service.js';
import { hayBloqueo } from '../bloqueos/bloqueos.js';

@Injectable()
export class MensajesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly stream: MensajesStreamService,
  ) {}

  /** Clave estable de una conversacion de dos: ids ordenados y unidos. */
  private claveDirecta(a: string, b: string): string {
    return [a, b].sort().join(':');
  }

  /**
   * Abre —o recupera— la conversacion con alguien.
   *
   * Es idempotente por la clave unica: entrar dos veces al chat de la misma
   * persona devuelve la misma conversacion, no dos hilos paralelos.
   */
  async abrirCon(userId: string, handle: string) {
    const otro = await this.prisma.profile.findUnique({
      where: { handle },
      select: { userId: true, user: { select: { estado: true } } },
    });
    if (!otro) throw new NotFoundException('No existe ese perfil.');
    if (otro.userId === userId) throw new BadRequestException('No puedes escribirte a ti mismo.');
    if (otro.user.estado === 'BAJA') throw new NotFoundException('Esa cuenta ya no esta activa.');

    // Un bloqueo corta la conversacion en los dos sentidos.
    if (await hayBloqueo(this.prisma, userId, otro.userId)) {
      throw new ForbiddenException('No puedes escribirle a esta persona.');
    }

    const clave = this.claveDirecta(userId, otro.userId);

    const existente = await this.prisma.conversation.findUnique({
      where: { claveDirecta: clave },
      select: { id: true },
    });
    if (existente) return { id: existente.id };

    const nueva = await this.prisma.conversation.create({
      data: {
        claveDirecta: clave,
        participantes: {
          create: [{ userId }, { userId: otro.userId }],
        },
      },
      select: { id: true },
    });

    return { id: nueva.id };
  }

  /** Bandeja de entrada, con el ultimo mensaje y cuantos van sin leer. */
  async bandeja(userId: string) {
    const participaciones = await this.prisma.conversationParticipant.findMany({
      where: { userId, salioAt: null },
      include: {
        conversation: {
          include: {
            participantes: {
              where: { userId: { not: userId } },
              include: {
                user: {
                  select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } },
                },
              },
            },
            // Mismo filtro que la conversacion: un mensaje retirado por
            // moderacion o borrado por su autor no puede asomar en la bandeja.
            mensajes: {
              where: { estado: { in: ['PUBLICADO', 'EN_REVISION'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { texto: true, createdAt: true, autorId: true },
            },
          },
        },
      },
      orderBy: { conversation: { ultimoAt: 'desc' } },
      take: 50,
    });

    // Los no leidos se cuentan en una sola consulta agrupada. Hacerlo dentro
    // del bucle serian N consultas por cada vez que alguien abre la bandeja.
    const conversacionIds = participaciones.map((p) => p.conversationId);
    const noLeidos = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversacionIds },
        autorId: { not: userId },
        estado: { in: ['PUBLICADO', 'EN_REVISION'] },
        OR: participaciones.map((p) => ({
          conversationId: p.conversationId,
          createdAt: { gt: p.leidoAt ?? new Date(0) },
        })),
      },
      _count: { _all: true },
    });
    const cuenta = new Map(noLeidos.map((n) => [n.conversationId, n._count._all]));

    return {
      conversaciones: participaciones.map((p) => {
        const otro = p.conversation.participantes[0]?.user.profile ?? null;
        const ultimo = p.conversation.mensajes[0] ?? null;
        return {
          id: p.conversationId,
          con: otro
            ? {
                handle: otro.handle,
                nombre: `${otro.nombre} ${otro.apellidos}`,
                fotoUrl: otro.fotoUrl,
              }
            : null,
          ultimoTexto: ultimo?.texto.slice(0, 120) ?? null,
          ultimoAt: ultimo?.createdAt ?? p.conversation.createdAt,
          mioElUltimo: ultimo?.autorId === userId,
          noLeidos: cuenta.get(p.conversationId) ?? 0,
        };
      }),
    };
  }

  async exigirParticipante(conversationId: string, userId: string) {
    const participante = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participante || participante.salioAt) {
      throw new NotFoundException('Esa conversacion no existe.');
    }
    return participante;
  }

  /** Mensajes de una conversacion. Al leerlos, marca como leido. */
  async mensajes(conversationId: string, userId: string, filtros: ListarMensajes) {
    await this.exigirParticipante(conversationId, userId);

    const participantes = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId }, salioAt: null },
      include: {
        user: {
          select: {
            roles: true,
            profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
          },
        },
      },
      take: 1,
    });
    const otro = participantes[0]?.user.profile;

    const mensajes = await this.prisma.message.findMany({
      where: { conversationId, estado: { in: ['PUBLICADO', 'EN_REVISION'] } },
      include: {
        autor: { select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: filtros.limite + 1,
      ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
    });

    const hayMas = mensajes.length > filtros.limite;
    const pagina = hayMas ? mensajes.slice(0, filtros.limite) : mensajes;

    // Solo se escribe si hay algo sin leer: con el chat abierto esta consulta
    // se repite, y antes cada repeticion era un UPDATE aunque no cambiara nada.
    const masNuevo = filtros.cursor ? undefined : mensajes[0];
    if (masNuevo) {
      await this.prisma.conversationParticipant.updateMany({
        where: {
          conversationId,
          userId,
          OR: [{ leidoAt: null }, { leidoAt: { lt: masNuevo.createdAt } }],
        },
        data: { leidoAt: new Date() },
      });
    }

    return {
      con: otro
        ? {
            handle: otro.handle,
            nombre: `${otro.nombre} ${otro.apellidos}`,
            fotoUrl: otro.fotoUrl,
            verificado: esStaff(participantes[0]!.user.roles),
          }
        : null,
      // Se devuelven en orden cronologico aunque se consulten al reves: la
      // consulta va descendente para poder paginar hacia atras.
      mensajes: pagina.reverse().map((m) => ({
        id: m.id,
        texto: m.texto,
        createdAt: m.createdAt,
        mio: m.autorId === userId,
        autor: m.autor.profile
          ? {
              handle: m.autor.profile.handle,
              nombre: `${m.autor.profile.nombre} ${m.autor.profile.apellidos}`,
              fotoUrl: m.autor.profile.fotoUrl,
            }
          : null,
      })),
      siguienteCursor: hayMas ? (pagina[0]?.id ?? null) : null,
    };
  }

  async enviar(conversationId: string, userId: string, datos: EnviarMensaje) {
    await this.exigirParticipante(conversationId, userId);

    // Revisar el bloqueo solo al abrir la conversacion no basta: si ya existia,
    // quien fue bloqueado podia seguir escribiendo en ella.
    const otrosParticipantes = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId } },
      select: { userId: true },
    });
    for (const otro of otrosParticipantes) {
      if (await hayBloqueo(this.prisma, userId, otro.userId)) {
        throw new ForbiddenException('No puedes escribirle a esta persona.');
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && moderacionPreviaActiva()) {
      const veredicto = await moderarTexto(datos.texto, { apiKey });
      if (veredicto.decision === DECISIONES.RETIRAR) {
        throw new BadRequestException(veredicto.motivo ?? 'Ese mensaje cruza una linea roja.');
      }
    }

    const [mensaje] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: { conversationId, autorId: userId, texto: datos.texto },
        select: {
          id: true,
          createdAt: true,
          texto: true,
          autorId: true,
          autor: {
            select: {
              profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
            },
          },
        },
      }),
      // `ultimoAt` ordena la bandeja. Si se actualizara aparte, un fallo
      // dejaria conversaciones vivas hundidas al fondo de la lista.
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { ultimoAt: new Date() },
      }),
      this.prisma.conversationParticipant.update({
        where: { conversationId_userId: { conversationId, userId } },
        data: { leidoAt: new Date() },
      }),
    ]);

    const otros = await this.prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: userId }, salioAt: null },
      select: { userId: true },
    });
    const quien = await this.prisma.profile.findUnique({
      where: { userId },
      select: { nombre: true },
    });
    for (const otro of otros) {
      void this.notificaciones.crear({
        userId: otro.userId,
        actorId: userId,
        tipo: 'MENSAJE',
        texto: `${quien?.nombre ?? 'Alguien'} te escribió`,
        url: `/mensajes/${conversationId}`,
      });
    }

    const perfil = mensaje.autor.profile;
    this.stream.emitir(conversationId, {
      tipo: 'mensaje',
      mensaje: {
        id: mensaje.id,
        texto: mensaje.texto,
        createdAt: mensaje.createdAt,
        autorId: mensaje.autorId,
        autor: perfil
          ? {
              handle: perfil.handle,
              nombre: `${perfil.nombre} ${perfil.apellidos}`,
              fotoUrl: perfil.fotoUrl,
            }
          : null,
      },
    });

    return { id: mensaje.id, createdAt: mensaje.createdAt };
  }

  /** Total de mensajes sin leer. Alimenta el globo del encabezado. */
  async noLeidos(userId: string): Promise<{ total: number }> {
    const participaciones = await this.prisma.conversationParticipant.findMany({
      where: { userId, salioAt: null },
      select: { conversationId: true, leidoAt: true },
    });
    if (participaciones.length === 0) return { total: 0 };

    const total = await this.prisma.message.count({
      where: {
        autorId: { not: userId },
        OR: participaciones.map((p) => ({
          conversationId: p.conversationId,
          createdAt: { gt: p.leidoAt ?? new Date(0) },
        })),
      },
    });

    return { total };
  }
}
