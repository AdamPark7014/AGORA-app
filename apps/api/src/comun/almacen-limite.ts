import { Logger } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import Redis from 'ioredis';

const log = new Logger('Limite');

/** Ventanas globales (por persona / IP — ver LimiteGuard). */
export const VENTANAS_LIMITE = [
  { name: 'corto', ttl: 60_000, limit: 240 },
  { name: 'largo', ttl: 3_600_000, limit: 6_000 },
] as const;

/**
 * Techos OTP por IP (sin sesion). Mas bajos que el global: cada `solicitar`
 * cuesta un correo real. Siguen holgados para el NAT del campus (muchos
 * alumnos, una IP); el tope de verdad por buzon vive en `@agora/auth`
 * (1/min, 10/dia).
 */
export const LIMITE_OTP_SOLICITAR = {
  corto: { ttl: 60_000, limit: 20 },
  largo: { ttl: 3_600_000, limit: 200 },
} as const;

/** Verificar es mas barato que enviar, pero adivinar codigos se hace aqui. */
export const LIMITE_OTP_VERIFICAR = {
  corto: { ttl: 60_000, limit: 30 },
  largo: { ttl: 3_600_000, limit: 300 },
} as const;

/** Forma objeto de ThrottlerModuleOptions (con storage opcional). */
export type OpcionesLimite = {
  throttlers: Array<{ name: string; ttl: number; limit: number }>;
  storage?: ThrottlerStorage;
};

/**
 * Storage compartido en Redis si responde; si no, `undefined` = memoria del
 * proceso. La API debe arrancar aunque Redis este caido.
 */
export async function crearAlmacenLimite(
  url: string | undefined = process.env.REDIS_URL,
): Promise<ThrottlerStorage | undefined> {
  if (!url) {
    log.warn('REDIS_URL ausente: throttle en memoria (no compartido entre replicas)');
    return undefined;
  }

  const redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2_000,
    retryStrategy: () => null,
  });
  // Evita "Unhandled error event" mientras el try/catch decide el fallback.
  redis.on('error', () => undefined);

  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== 'PONG') throw new Error(`ping inesperado: ${pong}`);
    log.log('Throttle compartido en Redis');
    return new ThrottlerStorageRedisService(redis);
  } catch (err) {
    const motivo = err instanceof Error ? err.message : String(err);
    log.warn(`Redis no disponible (${motivo}): throttle en memoria; la API sigue`);
    try {
      redis.disconnect();
    } catch {
      /* ya muerto */
    }
    return undefined;
  }
}

export async function opcionesLimite(
  url: string | undefined = process.env.REDIS_URL,
): Promise<OpcionesLimite> {
  const storage = await crearAlmacenLimite(url);
  return {
    throttlers: VENTANAS_LIMITE.map((v) => ({ ...v })),
    ...(storage ? { storage } : {}),
  };
}
