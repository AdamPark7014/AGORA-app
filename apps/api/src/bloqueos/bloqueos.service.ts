import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BloqueosService {
  constructor(private readonly prisma: PrismaService) {}

  async estado(userId: string, handle: string) {
    const otro = await this.perfilPorHandle(handle);
    if (otro.userId === userId) return { bloqueado: false, silenciado: false };

    const registro = await this.prisma.block.findUnique({
      where: { bloqueadorId_bloqueadoId: { bloqueadorId: userId, bloqueadoId: otro.userId } },
    });

    return {
      bloqueado: Boolean(registro && !registro.soloSilencio),
      silenciado: Boolean(registro?.soloSilencio),
    };
  }

  async aplicar(userId: string, handle: string, soloSilencio: boolean) {
    const otro = await this.perfilPorHandle(handle);
    if (otro.userId === userId) throw new BadRequestException('No puedes bloquearte a ti mismo.');

    await this.prisma.block.upsert({
      where: { bloqueadorId_bloqueadoId: { bloqueadorId: userId, bloqueadoId: otro.userId } },
      create: { bloqueadorId: userId, bloqueadoId: otro.userId, soloSilencio },
      update: { soloSilencio },
    });

    return { bloqueado: !soloSilencio, silenciado: soloSilencio };
  }

  async quitar(userId: string, handle: string) {
    const otro = await this.perfilPorHandle(handle);
    await this.prisma.block.deleteMany({
      where: { bloqueadorId: userId, bloqueadoId: otro.userId },
    });
    return { bloqueado: false, silenciado: false };
  }

  private async perfilPorHandle(handle: string) {
    const perfil = await this.prisma.profile.findUnique({
      where: { handle },
      select: { userId: true },
    });
    if (!perfil) throw new NotFoundException('No existe ese perfil.');
    return perfil;
  }
}
