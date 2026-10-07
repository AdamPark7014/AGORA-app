import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CrearEvento, EditarEvento, EnVivoQuery, ListarEventos, ResponderEvento } from '@agora/contracts';
import { DECISIONES, moderarTexto, type Veredicto } from '@agora/moderation';
import { Prisma } from '@agora/db';

import { PrismaService } from '../prisma/prisma.service.js';
import { moderacionPreviaActiva } from '../comun/moderacion.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { mapearEventoEnVivo, whereEventosEnVivo } from './eventos-en-vivo.js';

const VISIBLES = ['PUBLICADO', 'EN_REVISION'] as const;

@Injectable()
export class EventosService {
  private readonly logger = new Logger(EventosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  private async moderar(texto: string): Promise<Veredicto> {
    if (!moderacionPreviaActiva()) return { decision: DECISIONES.PUBLICAR };
    return moderarTexto(texto, { apiKey: process.env.OPENAI_API_KEY! });
  }

  async crear(userId: string, datos: CrearEvento) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // Un evento que ya paso no le sirve a nadie, y publicarlo solo ensucia el
    // calendario de los demas.
    if (datos.inicioAt.getTime() < Date.now() - 60 * 60 * 1000) {
      throw new BadRequestException('Ese evento ya pasó.');
    }

    let communityId: string | null = null;
    if (datos.comunidadSlug) {
      const comunidad = await this.prisma.community.findFirst({
        where: { slug: datos.comunidadSlug },
      });
      if (!comunidad) throw new NotFoundException('Esa comunidad no existe.');

      const membresia = await this.prisma.membership.findUnique({
        where: { userId_communityId: { userId, communityId: comunidad.id } },
      });
      if (!membresia) throw new ForbiddenException('No perteneces a esa comunidad.');
      communityId = comunidad.id;
    }

    // Titulo y descripcion juntos: una fiesta puede tener titulo inocente y
    // descripcion que cruza la linea, o al reves.
    const veredicto = await this.moderar(`${datos.titulo}\n${datos.descripcion}`);
    if (veredicto.decision === DECISIONES.RETIRAR) {
      throw new BadRequestException(veredicto.motivo ?? 'Ese contenido cruza una línea roja.');
    }

    const evento = await this.prisma.evento.create({
      data: {
        autorId: userId,
        universityId: usuario.universityId,
        communityId,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        tipo: datos.tipo,
        lugar: datos.lugar,
        inicioAt: datos.inicioAt,
        finAt: datos.finAt,
        costoMxn: datos.costoMxn,
        cupo: datos.cupo,
        estado: veredicto.decision === DECISIONES.PUBLICAR_Y_ENCOLAR ? 'EN_REVISION' : 'PUBLICADO',
      },
      select: { id: true, estado: true },
    });

    if (evento.estado === 'PUBLICADO') {
      void this.notificarEventoNuevo(userId, evento.id, datos.titulo, communityId);
    }

    return { ...evento, aviso: veredicto.motivo ?? null };
  }

  private async notificarEventoNuevo(
    autorId: string,
    eventoId: string,
    titulo: string,
    communityId: string | null,
  ) {
    const autor = await this.prisma.profile.findUnique({
      where: { userId: autorId },
      select: { nombre: true, apellidos: true },
    });
    const texto = autor
      ? `${autor.nombre} ${autor.apellidos} organizó: ${titulo}`
      : `Nuevo evento: ${titulo}`;
    const url = `/eventos/${eventoId}`;

    let destinatarios: string[];

    if (communityId) {
      const membresias = await this.prisma.membership.findMany({
        where: { communityId, silenciada: false, userId: { not: autorId } },
        select: { userId: true },
        take: 300,
      });
      destinatarios = membresias.map((m) => m.userId);
    } else {
      const seguidores = await this.prisma.follow.findMany({
        where: { seguidoId: autorId },
        select: { seguidorId: true },
        take: 300,
      });
      destinatarios = seguidores.map((s) => s.seguidorId);
    }

    await Promise.all(
      destinatarios.map((userId) =>
        this.notificaciones.crear({
          userId,
          tipo: 'EVENTO_NUEVO',
          texto,
          url,
          actorId: autorId,
        }),
      ),
    );
  }

  /**
   * Proximos eventos. Solo hacia adelante en el tiempo: un calendario que
   * muestra lo que ya paso obliga a buscar entre ruido lo unico que importa.
   */
  async proximos(userId: string, filtros: ListarEventos) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const membresias = await this.prisma.membership.findMany({
      where: { userId },
      select: { communityId: true, community: { select: { slug: true } } },
    });
    const misComunidades = membresias.map((m) => m.communityId);

