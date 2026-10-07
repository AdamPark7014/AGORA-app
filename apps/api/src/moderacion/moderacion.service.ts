import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { CrearReporte, ResolverReporte } from '@agora/contracts';
import { Prisma } from '@agora/db';
import { PERMISSIONS, algunRolTienePermiso, type RoleKey } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';

const COMENTARIO_VISIBLE: readonly string[] = ['PUBLICADO', 'EN_REVISION'];

/**
 * Cola de moderación.
 *
 * Es la pieza que la investigación señaló como la que mata estos productos:
 * Yik Yak murió por crecer más rápido de lo que podía moderar, y Fizz opera con
 * ~15 moderadores por campus. La IA marca; **las personas deciden**.
 */
@Injectable()
export class ModeracionService {
  private readonly logger = new Logger(ModeracionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** Reportar es un derecho de cualquier miembro, no un privilegio. */
  async reportar(userId: string, datos: CrearReporte) {
    if (datos.postId) {
      const post = await this.prisma.post.findUnique({
        where: { id: datos.postId },
        select: { id: true, authorId: true },
      });
      if (!post) throw new NotFoundException('Esa publicación no existe.');
      if (post.authorId === userId) {
        throw new BadRequestException('No puedes reportar tu propia publicación.');
      }
    }

    if (datos.commentId) {
      const comentario = await this.prisma.comment.findUnique({
        where: { id: datos.commentId },
        select: { id: true, authorId: true },
      });
      if (!comentario) throw new NotFoundException('Ese comentario no existe.');
      if (comentario.authorId === userId) {
        throw new BadRequestException('No puedes reportar tu propio comentario.');
      }
    }

    // Un solo reporte por persona y contenido: si no, cinco toques al botón
    // parecen cinco denuncias distintas y distorsionan la prioridad de la cola.
    const yaReporto = await this.prisma.report.findFirst({
      where: {
        reportanteId: userId,
        ...(datos.postId ? { postId: datos.postId } : {}),
        ...(datos.commentId ? { commentId: datos.commentId } : {}),
      },
    });
    if (yaReporto) return { id: yaReporto.id, yaExistia: true };

    const reporte = await this.prisma.report.create({
      data: {
        reportanteId: userId,
        postId: datos.postId,
        commentId: datos.commentId,
        motivo: datos.motivo,
        detalle: datos.detalle,
      },
      select: { id: true },
    });

    return { id: reporte.id, yaExistia: false };
  }

  /**
   * Cola de trabajo.
   *
   * Ordenada por número de reportes y luego por antigüedad: lo que más gente
   * denunció primero, y a igualdad de denuncias, lo que lleva más esperando.
   * Ordenar solo por fecha dejaría un acoso masivo detrás de una fila de
   * reportes triviales.
   */
  async cola(estado: 'ABIERTO' | 'RESUELTO_RETIRADO' | 'RESUELTO_SIN_ACCION' = 'ABIERTO', limite = 50) {
    const reportes = await this.prisma.report.findMany({
      where: { estado },
      include: {
        reportante: { select: { profile: { select: { handle: true } } } },
        post: {
          include: {
            author: { select: { id: true, estado: true, profile: { select: { handle: true, nombre: true, apellidos: true } } } },
            community: { select: { nombre: true, tipo: true } },
          },
        },
        comment: {
          include: {
            author: { select: { id: true, estado: true, profile: { select: { handle: true, nombre: true, apellidos: true } } } },
            post: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limite,
    });

    // Se agrupan los reportes que apuntan al mismo contenido: un moderador
    // debe ver "esta publicación tiene 6 denuncias", no seis filas iguales.
    const porContenido = new Map<string, typeof reportes>();
    for (const r of reportes) {
      const clave = r.postId ?? r.commentId ?? r.id;
      const grupo = porContenido.get(clave) ?? [];
      grupo.push(r);
      porContenido.set(clave, grupo);
    }

    const items = [...porContenido.values()].map((grupo) => {
      const primero = grupo[0]!;
      const autor = primero.post?.author ?? primero.comment?.author ?? null;
      return {
        // Se resuelve el grupo entero con el id del primero.
        reporteId: primero.id,
        idsReporte: grupo.map((r) => r.id),
        numReportes: grupo.length,
        motivos: [...new Set(grupo.map((r) => r.motivo))],
        detalles: grupo.map((r) => r.detalle).filter(Boolean),
        creadoAt: primero.createdAt,
        tipo: primero.postId ? ('POST' as const) : ('COMENTARIO' as const),
        contenidoId: primero.postId ?? primero.commentId,
        texto: primero.post?.texto ?? primero.comment?.texto ?? '(contenido borrado)',
        estadoContenido: primero.post?.estado ?? primero.comment?.estado ?? null,
        comunidad: primero.post?.community?.nombre ?? null,
        /**
         * En la zona pseudonima el moderador SI ve quien escribio.
         *
         * Es la contraparte que hace responsable el anonimato: sin ella, la
         * zona seria un lugar donde nadie responde por nada. Los terminos lo
         * dicen por escrito, y esta bandera existe para que la interfaz lo
         * recuerde en pantalla en vez de esconderlo.
         */
        eraAnonimo: primero.post?.anonimo ?? false,
        postDeComentario: primero.comment?.post.id ?? null,
        autor: autor?.profile
          ? {
              id: autor.id,
              handle: autor.profile.handle,
              nombre: `${autor.profile.nombre} ${autor.profile.apellidos}`,
              suspendido: autor.estado === 'SUSPENDIDO',
            }
          : null,
      };
    });

    // El orden final: más denunciado primero, y a igualdad, lo más viejo.
    items.sort(
      (a, b) => b.numReportes - a.numReportes || a.creadoAt.getTime() - b.creadoAt.getTime(),
    );

    return { items };
  }

  /**
   * Resuelve un reporte y aplica la acción.
   *
   * Todo queda registrado en `ModerationAction` con su motivo visible. El
   * usuario tiene derecho a saber por qué se retiró su contenido y a apelar;
   * sin este registro esa promesa no se puede cumplir.
   */
  async resolver(
    reporteId: string,
    moderadorId: string,
    datos: ResolverReporte,
    rolesModerador: readonly RoleKey[],
  ) {
    // MODERACION_ACTUAR abre la ruta, pero suspender es de admin: sin esto un
    // moderador suspendia cuentas a traves de un reporte.
    if (
      datos.accion === 'SUSPENDER_USUARIO' &&
      !algunRolTienePermiso(rolesModerador, PERMISSIONS.USUARIO_SUSPENDER)
    ) {
      throw new ForbiddenException('Suspender una cuenta requiere rol de administrador.');
    }

    const reporte = await this.prisma.report.findUnique({
      where: { id: reporteId },
      include: {
        post: { select: { id: true, authorId: true } },
        comment: { select: { id: true, authorId: true, postId: true, estado: true } },
      },
    });
    if (!reporte) throw new NotFoundException('Ese reporte no existe.');
    if (reporte.estado !== 'ABIERTO') {
      throw new BadRequestException('Ese reporte ya se resolvió.');
    }

    const autorId = reporte.post?.authorId ?? reporte.comment?.authorId ?? null;
    const operaciones: Prisma.PrismaPromise<unknown>[] = [];

    // numComments cuenta solo comentarios visibles: si el estado cruza esa
    // frontera, el contador del post se mueve en la misma transaccion.
    const comentario = reporte.comment;
    const cambiarComentario = (estado: 'RETIRADO' | 'PUBLICADO') => {
      if (!comentario) return;
      operaciones.push(
        this.prisma.comment.update({ where: { id: comentario.id }, data: { estado } }),
      );
      const eraVisible = COMENTARIO_VISIBLE.includes(comentario.estado);
      const seraVisible = estado === 'PUBLICADO';
      if (eraVisible === seraVisible) return;
      operaciones.push(
        seraVisible
          ? this.prisma.post.update({
              where: { id: comentario.postId },
              data: { numComments: { increment: 1 } },
            })
          : this.prisma.post.updateMany({
              where: { id: comentario.postId, numComments: { gt: 0 } },
              data: { numComments: { decrement: 1 } },
            }),
      );
    };

    // Todos los reportes sobre el mismo contenido se cierran juntos: resolver
    // uno y dejar cinco abiertos por lo mismo es trabajo repetido garantizado.
    operaciones.push(
      this.prisma.report.updateMany({
        where: {
          estado: 'ABIERTO',
          ...(reporte.postId ? { postId: reporte.postId } : { commentId: reporte.commentId }),
        },
        data: {
          estado: datos.accion === 'SIN_ACCION' ? 'RESUELTO_SIN_ACCION' : 'RESUELTO_RETIRADO',
          resueltoAt: new Date(),
        },
      }),
    );

    if (datos.accion === 'RETIRAR_CONTENIDO') {
      if (reporte.postId) {
        operaciones.push(
          this.prisma.post.update({ where: { id: reporte.postId }, data: { estado: 'RETIRADO' } }),
        );
      }
      cambiarComentario('RETIRADO');
    }

    if (datos.accion === 'RESTAURAR_CONTENIDO') {
      if (reporte.postId) {
        operaciones.push(
          this.prisma.post.update({
            where: { id: reporte.postId },
            data: { estado: 'PUBLICADO' },
          }),
        );
      }
      cambiarComentario('PUBLICADO');
    }

    if (datos.accion === 'SUSPENDER_USUARIO' && autorId) {
      operaciones.push(
        this.prisma.user.update({ where: { id: autorId }, data: { estado: 'SUSPENDIDO' } }),
        this.prisma.session.deleteMany({ where: { userId: autorId } }),
      );
      // Suspender no basta: el contenido denunciado también se retira.
      if (reporte.postId) {
        operaciones.push(
          this.prisma.post.update({ where: { id: reporte.postId }, data: { estado: 'RETIRADO' } }),
        );
      }
      cambiarComentario('RETIRADO');
    }

    if (datos.accion === 'LEVANTAR_SUSPENSION' && autorId) {
      operaciones.push(
        this.prisma.user.update({ where: { id: autorId }, data: { estado: 'ACTIVO' } }),
      );
    }

    operaciones.push(
      this.prisma.moderationAction.create({
        data: {
          reportId: reporteId,
          moderadorId,
          postId: reporte.postId,
          commentId: reporte.commentId,
          accion: datos.accion,
          motivo: datos.motivo,
          automatica: false,
        },
      }),
    );

    await this.prisma.$transaction(operaciones);

    this.logger.log(
      `Moderación: ${datos.accion} sobre ${reporte.postId ? 'post' : 'comentario'} ${
        reporte.postId ?? reporte.commentId
      } por ${moderadorId}`,
    );

    return { accion: datos.accion };
  }

  /** Retiro directo desde el feed, sin reporte previo. */
  async retirarPost(postId: string, moderadorId: string, motivo: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, estado: true, authorId: true },
    });
    if (!post) throw new NotFoundException('Esa publicación no existe.');
    if (post.estado === 'RETIRADO' || post.estado === 'BORRADO_POR_AUTOR') {
      throw new BadRequestException('Esa publicación ya no está visible.');
    }

    await this.prisma.$transaction([
      this.prisma.post.update({ where: { id: postId }, data: { estado: 'RETIRADO' } }),
      this.prisma.moderationAction.create({
        data: {
          moderadorId,
          postId,
          accion: 'RETIRAR_CONTENIDO',
          motivo,
          automatica: false,
        },
      }),
    ]);

    void this.notificaciones.crear({
      userId: post.authorId,
      actorId: moderadorId,
      tipo: 'MODERACION',
      texto: `Retiraron tu publicación: ${motivo}`,
      url: '/ajustes',
    });

    this.logger.log(`Moderación: retiro directo de post ${postId} por ${moderadorId}`);
    return { retirado: true };
  }

  /** Números de cabecera del panel. */
  async resumen() {
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [pendientes, resueltos24h, enRevision, suspendidos, automaticas24h] = await Promise.all([
      this.prisma.report.count({ where: { estado: 'ABIERTO' } }),
      this.prisma.report.count({ where: { resueltoAt: { gte: hace24h } } }),
      this.prisma.post.count({ where: { estado: 'EN_REVISION' } }),
      this.prisma.user.count({ where: { estado: 'SUSPENDIDO' } }),
      this.prisma.moderationAction.count({ where: { automatica: true, createdAt: { gte: hace24h } } }),
    ]);

    return { pendientes, resueltos24h, enRevision, suspendidos, automaticas24h };
  }

  /** Historial de acciones. La transparencia es parte de la promesa. */
  async historial(limite = 50) {
    const acciones = await this.prisma.moderationAction.findMany({
      include: {
        moderador: { select: { profile: { select: { handle: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });

    return {
      acciones: acciones.map((a) => ({
        id: a.id,
        accion: a.accion,
        motivo: a.motivo,
        automatica: a.automatica,
        createdAt: a.createdAt,
        moderador: a.moderador?.profile?.handle ?? null,
        postId: a.postId,
        commentId: a.commentId,
      })),
    };
  }

  /**
   * Contenido marcado por la IA que nadie ha revisado.
   *
   * Sin esta vista, `EN_REVISION` es un estado al que el contenido entra y del
   * que nunca sale: la IA lo marca y ahí se queda para siempre.
   */
  async marcadoPorIA(limite = 50) {
    const posts = await this.prisma.post.findMany({
      where: { estado: 'EN_REVISION' },
      include: {
        author: { select: { profile: { select: { handle: true, nombre: true, apellidos: true } } } },
        community: { select: { nombre: true } },
        moderaciones: {
          where: { automatica: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { motivo: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limite,
    });

    return {
      posts: posts.map((p) => ({
        id: p.id,
        texto: p.texto,
        createdAt: p.createdAt,
        comunidad: p.community.nombre,
        eraAnonimo: p.anonimo,
        motivoIA: p.moderaciones[0]?.motivo ?? 'Marcado por el clasificador.',
        autor: p.author.profile
          ? {
              handle: p.author.profile.handle,
              nombre: `${p.author.profile.nombre} ${p.author.profile.apellidos}`,
            }
          : null,
      })),
    };
  }

  /** Decide sobre contenido marcado por la IA que nadie reportó. */
  async decidirMarcado(
    postId: string,
    moderadorId: string,
    accion: 'RESTAURAR_CONTENIDO' | 'RETIRAR_CONTENIDO',
    motivo: string,
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, estado: true },
    });
    if (!post) throw new NotFoundException('Esa publicación no existe.');
    if (post.estado !== 'EN_REVISION') {
      throw new BadRequestException('Esa publicación ya no está en revisión.');
    }

    await this.prisma.$transaction([
      this.prisma.post.update({
        where: { id: postId },
        data: { estado: accion === 'RESTAURAR_CONTENIDO' ? 'PUBLICADO' : 'RETIRADO' },
      }),
      this.prisma.moderationAction.create({
        data: { postId, moderadorId, accion, motivo, automatica: false },
      }),
    ]);

    return { accion };
  }
}
