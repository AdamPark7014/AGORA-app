import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CrearAventon, ListarAventones } from '@agora/contracts';
import { Prisma } from '@agora/db';

import { PrismaService } from '../prisma/prisma.service.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { GamificacionService } from '../gamificacion/gamificacion.service.js';

/**
 * Aventones entre Puebla y Cholula.
 *
 * El transporte de la UDLAP cuesta $16 por viaje, solo corre de lunes a
 * viernes y el bono del semestre pasa de $1,100; el estacionamiento supera los
 * $1,000 al semestre en una comunidad donde 80 % tiene beca. Este es el hueco
 * con dolor medible del campus, y el que ya funciono en la UABC con 400+
 * conductores registrandose con su correo institucional.
 */
@Injectable()
export class AventonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    private readonly gamificacion: GamificacionService,
  ) {}

  async crear(userId: string, datos: CrearAventon) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    if (datos.salidaAt.getTime() < Date.now() - 15 * 60 * 1000) {
      throw new BadRequestException('Esa salida ya pasó.');
    }

    const aventon = await this.prisma.aventon.create({
      data: {
        conductorId: userId,
        universityId: usuario.universityId,
        sentido: datos.sentido,
        origen: datos.origen,
        destino: datos.destino,
        salidaAt: datos.salidaAt,
        lugares: datos.lugares,
        cuotaMxn: datos.cuotaMxn,
        nota: datos.nota,
      },
      select: { id: true },
    });

    const nuevasInsignias = await this.gamificacion.evaluarBadges(userId);

    return nuevasInsignias.length > 0 ? { ...aventon, nuevasInsignias } : aventon;
  }

  /** Próximas salidas. Solo hacia adelante: un aventón de ayer no sirve. */
  async proximos(userId: string, filtros: ListarAventones) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const where: Prisma.AventonWhereInput = {
      universityId: usuario.universityId,
      estado: 'PUBLICADO',
      salidaAt: { gte: new Date() },
      ...(filtros.sentido ? { sentido: filtros.sentido } : {}),
    };

    const aventones = await this.prisma.aventon.findMany({
      where,
      include: {
        conductor: {
          select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } },
        },
        asientos: { select: { userId: true } },
      },
      orderBy: { salidaAt: 'asc' },
      take: filtros.limite,
    });

    return {
      aventones: aventones.map((a) => ({
        id: a.id,
        sentido: a.sentido,
        origen: a.origen,
        destino: a.destino,
        salidaAt: a.salidaAt,
        lugares: a.lugares,
        ocupados: a.asientos.length,
        cuotaMxn: a.cuotaMxn,
        nota: a.nota,
        conductor: a.conductor.profile
          ? {
              handle: a.conductor.profile.handle,
              nombre: `${a.conductor.profile.nombre} ${a.conductor.profile.apellidos}`,
              fotoUrl: a.conductor.profile.fotoUrl,
            }
          : null,
        voyYo: a.asientos.some((s) => s.userId === userId),
        esMio: a.conductorId === userId,
      })),
    };
  }

  /** Apartar lugar es un interruptor: volver a tocarlo lo libera. */
  async apartar(aventonId: string, userId: string) {
    const aventon = await this.prisma.aventon.findUnique({
      where: { id: aventonId },
      include: { asientos: { select: { id: true, userId: true } } },
    });
    if (!aventon || aventon.estado !== 'PUBLICADO') {
      throw new NotFoundException('Ese aventón no existe.');
    }
    if (aventon.conductorId === userId) {
      throw new BadRequestException('Es tu propio aventón.');
    }
    if (aventon.salidaAt.getTime() < Date.now()) {
      throw new BadRequestException('Ese aventón ya salió.');
    }

    const mio = aventon.asientos.find((s) => s.userId === userId);
    if (mio) {
      await this.prisma.asientoAventon.delete({ where: { id: mio.id } });
      return { voyYo: false, ocupados: aventon.asientos.length - 1 };
    }

    if (aventon.asientos.length >= aventon.lugares) {
      throw new BadRequestException('Ya no hay lugares.');
    }

    await this.prisma.asientoAventon.create({ data: { aventonId, userId } });

    const pasajero = await this.prisma.profile.findUnique({
      where: { userId },
      select: { nombre: true },
    });
    void this.notificaciones.crear({
      userId: aventon.conductorId,
      actorId: userId,
      tipo: 'AVENTON_APARTADO',
      texto: `${pasajero?.nombre ?? 'Alguien'} apartó lugar en tu aventón`,
      url: '/aventones',
    });

    return { voyYo: true, ocupados: aventon.asientos.length + 1 };
  }

  async cancelar(aventonId: string, userId: string) {
    const aventon = await this.prisma.aventon.findUnique({
      where: { id: aventonId },
      select: { conductorId: true },
    });
    if (!aventon) throw new NotFoundException('Ese aventón no existe.');
    if (aventon.conductorId !== userId) throw new ForbiddenException('No es tu aventón.');

    await this.prisma.aventon.update({
      where: { id: aventonId },
      data: { estado: 'BORRADO_POR_AUTOR' },
    });
  }
}