    const where: Prisma.EventoWhereInput = {
      universityId: usuario.universityId,
      estado: { in: [...VISIBLES] },
      // Un evento sigue siendo relevante mientras no haya terminado.
      OR: [{ finAt: { gte: new Date() } }, { finAt: null, inicioAt: { gte: new Date() } }],
      // Los abiertos a toda la universidad, mas los de mis comunidades.
      AND: [{ OR: [{ communityId: null }, { communityId: { in: misComunidades } }] }],
    };

    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.comunidadSlug) {
      const elegida = membresias.find((m) => m.community.slug === filtros.comunidadSlug);
      if (!elegida) throw new ForbiddenException('No perteneces a esa comunidad.');
      where.communityId = elegida.communityId;
    }

    const eventos = await this.prisma.evento.findMany({
      where,
      include: {
        autor: { select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } } },
        community: { select: { slug: true, nombre: true } },
        asistencias: { where: { userId }, select: { respuesta: true } },
        _count: { select: { asistencias: { where: { respuesta: 'VOY' } } } },
      },
      orderBy: { inicioAt: 'asc' },
      take: filtros.limite,
    });

    return {
      eventos: eventos.map((e) => ({
        id: e.id,
        titulo: e.titulo,
        descripcion: e.descripcion,
        tipo: e.tipo,
        lugar: e.lugar,
        inicioAt: e.inicioAt,
        finAt: e.finAt,
        costoMxn: e.costoMxn,
        cupo: e.cupo,
        estado: e.estado,
        autor: e.autor.profile
          ? {
              handle: e.autor.profile.handle,
              nombre: `${e.autor.profile.nombre} ${e.autor.profile.apellidos}`,
              fotoUrl: e.autor.profile.fotoUrl,
            }
          : null,
        comunidad: e.community ? { slug: e.community.slug, nombre: e.community.nombre } : null,
        vanAIr: e._count.asistencias,
        miRespuesta: e.asistencias[0]?.respuesta ?? null,
      })),
    };
  }

  /** Eventos en curso o que empiezan pronto en el campus. */
  async enVivo(userId: string, query: EnVivoQuery) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const ahora = new Date();
    const eventos = await this.prisma.evento.findMany({
      where: whereEventosEnVivo(usuario.universityId, ahora, query.horas),
      include: {
        _count: { select: { asistencias: { where: { respuesta: 'VOY' } } } },
      },
      orderBy: { inicioAt: 'asc' },
      take: 30,
    });

    return {
      eventos: eventos.map((e) =>
        mapearEventoEnVivo(
          {
            id: e.id,
            titulo: e.titulo,
            inicioAt: e.inicioAt,
            finAt: e.finAt,
            lugar: e.lugar,
            vanAIr: e._count.asistencias,
          },
          ahora,
        ),
      ),
    };
  }

  async detalle(eventoId: string, userId: string) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const membresias = await this.prisma.membership.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const misComunidades = membresias.map((m) => m.communityId);

    const evento = await this.prisma.evento.findFirst({
      where: {
        id: eventoId,
        universityId: usuario.universityId,
        estado: { in: [...VISIBLES] },
        OR: [{ communityId: null }, { communityId: { in: misComunidades } }],
      },
      include: {
        autor: { select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } } },
        community: { select: { slug: true, nombre: true } },
        asistencias: { where: { userId }, select: { respuesta: true } },
        _count: { select: { asistencias: { where: { respuesta: 'VOY' } } } },
      },
    });
    if (!evento) throw new NotFoundException('Ese evento no existe.');

    return {
      id: evento.id,
      titulo: evento.titulo,
      descripcion: evento.descripcion,
      tipo: evento.tipo,
      lugar: evento.lugar,
      inicioAt: evento.inicioAt,
      finAt: evento.finAt,
      costoMxn: evento.costoMxn,
      cupo: evento.cupo,
      estado: evento.estado,
      esMio: evento.autorId === userId,
      autor: evento.autor.profile
        ? {
            handle: evento.autor.profile.handle,
            nombre: `${evento.autor.profile.nombre} ${evento.autor.profile.apellidos}`,
            fotoUrl: evento.autor.profile.fotoUrl,
          }
        : null,
      comunidad: evento.community ? { slug: evento.community.slug, nombre: evento.community.nombre } : null,
      vanAIr: evento._count.asistencias,
      miRespuesta: evento.asistencias[0]?.respuesta ?? null,
    };
  }

  /** Responder es un interruptor: la misma respuesta otra vez la retira. */
  async responder(eventoId: string, userId: string, datos: ResponderEvento) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { id: true, cupo: true, estado: true },
    });
    if (!evento || !VISIBLES.includes(evento.estado as (typeof VISIBLES)[number])) {
      throw new NotFoundException('Ese evento no existe.');
    }

    const existente = await this.prisma.asistenciaEvento.findUnique({
      where: { eventoId_userId: { eventoId, userId } },
    });

    if (existente?.respuesta === datos.respuesta) {
      await this.prisma.asistenciaEvento.delete({ where: { id: existente.id } });
      return { miRespuesta: null };
    }

    // El cupo solo limita el "voy", no el "me interesa". Con cupo, el conteo y
    // la escritura van bajo candado de la fila del evento: sin el, dos personas
    // que ven el ultimo lugar libre entran las dos.
    if (datos.respuesta === 'VOY' && evento.cupo !== null) {
      const cupo = evento.cupo;
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM eventos WHERE id = ${eventoId} FOR UPDATE`;
        const van = await tx.asistenciaEvento.count({
          where: { eventoId, respuesta: 'VOY', NOT: { userId } },
        });
        if (van >= cupo) throw new BadRequestException('Ya no hay lugares.');
        await tx.asistenciaEvento.upsert({
          where: { eventoId_userId: { eventoId, userId } },
          update: { respuesta: datos.respuesta },
          create: { eventoId, userId, respuesta: datos.respuesta },
        });
      });
      return { miRespuesta: datos.respuesta };
    }

    await this.prisma.asistenciaEvento.upsert({
      where: { eventoId_userId: { eventoId, userId } },
      update: { respuesta: datos.respuesta },
      create: { eventoId, userId, respuesta: datos.respuesta },
    });

    return { miRespuesta: datos.respuesta };
  }

  async borrar(eventoId: string, userId: string) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: { autorId: true },
    });
    if (!evento) throw new NotFoundException('Ese evento no existe.');
    if (evento.autorId !== userId) throw new ForbiddenException('No es tu evento.');

    await this.prisma.evento.update({
      where: { id: eventoId },
      data: { estado: 'BORRADO_POR_AUTOR' },
    });
  }

  async editar(eventoId: string, userId: string, datos: EditarEvento) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      select: {
        autorId: true,
        estado: true,
        titulo: true,
        descripcion: true,
        lugar: true,
        inicioAt: true,
        finAt: true,
      },
    });
    if (!evento || !VISIBLES.includes(evento.estado as (typeof VISIBLES)[number])) {
      throw new NotFoundException('Ese evento no existe.');
    }
    if (evento.autorId !== userId) throw new ForbiddenException('No es tu evento.');

    const inicioAt = datos.inicioAt ?? evento.inicioAt;
    const finAt = datos.finAt !== undefined ? datos.finAt : evento.finAt;
    if (finAt && finAt.getTime() <= inicioAt.getTime()) {
      throw new BadRequestException('El evento no puede terminar antes de empezar.');
    }

    if (datos.inicioAt && datos.inicioAt.getTime() < Date.now() - 60 * 60 * 1000) {
      throw new BadRequestException('Ese evento ya pasó.');
    }

    const titulo = datos.titulo ?? evento.titulo;
    const descripcion = datos.descripcion ?? evento.descripcion;
    if (datos.titulo !== undefined || datos.descripcion !== undefined) {
      const veredicto = await this.moderar(`${titulo}\n${descripcion}`);
      if (veredicto.decision === DECISIONES.RETIRAR) {
        throw new BadRequestException(veredicto.motivo ?? 'Ese contenido cruza una línea roja.');
      }

      const actualizado = await this.prisma.evento.update({
        where: { id: eventoId },
        data: {
          ...(datos.titulo !== undefined ? { titulo: datos.titulo } : {}),
          ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
          ...(datos.lugar !== undefined ? { lugar: datos.lugar } : {}),
          ...(datos.inicioAt !== undefined ? { inicioAt: datos.inicioAt } : {}),
          ...(datos.finAt !== undefined ? { finAt: datos.finAt } : {}),
          estado: veredicto.decision === DECISIONES.PUBLICAR_Y_ENCOLAR ? 'EN_REVISION' : 'PUBLICADO',
        },
        select: { id: true, estado: true },
      });

      return { ...actualizado, aviso: veredicto.motivo ?? null };
    }

    const actualizado = await this.prisma.evento.update({
      where: { id: eventoId },
      data: {
        ...(datos.lugar !== undefined ? { lugar: datos.lugar } : {}),
        ...(datos.inicioAt !== undefined ? { inicioAt: datos.inicioAt } : {}),
        ...(datos.finAt !== undefined ? { finAt: datos.finAt } : {}),
      },
      select: { id: true, estado: true },
    });

    return { ...actualizado, aviso: null };
  }
}
