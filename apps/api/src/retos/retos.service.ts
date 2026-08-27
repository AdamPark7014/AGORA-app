import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CrearReto,
  PuedeRetarResponse,
  ResponderReto,
  RetoAmigo,
  RetosActivosResponse,
  RetosHistorialResponse,
  RetosRankingSemanalResponse,
} from '@agora/contracts';

import { GamificacionService } from '../gamificacion/gamificacion.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type TipoReto = CrearReto['tipo'];

const ETIQUETA_TIPO: Record<TipoReto, string> = {
  RACHA: 'racha',
  SEMANA_PREGUNTA: 'semana de preguntas',
};

@Injectable()
export class RetosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async crear(retadorId: string, datos: CrearReto) {
    const retado = await this.prisma.profile.findUnique({
      where: { handle: datos.retadoHandle.toLowerCase() },
      select: {
        userId: true,
        user: { select: { universityId: true, estado: true } },
      },
    });
    if (!retado || retado.user.estado === 'BAJA') {
      throw new NotFoundException('No existe ese perfil.');
    }
    if (retado.userId === retadorId) {
      throw new BadRequestException('No puedes retarte a ti mismo.');
    }

    const retador = await this.prisma.user.findUnique({
      where: { id: retadorId },
      select: { universityId: true },
    });
    if (!retador) throw new NotFoundException('Usuario no encontrado.');
    if (retador.universityId !== retado.user.universityId) {
      throw new NotFoundException('No existe ese perfil.');
    }

    const bloqueo = await this.prisma.block.findFirst({
      where: {
        soloSilencio: false,
        OR: [
          { bloqueadorId: retadorId, bloqueadoId: retado.userId },
          { bloqueadorId: retado.userId, bloqueadoId: retadorId },
        ],
      },
    });
    if (bloqueo) throw new ForbiddenException('No puedes retar a esta persona.');

    const { puedeRetar, motivo } = await this.evaluarPuedeRetar(retadorId, retado.userId);
    if (!puedeRetar) {
      throw new ForbiddenException(motivo ?? 'Solo puedes retar a quien sigues o compartes comunidad.');
    }

    const duplicado = await this.prisma.retoAmigo.findFirst({
      where: {
        retadorId,
        retadoId: retado.userId,
        estado: { in: ['PENDIENTE', 'ACTIVO'] },
      },
    });
    if (duplicado) {
      throw new ConflictException('Ya tienes un reto pendiente o activo con esa persona.');
    }

    const reto = await this.prisma.retoAmigo.create({
      data: {
        retadorId,
        retadoId: retado.userId,
        tipo: datos.tipo,
      },
      select: { id: true, estado: true },
    });

    const retadorPerfil = await this.prisma.profile.findUnique({
      where: { userId: retadorId },
      select: { nombre: true, apellidos: true },
    });
    if (retadorPerfil) {
      const nombre = `${retadorPerfil.nombre} ${retadorPerfil.apellidos}`;
      void this.notificaciones.crear({
        userId: retado.userId,
        tipo: 'RETO',
        texto: `${nombre} te retó a duelo de ${ETIQUETA_TIPO[datos.tipo]}. ¿Le entras? 🔥`,
        url: '/retos',
        actorId: retadorId,
      });
    }

