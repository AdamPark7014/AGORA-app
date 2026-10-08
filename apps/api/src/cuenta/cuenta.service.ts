import { createHmac } from 'node:crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { crearAlmacen, type Almacen } from '../media/almacen.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Baja de cuenta (derecho de cancelacion de la LFPDPPP y requisito de las
 * tiendas: borrar la cuenta desde la propia app).
 *
 * Se anonimiza en sitio en vez de borrar la fila de `users`: los ids siguen
 * referenciados por reportes, acciones de moderacion y el alias anonimo, que
 * son la contraparte de responsabilidad de la red. Lo que identifica a la
 * persona si se va:
 *
 *  - el perfil completo (nombre, foto, bio, intereses, cumpleanos...),
 *  - el correo, que se reemplaza para que pueda volver a registrarse,
 *  - sesiones, tokens de push, preferencias, racha e insignias,
 *  - membresias, seguimientos, bloqueos, guardados y avisos recibidos,
 *  - asientos de aventon y asistencias (liberan lugar a otros).
 *
 * Su contenido (publicaciones, comentarios, mensajes, anuncios, eventos y
 * aventones) queda como BORRADO_POR_AUTOR: deja de verse en todas partes.
 * Sus fotos y videos se borran del almacen, que es publico: ocultar la
 * publicacion no basta si la URL del archivo sigue abriendo. Se conserva lo
 * adjunto a una publicacion con reporte abierto, que es evidencia para
 * moderacion.
 *
 * Solo queda un HMAC del correo en `audit_logs`, para poder atender un
 * requerimiento legal sobre la cuenta sin guardar el correo en claro.
 */
@Injectable()
export class CuentaService {
  private readonly logger = new Logger(CuentaService.name);
  /** Perezoso: crearlo en el constructor exigiria S3 configurado hasta en pruebas. */
  private almacen?: Almacen;

  constructor(private readonly prisma: PrismaService) {}

