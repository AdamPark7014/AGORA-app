import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { crearAlmacen, type Almacen } from '../media/almacen.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RETENCION, limite } from './retencion.js';

/**
 * Limpieza periodica de lo que ya no sirve.
 *
 * Hasta ahora **nada se borraba nunca**. En unos dias de desarrollo ya habia
 * 254 sesiones y 28 codigos OTP caducados sin recoger. Eso no tumba nada de
 * golpe, y por eso es facil no verlo: el problema aparece con los meses.
 *
 * Importa por donde duele:
 *
 *  - `sessions` se consulta en **cada peticion con sesion**. Es la lectura mas
 *    frecuente de toda la API, y su indice se llena de filas muertas.
 *  - `otp_codes` se consulta en **cada inicio de sesion**, con un conteo de
 *    las ultimas 24 horas por usuario.
 *  - `notificaciones` crece con cada reaccion, comentario y seguidor. Con
 *    ~9,000 personas son cientos de miles al mes, para siempre.
 *
 * Se hace dentro de la API y no con un cron del sistema porque la API ya es un
 * proceso que vive de continuo — es la razon por la que se eligio un VPS y no
 * serverless. Una tarea mas no cuesta nada y viaja con el despliegue.
 */
@Injectable()
export class MantenimientoService {
  private readonly log = new Logger('Mantenimiento');
  private almacen: Almacen | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * De madrugada, hora del servidor: es cuando menos gente hay en el campus y
   * un borrado grande no compite con nadie.
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM, { name: 'limpieza' })
  async limpiar(): Promise<{ otp: number; sesiones: number; notificaciones: number }> {
    const ahora = new Date();

    const [otp, sesiones, notificaciones] = await Promise.all([
      this.prisma.otpCode.deleteMany({
        where: { createdAt: { lt: limite(RETENCION.otpMs, ahora) } },
      }),
      this.prisma.session.deleteMany({
        where: { expiresAt: { lt: limite(RETENCION.sesionCaducadaMs, ahora) } },
      }),
      this.prisma.notificacion.deleteMany({
        where: {
          // Solo lo ya leido: un aviso que nadie vio no se borra por viejo.
          leidoAt: { not: null, lt: limite(RETENCION.notificacionLeidaMs, ahora) },
        },
      }),
    ]);

    const resumen = {
      otp: otp.count,
      sesiones: sesiones.count,
      notificaciones: notificaciones.count,
    };

    // Se registra siempre, incluso en cero: un cero cada dia es la prueba de
    // que la tarea sigue corriendo. El silencio no distingue "nada que borrar"
    // de "lleva un mes sin ejecutarse".
    this.log.log(
      `limpieza: ${resumen.otp} codigos, ${resumen.sesiones} sesiones, ` +
        `${resumen.notificaciones} avisos leidos`,
    );

    return resumen;
  }

  /**
   * Archivos subidos que nunca llegaron a una publicacion, un anuncio ni a un
   * perfil. Se borra el archivo del almacen y luego la fila; si el almacen
   * falla, la fila se queda para el siguiente barrido.
   */
  @Cron('30 4 * * *', { name: 'limpieza-media' })
  async limpiarMedia(lote = 500): Promise<{ archivos: number; fallidos: number }> {
    // Foto y portada de perfil se guardan por URL, no por relacion, asi que
    // la exclusion va dentro de la consulta. Si se filtrara despues, las fotos
    // de perfil (las filas mas viejas sin postId) llenarian el lote entero y
    // en cuanto hubiera 500 la limpieza no volveria a borrar nada.
    const candidatos = await this.prisma.$queryRaw<
      Array<{ id: string; url: string; thumbUrl: string | null }>
    >`
      SELECT m."id", m."url", m."thumbUrl"
      FROM "media" m
      WHERE m."postId" IS NULL
        AND m."anuncioId" IS NULL
        AND m."createdAt" < ${limite(RETENCION.mediaHuerfanaMs)}
        AND NOT EXISTS (
          SELECT 1 FROM "profiles" p
          WHERE p."fotoUrl" = m."url" OR p."portadaUrl" = m."url"
        )
      ORDER BY m."createdAt" ASC
      LIMIT ${lote}
    `;
    if (candidatos.length === 0) {
      this.log.log('limpieza-media: 0 archivos');
      return { archivos: 0, fallidos: 0 };
    }

    const almacen = this.almacen ?? (this.almacen = crearAlmacen());
    const borrados: string[] = [];
    let fallidos = 0;
    for (const m of candidatos) {
      try {
        await almacen.borrar(m.url);
        if (m.thumbUrl) await almacen.borrar(m.thumbUrl);
        borrados.push(m.id);
      } catch (e) {
        fallidos++;
        this.log.warn(`limpieza-media: no se pudo borrar ${m.url}: ${(e as Error).message}`);
      }
    }
    if (borrados.length > 0) {
      await this.prisma.media.deleteMany({ where: { id: { in: borrados } } });
    }

    this.log.log(`limpieza-media: ${borrados.length} archivos, ${fallidos} fallidos`);
    return { archivos: borrados.length, fallidos };
  }
}
