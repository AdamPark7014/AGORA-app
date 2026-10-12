import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CrearComentario, CrearPost, EditarPost, Feed, Reaccionar } from '@agora/contracts';
import {
  DECISIONES,
  masSevero,
  moderarImagen,
  moderarTexto,
  type Veredicto,
} from '@agora/moderation';
import { esStaff } from '@agora/rbac';
import { extraerMenciones } from '@agora/shared';
import { Prisma } from '@agora/db';

import { PrismaService } from '../prisma/prisma.service.js';
import { GamificacionService } from '../gamificacion/gamificacion.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { AuthService } from '../auth/auth.service.js';
import { HashtagsService } from '../hashtags/hashtags.service.js';
import { moderacionPreviaActiva } from '../comun/moderacion.js';
import { enSegundoPlano } from '../comun/segundo-plano.js';
import { hayBloqueo, ocultosPara } from '../bloqueos/bloqueos.js';
import { aVistaPost, incluirVistaPost } from './vista-post.js';

/** Lo que se ve en el feed. EN_REVISION sigue visible: la IA no borra sola. */
const VISIBLES = ['PUBLICADO', 'EN_REVISION'] as const;

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly auth: AuthService,
    private readonly hashtags: HashtagsService,
    private readonly gamificacion: GamificacionService,
  ) {}

  /**
   * Pasa el texto por la politica de contenido.
   *
   * Sin OPENAI_API_KEY se publica sin moderar y se avisa en el log. Es lo
   * correcto en desarrollo: no tener llave no puede significar que nadie
   * pueda publicar.
   */
  private async moderar(texto: string, imagenes: readonly string[] = []): Promise<Veredicto> {
    if (!moderacionPreviaActiva()) {
      return { decision: DECISIONES.PUBLICAR };
    }
    const apiKey = process.env.OPENAI_API_KEY!;
    // Solo URLs publicas: las del almacen local (/api/media/...) no las puede
    // descargar el clasificador.
    const publicas = imagenes.filter((url) => url.startsWith('https://'));
    const veredictos = await Promise.all([
      ...(texto ? [moderarTexto(texto, { apiKey })] : []),
      ...publicas.map((url) => moderarImagen(url, { apiKey })),
    ]);
    return masSevero(veredictos);
  }

  async crear(userId: string, datos: CrearPost) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const comunidad = await this.prisma.community.findFirst({
      where: { slug: datos.comunidadSlug },
    });
    if (!comunidad) throw new NotFoundException('Esa comunidad no existe.');

    // Solo se publica donde uno pertenece. Sin esto, cualquiera podria
    // escribir en la comunidad de una carrera que no es la suya.
    const membresia = await this.prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId: comunidad.id } },
    });
    if (!membresia) throw new ForbiddenException('No perteneces a esa comunidad.');

    // Los archivos deben estar libres y ser tuyos: si no se comprobara,
    // cualquiera podria colgar en su publicacion la foto de otra persona.
    let imagenes: string[] = [];
    if (datos.mediaIds.length > 0) {
      const libres = await this.prisma.media.findMany({
        where: { id: { in: datos.mediaIds }, postId: null, anuncioId: null, ownerId: userId },
        select: { url: true, thumbUrl: true, mime: true },
      });
      if (libres.length !== datos.mediaIds.length) {
        throw new BadRequestException('Alguno de esos archivos ya no esta disponible.');
      }
      imagenes = libres
        .filter((m) => m.mime.startsWith('image/'))
        .map((m) => m.thumbUrl ?? m.url);
    }

    const veredicto = await this.moderar(datos.texto, imagenes);
    const estado =
      veredicto.decision === DECISIONES.RETIRAR
        ? 'RETIRADO'
        : veredicto.decision === DECISIONES.PUBLICAR_Y_ENCOLAR
          ? 'EN_REVISION'
          : 'PUBLICADO';

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        communityId: comunidad.id,
        texto: datos.texto,
        estado,
        ...(datos.encuesta
          ? {
              poll: {
                create: {
                  pregunta: datos.encuesta.pregunta,
                  options: {
                    create: datos.encuesta.opciones.map((texto, orden) => ({ texto, orden })),
                  },
                },
              },
            }
          : {}),
      },
      select: { id: true },
    });

    if (datos.mediaIds.length > 0) {
      await this.prisma.media.updateMany({
        where: { id: { in: datos.mediaIds } },
        data: { postId: post.id },
      });
    }

    if (estado !== 'PUBLICADO') {
      await this.prisma.moderationAction.create({
        data: {
          postId: post.id,
          accion: estado === 'RETIRADO' ? 'RETIRAR_CONTENIDO' : 'MARCAR_REVISION',
          automatica: true,
          motivo: veredicto.motivo ?? 'Marcado por el clasificador.',
        },
      });
    }

    if (estado !== 'RETIRADO' && datos.texto) {
      enSegundoPlano(
        this.notificarMenciones(datos.texto, userId, `/publicacion/${post.id}`),
        this.logger,
        'Menciones',
      );
      enSegundoPlano(
        this.hashtags.sincronizar(post.id, datos.texto, usuario.universityId),
        this.logger,
        'Hashtags',
      );
    }

    const nuevasInsignias = await this.gamificacion.evaluarBadges(userId);

    return {
      id: post.id,
      estado,
      // El autor siempre sabe que paso con su publicacion y por que.
      aviso: veredicto.motivo ?? null,
      ...(nuevasInsignias.length > 0 ? { nuevasInsignias } : {}),
    };
  }

  /**
   * Feed del campus. Por defecto muestra todo lo publicado en la UDLAP; con
   * comunidadSlug se acota a una comunidad concreta (carrera, generacion, etc.).
   */
  async feed(userId: string, filtros: Feed) {
    await this.auth.asegurarMembresiaCampus(userId);

    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) return { publicaciones: [], siguienteCursor: null };

    const ocultos = await ocultosPara(this.prisma, userId);

    const where: Prisma.PostWhereInput = {
      community: { universityId: usuario.universityId },
      estado: { in: [...VISIBLES] },
      anonimo: false,
      ...(ocultos.size > 0 ? { authorId: { notIn: [...ocultos] } } : {}),
    };

    if (filtros.siguiendo === 'true') {
      // Filtro por relacion en vez de traerse la lista de seguidos y meterla
      // en un `IN`. Aquella version hacia una consulta extra **en cada pagina
      // del feed** —o sea, en cada desplazamiento— y construia un `IN` que
      // crece con la gente que sigues. Aqui lo resuelve la base de una vez,
      // por el indice de `follows`.
      where.author = { seguidores: { some: { seguidorId: userId } } };
    } else if (filtros.comunidadSlug) {
      const membresias = await this.prisma.membership.findMany({
        where: { userId, silenciada: false },
        select: { communityId: true, community: { select: { slug: true } } },
      });
      const elegida = membresias.find((m) => m.community.slug === filtros.comunidadSlug);
      if (!elegida) throw new ForbiddenException('No perteneces a esa comunidad.');
      where.communityId = elegida.communityId;
    }

    const posts = await this.prisma.post.findMany({
      where,
      include: incluirVistaPost(userId),
      take: filtros.limite + 1,
      ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hayMas = posts.length > filtros.limite;
    const pagina = hayMas ? posts.slice(0, filtros.limite) : posts;

    const guardados = await this.prisma.guardado.findMany({
      where: { userId, postId: { in: pagina.map((p) => p.id) } },
      select: { postId: true },
    });
    const guardadosSet = new Set(guardados.map((g) => g.postId));

    return {
      publicaciones: pagina.map((p) => aVistaPost(p, guardadosSet.has(p.id))),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

  async detalle(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: incluirVistaPost(userId),
    });
    if (!post || post.estado === 'RETIRADO' || post.estado === 'BORRADO_POR_AUTOR') {
      throw new NotFoundException('Esa publicacion no existe.');
    }

    // Lo mismo que el feed: con el enlace directo tampoco se ve a quien te
    // bloqueo (o bloqueaste), ni sus comentarios.
    const ocultos = await ocultosPara(this.prisma, userId);
    if (!post.anonimo && ocultos.has(post.authorId) && (await this.hayBloqueoCon(userId, post.authorId))) {
      throw new NotFoundException('Esa publicacion no existe.');
    }

    const comentarios = await this.prisma.comment.findMany({
      where: {
        postId,
        estado: { in: [...VISIBLES] },
        ...(ocultos.size > 0 ? { authorId: { notIn: [...ocultos] } } : {}),
      },
      include: {
        author: {
          select: {
            roles: true,
            profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    const guardado = await this.prisma.guardado.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    return {
      ...aVistaPost(post, Boolean(guardado)),
      comentarios: comentarios.map((c) => ({
        id: c.id,
        texto: c.texto,
        createdAt: c.createdAt,
        autor: c.author.profile
          ? {
              handle: c.author.profile.handle,
              nombre: `${c.author.profile.nombre} ${c.author.profile.apellidos}`,
              fotoUrl: c.author.profile.fotoUrl,
              verificado: esStaff(c.author.roles),
            }
          : null,
      })),
    };
  }

  async comentar(postId: string, userId: string, datos: CrearComentario) {
    const post = await this.exigirVisible(postId, userId);

    const membresia = await this.prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId: post.communityId } },
    });
    if (!membresia) throw new ForbiddenException('No perteneces a esa comunidad.');

    const veredicto = await this.moderar(datos.texto);
    if (veredicto.decision === DECISIONES.RETIRAR) {
      throw new BadRequestException(veredicto.motivo ?? 'Ese comentario cruza una linea roja.');
    }

    // El contador denormalizado y el comentario en la misma transaccion: si
    // se actualiza fuera, un fallo deja el numero mintiendo para siempre.
    const [comentario] = await this.prisma.$transaction([
      this.prisma.comment.create({
        data: {
          postId,
          authorId: userId,
          texto: datos.texto,
          estado: veredicto.decision === DECISIONES.PUBLICAR_Y_ENCOLAR ? 'EN_REVISION' : 'PUBLICADO',
        },
        select: { id: true, createdAt: true },
      }),
      this.prisma.post.update({
        where: { id: postId },
        data: { numComments: { increment: 1 } },
      }),
    ]);

    // Notificar al autor. Va despues de la transaccion y sin await bloqueante:
    // si falla el aviso, el comentario ya quedo publicado igual.
    const autor = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    const quien = await this.prisma.profile.findUnique({
      where: { userId },
      select: { nombre: true },
    });
    if (autor) {
      void this.notificaciones.crear({
        userId: autor.authorId,
        actorId: userId,
        tipo: 'COMENTARIO',
        texto: `${quien?.nombre ?? 'Alguien'} comentó tu publicación`,
        url: `/publicacion/${postId}`,
      });
    }

    enSegundoPlano(
      this.notificarMenciones(datos.texto, userId, `/publicacion/${postId}`),
      this.logger,
      'Menciones',
    );

    return { id: comentario.id, aviso: veredicto.motivo ?? null };
  }

  /** Reaccion tipo interruptor: la misma quita, otra distinta reemplaza. */
  async reaccionar(postId: string, userId: string, datos: Reaccionar) {
    await this.exigirVisible(postId, userId);

    const existente = await this.prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existente?.tipo === datos.tipo) {
      await this.prisma.$transaction([
        this.prisma.reaction.delete({ where: { id: existente.id } }),
        this.prisma.post.update({ where: { id: postId }, data: { numReactions: { decrement: 1 } } }),
      ]);
      return { miReaccion: null };
    }

    if (existente) {
      // Cambiar de reaccion no mueve el contador: sigue siendo una persona.
      await this.prisma.reaction.update({
        where: { id: existente.id },
        data: { tipo: datos.tipo },
      });
      return { miReaccion: datos.tipo };
    }

    await this.prisma.$transaction([
      this.prisma.reaction.create({ data: { postId, userId, tipo: datos.tipo } }),
      this.prisma.post.update({ where: { id: postId }, data: { numReactions: { increment: 1 } } }),
    ]);

    // Solo al crear una reaccion nueva. Cambiarla o quitarla no avisa: seria
    // ruido por algo que el autor ya sabe.
    const autorPost = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    const quienReacciono = await this.prisma.profile.findUnique({
      where: { userId },
      select: { nombre: true },
    });
    if (autorPost) {
      void this.notificaciones.crear({
        userId: autorPost.authorId,
        actorId: userId,
        tipo: 'REACCION',
        texto: `A ${quienReacciono?.nombre ?? 'alguien'} le gustó tu publicación`,
        url: `/publicacion/${postId}`,
      });
    }

    return { miReaccion: datos.tipo };
  }

  /**
   * Un voto por encuesta, no por opcion. La base solo garantiza lo segundo
   * (unique en pollOptionId+userId), asi que cambiar de opinion se resuelve
   * aqui: se borran los votos previos del usuario en esa encuesta.
   */
  async votar(postId: string, userId: string, opcionId: string) {
    await this.exigirVisible(postId, userId);
    const opcion = await this.prisma.pollOption.findUnique({
      where: { id: opcionId },
      include: { poll: { select: { id: true, postId: true, cierraAt: true } } },
    });
    if (!opcion || opcion.poll.postId !== postId) {
      throw new NotFoundException('Esa opcion no pertenece a esta encuesta.');
    }
    if (opcion.poll.cierraAt && opcion.poll.cierraAt.getTime() < Date.now()) {
      throw new BadRequestException('Esa encuesta ya cerro.');
    }

    const opciones = await this.prisma.pollOption.findMany({
      where: { pollId: opcion.poll.id },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.pollVote.deleteMany({
        where: { userId, pollOptionId: { in: opciones.map((o) => o.id) } },
      }),
      this.prisma.pollVote.create({ data: { userId, pollOptionId: opcionId } }),
    ]);

    const conteo = await this.prisma.pollOption.findMany({
      where: { pollId: opcion.poll.id },
      orderBy: { orden: 'asc' },
      include: { _count: { select: { votes: true } } },
    });

    return {
      opciones: conteo.map((o) => ({ id: o.id, texto: o.texto, votos: o._count.votes })),
      miVoto: opcionId,
    };
  }

  /** Borrado por el autor. Los moderadores usan la ruta de moderacion. */
  async borrar(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new NotFoundException('Esa publicacion no existe.');
    if (post.authorId !== userId) throw new ForbiddenException('No es tu publicacion.');

    await this.prisma.post.update({
      where: { id: postId },
      data: { estado: 'BORRADO_POR_AUTOR' },
    });
  }

  async editar(postId: string, userId: string, datos: EditarPost) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, estado: true, anonimo: true },
    });
    if (!post || !VISIBLES.includes(post.estado as (typeof VISIBLES)[number])) {
      throw new NotFoundException('Esa publicacion no existe.');
    }
    if (post.authorId !== userId) throw new ForbiddenException('No es tu publicacion.');
    // Editar notifica menciones con el actor real y sincroniza hashtags: en una
    // anonima eso revelaria quien la escribio.
    if (post.anonimo) {
      throw new BadRequestException('Las publicaciones anónimas no se editan; bórrala y publica otra.');
    }

    const veredicto = await this.moderar(datos.texto);
    if (veredicto.decision === DECISIONES.RETIRAR) {
      throw new BadRequestException(veredicto.motivo ?? 'Ese texto cruza una linea roja.');
    }

    // Una publicacion en revision sigue en revision: editarla no puede ser la
    // forma de sacarla de la cola (con la IA apagada siempre la publicaba).
    const enRevision =
      post.estado === 'EN_REVISION' || veredicto.decision === DECISIONES.PUBLICAR_Y_ENCOLAR;
    await this.prisma.post.update({
      where: { id: postId },
      data: { texto: datos.texto, estado: enRevision ? 'EN_REVISION' : 'PUBLICADO' },
    });

    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (usuario) {
      enSegundoPlano(
        this.hashtags.sincronizar(postId, datos.texto, usuario.universityId),
        this.logger,
        'Hashtags',
      );
    }

    enSegundoPlano(
      this.notificarMenciones(datos.texto, userId, `/publicacion/${postId}`),
      this.logger,
      'Menciones',
    );

    return { aviso: veredicto.motivo ?? null };
  }

  private hayBloqueoCon(userId: string, otroId: string): Promise<boolean> {
    return hayBloqueo(this.prisma, userId, otroId);
  }

  /**
   * La publicacion existe, esta visible y no hay un bloqueo entre quien la
   * pide y su autor. Antes reaccionar, votar y comentar solo miraban el
   * estado: con el id se podia reaccionar a quien te bloqueo, y votar en una
   * encuesta retirada. En las anonimas no se mira el bloqueo: un 404 ahi le
   * diria al bloqueado quien la escribio.
   */
  private async exigirVisible(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, communityId: true, estado: true, anonimo: true },
    });
    if (!post || !VISIBLES.includes(post.estado as (typeof VISIBLES)[number])) {
      throw new NotFoundException('Esa publicacion no existe.');
    }
    if (!post.anonimo && post.authorId !== userId && (await this.hayBloqueoCon(userId, post.authorId))) {
      throw new NotFoundException('Esa publicacion no existe.');
    }
    return post;
  }

  private async notificarMenciones(texto: string, actorId: string, url: string) {
    const handles = extraerMenciones(texto);
    if (handles.length === 0) return;

    const [perfiles, quien] = await Promise.all([
      this.prisma.profile.findMany({
        where: { handle: { in: handles } },
        select: { userId: true },
      }),
      this.prisma.profile.findUnique({ where: { userId: actorId }, select: { nombre: true } }),
    ]);

    for (const perfil of perfiles) {
      void this.notificaciones.crear({
        userId: perfil.userId,
        actorId,
        tipo: 'MENCION',
        texto: `${quien?.nombre ?? 'Alguien'} te mencionó`,
        url,
      });
    }
  }
}
