import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { ActualizarPerfil, CrearPerfil } from '@agora/contracts';
import { esStaff } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';

@Injectable()
export class PerfilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /**
   * Crea el perfil y lo mete de inmediato en sus comunidades.
   *
   * La sincronizacion no es un extra: sin ella el usuario termina el registro
   * y abre un feed vacio, que es donde mueren las redes sociales nuevas.
   */
  async crear(userId: string, datos: CrearPerfil): Promise<{ handle: string; comunidades: number }> {
    const yaTiene = await this.prisma.profile.findUnique({ where: { userId } });
    if (yaTiene) throw new ConflictException('Ya tienes un perfil.');

    const carrera = await this.prisma.carrera.findFirst({
      where: { slug: datos.carreraSlug },
      include: { escuela: true, departamento: true },
    });
    if (!carrera) throw new BadRequestException('Esa carrera no existe en el catalogo.');

    // El departamento sale de la carrera, no del formulario. Preguntarlo hacia
    // que casi nadie lo llenara y la comunidad del departamento nacia muerta.
    const departamento = carrera.departamento;

    const colegio = datos.colegioSlug
      ? await this.prisma.colegioResidencial.findUnique({ where: { slug: datos.colegioSlug } })
      : null;
    if (datos.colegioSlug && !colegio) {
      throw new BadRequestException('Ese colegio residencial no existe.');
    }

    const handleTomado = await this.prisma.profile.findUnique({ where: { handle: datos.handle } });
    if (handleTomado) throw new ConflictException('Ese nombre de usuario ya esta tomado.');

    await this.prisma.$transaction([
      this.prisma.profile.create({
        data: {
          userId,
          handle: datos.handle,
          nombre: datos.nombre,
          apellidos: datos.apellidos,
          bio: datos.bio,
          generacion: datos.generacion,
          carreraId: carrera.id,
          departamentoId: departamento?.id,
          colegioId: colegio?.id,
        },
      }),
      this.prisma.user.update({ where: { id: userId }, data: { estado: 'ACTIVO' } }),
    ]);

    const comunidades = await this.auth.sincronizarComunidades(userId);
    return { handle: datos.handle, comunidades };
  }

  /**
   * Ajustes del propio perfil: foto, bio y cumpleanos.
   *
   * La foto llega como id de una imagen ya subida por /media, igual que en el
   * marketplace: se comprueba que este libre para que nadie pueda apropiarse
   * de la imagen de otro.
   */
  async actualizar(userId: string, datos: ActualizarPerfil) {
    const perfil = await this.prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!perfil) throw new NotFoundException('Todavia no tienes perfil.');

    // Foto y portada siguen la misma regla: se acepta el id de una imagen ya
    // subida y todavia sin dueno, para que nadie pueda apropiarse de la de otro.
    const resolver = async (mediaId: string | null | undefined) => {
      if (mediaId === null) return null;
      if (!mediaId) return undefined;
      const media = await this.prisma.media.findFirst({
        where: { id: mediaId, postId: null, anuncioId: null, ownerId: userId },
        select: { url: true },
      });
      if (!media) throw new BadRequestException('Esa imagen ya no esta disponible.');
      return media.url;
    };

    const fotoUrl = await resolver(datos.fotoMediaId);
    const portadaUrl = await resolver(datos.portadaMediaId);

    await this.prisma.profile.update({
      where: { userId },
      data: {
        ...(datos.bio !== undefined ? { bio: datos.bio } : {}),
        ...(fotoUrl !== undefined ? { fotoUrl } : {}),
        ...(portadaUrl !== undefined ? { portadaUrl } : {}),
        ...(datos.cumpleMes !== undefined ? { cumpleMes: datos.cumpleMes } : {}),
        ...(datos.cumpleDia !== undefined ? { cumpleDia: datos.cumpleDia } : {}),
        ...(datos.ciudadOrigen !== undefined ? { ciudadOrigen: datos.ciudadOrigen } : {}),
        ...(datos.instagram !== undefined
          ? { instagram: datos.instagram === '' ? null : datos.instagram }
          : {}),
        ...(datos.intereses !== undefined ? { intereses: datos.intereses } : {}),
        ...(datos.busco !== undefined ? { busco: datos.busco } : {}),
        ...(datos.visibilidad !== undefined ? { visibilidad: datos.visibilidad } : {}),
      },
    });

    return { ok: true };
  }

  /** Datos propios para la pantalla de ajustes. */
  async mio(userId: string) {
    const perfil = await this.prisma.profile.findUnique({
      where: { userId },
      select: {
        handle: true,
        nombre: true,
        apellidos: true,
        bio: true,
        fotoUrl: true,
        portadaUrl: true,
        cumpleMes: true,
        cumpleDia: true,
        ciudadOrigen: true,
        instagram: true,
        intereses: true,
        busco: true,
        visibilidad: true,
      },
    });
    if (!perfil) throw new NotFoundException('Todavia no tienes perfil.');
    return perfil;
  }

  /**
   * Seguir a alguien. Interruptor: volver a llamarlo deja de seguir.
   *
   * `Follow` ya existia en el esquema desde el dia 1 pero nunca se habia
   * expuesto; es lo que convierte el directorio en un grafo de verdad.
   */
  async alternarSeguir(userId: string, handle: string) {
    const otro = await this.prisma.profile.findUnique({
      where: { handle },
      select: { userId: true },
    });
    if (!otro) throw new NotFoundException('No existe ese perfil.');
    if (otro.userId === userId) throw new BadRequestException('No puedes seguirte a ti mismo.');

    const existente = await this.prisma.follow.findUnique({
      where: { seguidorId_seguidoId: { seguidorId: userId, seguidoId: otro.userId } },
    });

    if (existente) {
      await this.prisma.follow.delete({ where: { id: existente.id } });
      return { siguiendo: false };
    }

    await this.prisma.follow.create({
      data: { seguidorId: userId, seguidoId: otro.userId },
    });

    const seguidor = await this.prisma.profile.findUnique({
      where: { userId },
      select: { nombre: true, apellidos: true, handle: true },
    });
    if (seguidor) {
      void this.notificaciones.crear({
        userId: otro.userId,
        tipo: 'SEGUIDOR',
        texto: `${seguidor.nombre} ${seguidor.apellidos} empezó a seguirte`,
        url: `/perfil/${seguidor.handle}`,
        actorId: userId,
      });
    }

    return { siguiendo: true };
  }

  /** Publicaciones de una persona, para la pestana de su perfil. */
  async publicacionesDe(handle: string, solicitanteId: string, cursor?: string, limite = 20) {
    const perfil = await this.perfilParaListas(handle, solicitanteId);
    if (perfil.restringido) return { publicaciones: [], siguienteCursor: null };

    // Solo lo publicado en comunidades a las que el solicitante pertenece: un
    // perfil no puede ser una puerta trasera al contenido de otra comunidad.
    const mias = await this.prisma.membership.findMany({
      where: { userId: solicitanteId },
      select: { communityId: true },
    });

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: perfil.userId,
        estado: { in: ['PUBLICADO', 'EN_REVISION'] },
        communityId: { in: mias.map((m) => m.communityId) },
        anonimo: false,
      },
      include: {
        community: { select: { nombre: true } },
        media: { select: { url: true, mime: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hayMas = posts.length > limite;
    const pagina = hayMas ? posts.slice(0, limite) : posts;

    return {
      publicaciones: pagina.map((p) => ({
        id: p.id,
        texto: p.texto,
        createdAt: p.createdAt,
        comunidad: p.community.nombre,
        numComments: p.numComments,
        numReactions: p.numReactions,
        media: p.media.map((m) => ({
          url: m.url,
          esVideo: m.mime.startsWith('video/'),
        })),
      })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

  /**
   * Perfil publico.
   *
   * Si el perfil esta en modo COMUNIDADES, solo lo ve completo quien comparta
   * alguna comunidad. A los demas se les devuelve lo minimo —nombre, handle y
   * carrera— para que el directorio siga siendo util sin exponer lo personal.
   */
  async porHandle(handle: string, solicitanteId?: string) {
    const perfil = await this.prisma.profile.findUnique({
      where: { handle },
      include: {
        carrera: { include: { escuela: true } },
        departamento: true,
        colegio: true,
        user: { select: { id: true, estado: true, lastSeenAt: true, roles: true } },
      },
    });
    if (!perfil || perfil.user.estado === 'BAJA') throw new NotFoundException('No existe ese perfil.');

    // Visibilidad: se resuelve ANTES de armar la respuesta, no filtrando
    // campos en el cliente.
    let restringido = perfil.visibilidad === 'COMUNIDADES';
    if (solicitanteId) {
      ({ restringido } = await this.acceso(
        { userId: perfil.userId, visibilidad: perfil.visibilidad, estado: perfil.user.estado },
        solicitanteId,
      ));
    }

    let yoLeSigo = false;
    if (solicitanteId && solicitanteId !== perfil.userId) {
      const sigue = await this.prisma.follow.findUnique({
        where: {
          seguidorId_seguidoId: { seguidorId: solicitanteId, seguidoId: perfil.userId },
        },
      });
      yoLeSigo = Boolean(sigue);
    }

    if (restringido) {
      return {
        handle: perfil.handle,
        nombre: perfil.nombre,
        apellidos: perfil.apellidos,
        carrera: perfil.carrera?.nombre ?? null,
        escuela: perfil.carrera?.escuela.nombre ?? null,
        fotoUrl: perfil.fotoUrl,
        restringido: true as const,
        yoLeSigo,
        verificado: esStaff(perfil.user.roles),
      };
    }

    const [seguidores, siguiendo, publicaciones] = await Promise.all([
      this.prisma.follow.count({ where: { seguidoId: perfil.userId } }),
      this.prisma.follow.count({ where: { seguidorId: perfil.userId } }),
      this.prisma.post.count({
        where: { authorId: perfil.userId, estado: { in: ['PUBLICADO', 'EN_REVISION'] } },
      }),
    ]);

    return {
      handle: perfil.handle,
      nombre: perfil.nombre,
      apellidos: perfil.apellidos,
      bio: perfil.bio,
      fotoUrl: perfil.fotoUrl,
      portadaUrl: perfil.portadaUrl,
      ciudadOrigen: perfil.ciudadOrigen,
      instagram: perfil.instagram,
      intereses: perfil.intereses,
      busco: perfil.busco,
      cumpleMes: perfil.cumpleMes,
      cumpleDia: perfil.cumpleDia,
      seguidores,
      siguiendo,
      publicaciones,
      generacion: perfil.generacion,
      escuela: perfil.carrera?.escuela.nombre ?? null,
      carrera: perfil.carrera?.nombre ?? null,
      departamento: perfil.departamento?.nombre ?? null,
      colegio: perfil.colegio?.nombre ?? null,
      suspendido: perfil.user.estado === 'SUSPENDIDO',
      restringido: false as const,
      yoLeSigo,
      verificado: esStaff(perfil.user.roles),
    };
  }

  /** Comunidades del usuario. Alimenta el selector del feed. */
  async misComunidades(userId: string) {
    await this.auth.asegurarMembresiaCampus(userId);

    const membresias = await this.prisma.membership.findMany({
      where: { userId },
      include: { community: true },
    });

    const ordenTipo = (tipo: string) => {
      if (tipo === 'UNIVERSIDAD') return 0;
      if (tipo === 'CARRERA') return 1;
      if (tipo === 'GENERACION') return 2;
      if (tipo === 'COLEGIO') return 3;
      if (tipo === 'ESCUELA') return 4;
      if (tipo === 'DEPARTAMENTO') return 5;
      return 6;
    };

    return membresias
      .map((m) => ({
        slug: m.community.slug,
        nombre: m.community.nombre,
        tipo: m.community.tipo,
        automatica: m.automatica,
        silenciada: m.silenciada,
      }))
      .sort((a, b) => ordenTipo(a.tipo) - ordenTipo(b.tipo) || a.nombre.localeCompare(b.nombre, 'es'));
  }

  async silenciarComunidad(userId: string, slug: string, silenciada: boolean) {
    const membresia = await this.prisma.membership.findFirst({
      where: { userId, community: { slug } },
      include: { community: { select: { slug: true, nombre: true } } },
    });
    if (!membresia) throw new NotFoundException('No perteneces a esa comunidad.');

    await this.prisma.membership.update({
      where: { id: membresia.id },
      data: { silenciada },
    });

    return { slug: membresia.community.slug, silenciada };
  }

  /**
   * Quien puede ver que de un perfil. Si el dueno bloqueo al solicitante, el
   * perfil no existe para el; si esta en modo COMUNIDADES y no comparten
   * ninguna, solo ve lo minimo. Silenciar no cuenta: el silenciado no se entera.
   */
  private async acceso(
    perfil: { userId: string; visibilidad: string; estado: string },
    solicitanteId: string,
  ) {
    if (perfil.estado === 'BAJA') throw new NotFoundException('No existe ese perfil.');
    if (perfil.userId === solicitanteId) return { restringido: false };

    const [bloqueo, comparte] = await Promise.all([
      this.prisma.block.findFirst({
        where: { bloqueadorId: perfil.userId, bloqueadoId: solicitanteId, soloSilencio: false },
        select: { id: true },
      }),
      perfil.visibilidad === 'COMUNIDADES'
        ? this.prisma.membership.findFirst({
            where: {
              userId: solicitanteId,
              community: { memberships: { some: { userId: perfil.userId } } },
            },
            select: { id: true },
          })
        : Promise.resolve({ id: 'publico' }),
    ]);
    if (bloqueo) throw new NotFoundException('No existe ese perfil.');
    return { restringido: !comparte };
  }

  private async perfilParaListas(handle: string, solicitanteId: string) {
    const perfil = await this.prisma.profile.findUnique({
      where: { handle },
      select: { userId: true, visibilidad: true, user: { select: { estado: true } } },
    });
    if (!perfil) throw new NotFoundException('No existe ese perfil.');
    const { restringido } = await this.acceso(
      { userId: perfil.userId, visibilidad: perfil.visibilidad, estado: perfil.user.estado },
      solicitanteId,
    );
    return { userId: perfil.userId, restringido };
  }

  async listarSeguidores(handle: string, solicitanteId: string, limite = 40) {
    const perfil = await this.perfilParaListas(handle, solicitanteId);
    if (perfil.restringido) return { personas: [], restringido: true };

    const filas = await this.prisma.follow.findMany({
      where: {
        seguidoId: perfil.userId,
        seguidor: { bloqueosHechos: { none: { bloqueadoId: solicitanteId, soloSilencio: false } } },
      },
      include: {
        seguidor: {
          select: {
            roles: true,
            profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
          },
        },
      },
      take: limite,
      orderBy: { createdAt: 'desc' },
    });

    return {
      restringido: false,
      personas: filas
        .filter((f) => f.seguidor.profile)
        .map((f) => ({
          handle: f.seguidor.profile!.handle,
          nombre: `${f.seguidor.profile!.nombre} ${f.seguidor.profile!.apellidos}`,
          fotoUrl: f.seguidor.profile!.fotoUrl,
          verificado: esStaff(f.seguidor.roles),
        })),
    };
  }

  async listarSiguiendo(handle: string, solicitanteId: string, limite = 40) {
    const perfil = await this.perfilParaListas(handle, solicitanteId);
    if (perfil.restringido) return { personas: [], restringido: true };

    const filas = await this.prisma.follow.findMany({
      where: {
        seguidorId: perfil.userId,
        seguido: { bloqueosHechos: { none: { bloqueadoId: solicitanteId, soloSilencio: false } } },
      },
      include: {
        seguido: {
          select: {
            roles: true,
            profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
          },
        },
      },
      take: limite,
      orderBy: { createdAt: 'desc' },
    });

    return {
      restringido: false,
      personas: filas
        .filter((f) => f.seguido.profile)
        .map((f) => ({
          handle: f.seguido.profile!.handle,
          nombre: `${f.seguido.profile!.nombre} ${f.seguido.profile!.apellidos}`,
          fotoUrl: f.seguido.profile!.fotoUrl,
          verificado: esStaff(f.seguido.roles),
        })),
    };
  }
}