  async eliminar(userId: string, confirmacion: string): Promise<void> {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, estado: true, profile: { select: { handle: true } } },
    });
    if (!usuario || usuario.estado === 'BAJA') throw new NotFoundException('Esa cuenta no existe.');

    const esperado = usuario.profile?.handle ?? 'ELIMINAR';
    const escrito = confirmacion.trim().replace(/^@/, '');
    if (escrito.toLowerCase() !== esperado.toLowerCase()) {
      throw new BadRequestException(
        usuario.profile
          ? `Para confirmar escribe tu usuario: ${esperado}`
          : 'Para confirmar escribe ELIMINAR.',
      );
    }

    // Se leen antes de la transaccion, que borra el perfil.
    const perfil = await this.prisma.profile.findUnique({
      where: { userId },
      select: { fotoUrl: true, portadaUrl: true },
    });
    const archivos = await this.prisma.media.findMany({
      where: {
        OR: [
          { ownerId: userId },
          // Filas anteriores a ownerId: se reconocen por lo que adjuntan.
          { post: { is: { authorId: userId } } },
          { anuncio: { is: { vendedorId: userId } } },
        ],
        NOT: {
          post: { is: { reports: { some: { estado: { in: ['ABIERTO', 'EN_REVISION'] } } } } },
        },
      },
      select: { id: true, url: true, thumbUrl: true },
    });

    const emailHash = createHmac('sha256', process.env.SESSION_SECRET ?? '')
      .update(usuario.email)
      .digest('hex');
    const oculto = { estado: 'BORRADO_POR_AUTOR' as const };
    const visibles = { estado: { in: ['PUBLICADO' as const, 'EN_REVISION' as const] } };

    await this.prisma.$transaction([
      this.prisma.post.updateMany({ where: { authorId: userId, ...visibles }, data: oculto }),
      // Antes de ocultarlos: sus comentarios dejan de contar en los posts ajenos.
      this.prisma.$executeRaw`
        UPDATE "posts" p
        SET "numComments" = GREATEST(p."numComments" - c.n, 0)
        FROM (
          SELECT "postId", COUNT(*)::int AS n
          FROM "comments"
          WHERE "authorId" = ${userId} AND "estado" IN ('PUBLICADO', 'EN_REVISION')
          GROUP BY "postId"
        ) c
        WHERE p."id" = c."postId"`,
      this.prisma.comment.updateMany({ where: { authorId: userId, ...visibles }, data: oculto }),
      this.prisma.message.updateMany({ where: { autorId: userId, ...visibles }, data: oculto }),
      this.prisma.anuncio.updateMany({ where: { vendedorId: userId, ...visibles }, data: oculto }),
      this.prisma.evento.updateMany({ where: { autorId: userId, ...visibles }, data: oculto }),
      this.prisma.aventon.updateMany({ where: { conductorId: userId, ...visibles }, data: oculto }),

      this.prisma.asientoAventon.deleteMany({ where: { userId } }),
      this.prisma.asistenciaEvento.deleteMany({ where: { userId } }),
      this.prisma.guardado.deleteMany({ where: { userId } }),
      this.prisma.membership.deleteMany({ where: { userId } }),
      this.prisma.follow.deleteMany({ where: { OR: [{ seguidorId: userId }, { seguidoId: userId }] } }),
      this.prisma.block.deleteMany({ where: { OR: [{ bloqueadorId: userId }, { bloqueadoId: userId }] } }),
      this.prisma.notificacion.deleteMany({ where: { userId } }),
      this.prisma.preferenciaNotificacion.deleteMany({ where: { userId } }),
      this.prisma.pushSubscription.deleteMany({ where: { userId } }),
      this.prisma.userBadge.deleteMany({ where: { userId } }),
      this.prisma.userStreak.deleteMany({ where: { userId } }),
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.profile.deleteMany({ where: { userId } }),

      this.prisma.user.update({
        where: { id: userId },
        data: { estado: 'BAJA', email: `baja-${userId}@baja.invalid`, lastSeenAt: null },
      }),
      this.prisma.auditLog.create({
        data: {
          userId,
          accion: 'CUENTA_BAJA',
          entidad: 'User',
          entidadId: userId,
          metadata: { emailHash },
        },
      }),
    ]);

    const borrados = await this.borrarArchivos(archivos, [perfil?.fotoUrl, perfil?.portadaUrl]);
    this.logger.log(`Cuenta dada de baja: ${userId} (${borrados} archivos borrados)`);
  }

  /**
   * Despues de la transaccion: si el almacen falla, la cuenta ya quedo dada
   * de baja y el archivo se registra para reintentarlo, en vez de deshacer
   * la baja por un error de red.
   */
  private async borrarArchivos(
    archivos: Array<{ id: string; url: string; thumbUrl: string | null }>,
    urlsPerfil: Array<string | null | undefined>,
  ): Promise<number> {
    const almacen = this.almacen ?? (this.almacen = crearAlmacen());
    const borradas: string[] = [];
    const urlsMedia = new Set(archivos.map((a) => a.url));

    for (const a of archivos) {
      try {
        await almacen.borrar(a.url);
        if (a.thumbUrl) await almacen.borrar(a.thumbUrl);
        borradas.push(a.id);
      } catch (e) {
        this.logger.warn(`baja: no se pudo borrar ${a.url}: ${(e as Error).message}`);
      }
    }
    if (borradas.length > 0) {
      await this.prisma.media.deleteMany({ where: { id: { in: borradas } } });
    }

    // Fotos de perfil de antes de que /media guardara dueno: solo hay URL.
    for (const url of urlsPerfil) {
      if (!url || urlsMedia.has(url)) continue;
      try {
        await almacen.borrar(url);
      } catch (e) {
        this.logger.warn(`baja: no se pudo borrar ${url}: ${(e as Error).message}`);
      }
    }
    return borradas.length;
  }
}