    return reto;
  }

  async puedePorHandle(retadorId: string, handle: string): Promise<PuedeRetarResponse> {
    const retado = await this.prisma.profile.findUnique({
      where: { handle: handle.toLowerCase() },
      select: {
        userId: true,
        user: { select: { universityId: true, estado: true } },
      },
    });
    if (!retado || retado.user.estado === 'BAJA') {
      throw new NotFoundException('No existe ese perfil.');
    }
    if (retado.userId === retadorId) {
      return { puedeRetar: false, motivo: 'No puedes retarte a ti mismo.' };
    }

    const retador = await this.prisma.user.findUnique({
      where: { id: retadorId },
      select: { universityId: true },
    });
    if (!retador || retador.universityId !== retado.user.universityId) {
      throw new NotFoundException('No existe ese perfil.');
    }

    return this.evaluarPuedeRetar(retadorId, retado.userId);
  }

  async rankingSemanal(userId: string, limite = 5): Promise<RetosRankingSemanalResponse> {
    const yo = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!yo) return { entradas: [] };

    const inicioSemana = this.gamificacion.inicioSemanaIso();

    const retos = await this.prisma.retoAmigo.findMany({
      where: {
        estado: 'ACTIVO',
        activadoAt: { gte: inicioSemana },
        retador: { universityId: yo.universityId, estado: { not: 'BAJA' } },
        retado: { universityId: yo.universityId, estado: { not: 'BAJA' } },
      },
      select: { retadorId: true, retadoId: true, tipo: true },
    });

    const victoriasPorUsuario = new Map<string, number>();

    await Promise.all(
      retos.map(async (reto) => {
        const [puntajeRetador, puntajeRetado] = await Promise.all([
          this.gamificacion.puntajeReto(reto.retadorId, reto.tipo),
          this.gamificacion.puntajeReto(reto.retadoId, reto.tipo),
        ]);
        if (puntajeRetador > puntajeRetado) {
          victoriasPorUsuario.set(
            reto.retadorId,
            (victoriasPorUsuario.get(reto.retadorId) ?? 0) + 1,
          );
        } else if (puntajeRetado > puntajeRetador) {
          victoriasPorUsuario.set(
            reto.retadoId,
            (victoriasPorUsuario.get(reto.retadoId) ?? 0) + 1,
          );
        }
      }),
    );

    const ordenados = [...victoriasPorUsuario.entries()]
      .filter(([, victorias]) => victorias > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limite);

    if (ordenados.length === 0) return { entradas: [] };

    const userIds = ordenados.map(([id]) => id);
    const perfiles = await this.prisma.profile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, handle: true, nombre: true, fotoUrl: true },
    });
    const perfilPorUserId = new Map(perfiles.map((p) => [p.userId, p]));

    return {
      entradas: ordenados.flatMap(([uid, victorias]) => {
        const perfil = perfilPorUserId.get(uid);
        if (!perfil) return [];
        return [
          {
            handle: perfil.handle,
            nombre: perfil.nombre,
            fotoUrl: perfil.fotoUrl,
            victorias,
          },
        ];
      }),
    };
  }

  async activos(userId: string): Promise<RetosActivosResponse> {
    const [pendientesRaw, activosRaw] = await Promise.all([
      this.prisma.retoAmigo.findMany({
        where: { retadoId: userId, estado: 'PENDIENTE' },
        include: this.includePerfiles(),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.retoAmigo.findMany({
        where: {
          estado: 'ACTIVO',
          OR: [{ retadorId: userId }, { retadoId: userId }],
        },
        include: this.includePerfiles(),
        orderBy: { activadoAt: 'desc' },
      }),
    ]);

    const pendientes = await Promise.all(pendientesRaw.map((r) => this.serializarReto(r, false)));
    const activos = await Promise.all(activosRaw.map((r) => this.serializarReto(r, true)));

    return { pendientes, activos };
  }

  async historial(userId: string, cursor?: string, limite = 20): Promise<RetosHistorialResponse> {
    const inicioSemana = this.gamificacion.inicioSemanaIso();

    const rows = await this.prisma.retoAmigo.findMany({
      where: {
        AND: [
          { OR: [{ retadorId: userId }, { retadoId: userId }] },
          {
            OR: [
              { estado: 'RECHAZADO' },
              { estado: 'ACTIVO', activadoAt: { lt: inicioSemana } },
            ],
          },
        ],
      },
      include: this.includePerfiles(),
      orderBy: [{ createdAt: 'desc' }],
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hayMas = rows.length > limite;
    const pagina = hayMas ? rows.slice(0, limite) : rows;

    const items = await Promise.all(
      pagina.map(async (reto) => {
        const base = await this.serializarReto(reto, reto.estado === 'ACTIVO');
        return {
          ...base,
          createdAt: reto.createdAt,
          activadoAt: reto.activadoAt,
          resultado: this.resultadoHistorial(reto, base, userId),
        };
      }),
    );

    return {
      items,
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

  async responder(retoId: string, userId: string, datos: ResponderReto) {
    const reto = await this.prisma.retoAmigo.findUnique({
      where: { id: retoId },
      include: {
        retador: { select: { profile: { select: { handle: true, nombre: true, apellidos: true } } } },
        retado: { select: { profile: { select: { handle: true, nombre: true, apellidos: true } } } },
      },
    });
    if (!reto) throw new NotFoundException('Ese reto no existe.');
    if (reto.retadoId !== userId) throw new ForbiddenException('Solo quien fue retado puede responder.');
    if (reto.estado !== 'PENDIENTE') {
      throw new BadRequestException('Ese reto ya fue respondido.');
    }

    if (!datos.aceptar) {
      await this.prisma.retoAmigo.update({
        where: { id: retoId },
        data: { estado: 'RECHAZADO' },
      });
      return { estado: 'RECHAZADO' as const };
    }

    await this.prisma.retoAmigo.update({
      where: { id: retoId },
      data: { estado: 'ACTIVO', activadoAt: new Date() },
    });

    const retado = reto.retado.profile;
    if (retado) {
      const nombre = `${retado.nombre} ${retado.apellidos}`;
      void this.notificaciones.crear({
        userId: reto.retadorId,
        tipo: 'RETO',
        texto: `${nombre} aceptó tu reto de ${ETIQUETA_TIPO[reto.tipo]}. ¡Que gane el mejor! 🔥`,
        url: '/retos',
        actorId: userId,
      });
    }

    return { estado: 'ACTIVO' as const };
  }

  private resultadoHistorial(
    reto: { estado: 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO'; retadorId: string },
    serializado: RetoAmigo,
    userId: string,
  ): RetosHistorialResponse['items'][number]['resultado'] {
    if (reto.estado === 'RECHAZADO') return 'rechazado';
    const soyRetador = reto.retadorId === userId;
    if (serializado.ganando === 'empate') return 'empate';
    if (serializado.ganando === 'retador') return soyRetador ? 'ganaste' : 'perdiste';
    if (serializado.ganando === 'retado') return soyRetador ? 'perdiste' : 'ganaste';
    return null;
  }

  private includePerfiles() {
    return {
      retador: {
        select: {
          profile: { select: { handle: true, nombre: true, apellidos: true } },
        },
      },
      retado: {
        select: {
          profile: { select: { handle: true, nombre: true, apellidos: true } },
        },
      },
    };
  }

  private async serializarReto(
    reto: {
      id: string;
      retadorId: string;
      retadoId: string;
      tipo: TipoReto;
      estado: 'PENDIENTE' | 'ACTIVO' | 'RECHAZADO';
      retador: { profile: { handle: string; nombre: string; apellidos: string } | null };
      retado: { profile: { handle: string; nombre: string; apellidos: string } | null };
    },
    conPuntajes: boolean,
  ): Promise<RetoAmigo> {
    let puntajeRetador: number | null = null;
    let puntajeRetado: number | null = null;
    let ganando: RetoAmigo['ganando'] = null;

    if (conPuntajes) {
      [puntajeRetador, puntajeRetado] = await Promise.all([
        this.gamificacion.puntajeReto(reto.retadorId, reto.tipo),
        this.gamificacion.puntajeReto(reto.retadoId, reto.tipo),
      ]);
      if (puntajeRetador > puntajeRetado) ganando = 'retador';
      else if (puntajeRetado > puntajeRetador) ganando = 'retado';
      else ganando = 'empate';
    }

    const retadorPerfil = reto.retador.profile;
    const retadoPerfil = reto.retado.profile;

    return {
      id: reto.id,
      retador: retadorPerfil
        ? { handle: retadorPerfil.handle, nombre: `${retadorPerfil.nombre} ${retadorPerfil.apellidos}` }
        : { handle: '', nombre: '' },
      retado: retadoPerfil
        ? { handle: retadoPerfil.handle, nombre: `${retadoPerfil.nombre} ${retadoPerfil.apellidos}` }
        : { handle: '', nombre: '' },
      tipo: reto.tipo,
      estado: reto.estado,
      puntajeRetador,
      puntajeRetado,
      ganando,
    };
  }

  private async evaluarPuedeRetar(
    retadorId: string,
    retadoId: string,
  ): Promise<PuedeRetarResponse> {
    const sigue = await this.prisma.follow.findUnique({
      where: { seguidorId_seguidoId: { seguidorId: retadorId, seguidoId: retadoId } },
    });
    if (sigue) return { puedeRetar: true };

    const misComunidades = await this.prisma.membership.findMany({
      where: { userId: retadorId },
      select: { communityId: true },
    });
    if (misComunidades.length === 0) {
      return {
        puedeRetar: false,
        motivo: 'Solo puedes retar a quien sigues o compartes comunidad.',
      };
    }

    const compartida = await this.prisma.membership.findFirst({
      where: {
        userId: retadoId,
        communityId: { in: misComunidades.map((m) => m.communityId) },
      },
    });
    if (compartida) return { puedeRetar: true };

    return {
      puedeRetar: false,
      motivo: 'Solo puedes retar a quien sigues o compartes comunidad.',
    };
  }
}
