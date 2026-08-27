import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';

import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Healthcheck para Coolify y para el balanceador.
 *
 * Consulta la base de verdad en vez de responder 200 a secas: un proceso vivo
 * con la base caida no esta sano, y marcarlo como sano deja al despliegue
 * creyendo que todo funciona mientras nadie puede entrar.
 */
@Controller('salud')
export class SaludController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async estado(@Res({ passthrough: true }) res: Response) {
    const inicio = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        estado: 'ok',
        base: 'ok',
        latenciaMs: Date.now() - inicio,
        version: process.env.npm_package_version ?? 'dev',
      };
    } catch {
      // 503 y no 200. El comentario ya decia esto, pero devolver un objeto
      // suelto hace que Nest responda **200**: la API se declaraba sana con la
      // base caida, y el orquestador la dejaba en rotacion recibiendo trafico
      // que no podia atender. Hay que poner el codigo a mano.
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { estado: 'degradado', base: 'error', latenciaMs: Date.now() - inicio };
    }
  }
}
