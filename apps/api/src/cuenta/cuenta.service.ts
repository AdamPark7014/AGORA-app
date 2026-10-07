import { createHmac } from 'node:crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

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
 *
 * Solo queda un HMAC del correo en `audit_logs`, para poder atender un
 * requerimiento legal sobre la cuenta sin guardar el correo en claro.
 */
@Injectable()
export class CuentaService {
  private readonly logger = new Logger(CuentaService.name);

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

    const emailHash = createHmac('sha256', process.env.SESSION_SECRET ?? '')
      .update(usuario.email)
      .digest('hex');
    const oculto = { estado: 'BORRADO_POR_AUTOR' as const };
    const visibles = { estado: { in: ['PUBLICADO' as const, 'EN_REVISION' as const] } };

    await this.prisma.$transaction([
      this.prisma.post.updateMany({ where: { authorId: userId, ...visibles }, data: oculto }),
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

    this.logger.log(`Cuenta dada de baja: ${userId}`);
  }
}
