import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import Redis from 'ioredis';

import { PrismaService } from '../prisma/prisma.service.js';

async function pingRedis(): Promise<'ok' | 'error' | 'omitido'> {
  const url = process.env.REDIS_URL;
  if (!url) return 'omitido';

  const redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2_000,
    retryStrategy: () => null,
  });
  redis.on('error', () => undefined);

  try {
    await redis.connect();
    const pong = await redis.ping();
    return pong === 'PONG' ? 'ok' : 'error';
  } catch {
    return 'error';
  } finally {
    try {
      redis.disconnect();
    } catch {
      /* ya muerto */
    }
  }
}

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

  @SkipThrottle()
  @Get()
  async estado(@Res({ passthrough: true }) res: Response) {
    const inicio = Date.now();
    const latenciaMs = () => Date.now() - inicio;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return { estado: 'degradado', base: 'error', latenciaMs: latenciaMs() };
    }

    const redis = await pingRedis();
    const degradado = redis === 'error';

    return {
      estado: degradado ? 'degradado' : 'ok',
      base: 'ok',
      ...(redis !== 'omitido' ? { redis } : {}),
      latenciaMs: latenciaMs(),
      version: process.env.npm_package_version ?? 'dev',
    };
  }
}
