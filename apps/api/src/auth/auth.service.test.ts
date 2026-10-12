import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from './auth.service.js';
import type { CorreoService } from '../correo/correo.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const correoMock = {
  enviarCodigo: async () => {},
} as unknown as CorreoService;

async function withSessionSecret<T>(fn: () => Promise<T>): Promise<T> {
  const prev = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test-secret-con-32-caracteres-min';
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = prev;
  }
}

test('solicitarCodigo rechaza dominio no habilitado', async () => {
  await withSessionSecret(async () => {
    const prisma = {
      university: { findFirst: async () => null },
    } as unknown as PrismaService;
    const servicio = new AuthService(prisma, correoMock);

    await assert.rejects(
      () => servicio.solicitarCodigo('alguien@gmail.com'),
      (err: unknown) => err instanceof BadRequestException,
    );
  });
});

test('solicitarCodigo respeta espera de un minuto entre envios', async () => {
  await withSessionSecret(async () => {
    const ahora = new Date('2026-08-27T12:00:00Z');
    const prisma = {
      university: {
        findFirst: async () => ({ id: 'uni-1', emailDomain: 'udlap.mx', activa: true }),
      },
      user: {
        upsert: async () => ({ id: 'u1', email: 'a@udlap.mx' }),
      },
      otpCode: {
        findFirst: async () => ({ createdAt: new Date(ahora.getTime() - 10_000) }),
        count: async () => 1,
        create: async () => {
          throw new Error('no debe crear otp');
        },
      },
    } as unknown as PrismaService;
    const servicio = new AuthService(prisma, correoMock);

    await assert.rejects(
      () => servicio.solicitarCodigo('a@udlap.mx', ahora),
      (err: unknown) => err instanceof HttpException && (err as HttpException).getStatus() === 429,
    );
  });
});

test('solicitarCodigo respeta tope diario por buzon', async () => {
  await withSessionSecret(async () => {
    const ahora = new Date('2026-08-27T12:00:00Z');
    const prisma = {
      university: {
        findFirst: async () => ({ id: 'uni-1', emailDomain: 'udlap.mx', activa: true }),
      },
      user: {
        upsert: async () => ({ id: 'u1', email: 'a@udlap.mx' }),
      },
      otpCode: {
        findFirst: async () => ({ createdAt: new Date(ahora.getTime() - 120_000) }),
        count: async () => 10,
        create: async () => {
          throw new Error('no debe crear otp');
        },
      },
    } as unknown as PrismaService;
    const servicio = new AuthService(prisma, correoMock);

    await assert.rejects(
      () => servicio.solicitarCodigo('a@udlap.mx', ahora),
      (err: unknown) => err instanceof HttpException && (err as HttpException).getStatus() === 429,
    );
  });
});

test('verificarCodigo sin usuario ni otp da mensaje uniforme', async () => {
  await withSessionSecret(async () => {
    const prisma = {
      user: { findUnique: async () => null },
    } as unknown as PrismaService;
    // Apaga maestro de desarrollo para este caso.
    const prevCod = process.env.DEV_OTP_MAESTRO;
    const prevCor = process.env.DEV_OTP_CORREOS;
    const prevEnv = process.env.NODE_ENV;
    try {
      delete process.env.DEV_OTP_MAESTRO;
      delete process.env.DEV_OTP_CORREOS;
      process.env.NODE_ENV = 'test';

      const servicio = new AuthService(prisma, correoMock);
      await assert.rejects(
        () =>
          servicio.verificarCodigo('a@udlap.mx', '123456', {}, new Date()),
        (err: unknown) =>
          err instanceof UnauthorizedException &&
          String((err as UnauthorizedException).message).includes('Codigo invalido'),
      );
    } finally {
      if (prevCod === undefined) delete process.env.DEV_OTP_MAESTRO;
      else process.env.DEV_OTP_MAESTRO = prevCod;
      if (prevCor === undefined) delete process.env.DEV_OTP_CORREOS;
      else process.env.DEV_OTP_CORREOS = prevCor;
      if (prevEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevEnv;
    }
  });
});

test('verificarCodigo incorrecto incrementa intentos y no abre sesion', async () => {
  await withSessionSecret(async () => {
    const { hashCodigo, vencimientoDesde } = await import('@agora/auth');
    const ahora = new Date('2026-08-27T12:00:00Z');
    let intentos = 0;
    let sesiones = 0;

    const prisma = {
      user: {
        findUnique: async () => ({
          id: 'u1',
          email: 'a@udlap.mx',
          emailVerifiedAt: null,
          profile: null,
        }),
      },
      otpCode: {
        findFirst: async () => ({
          id: 'otp1',
          codeHash: hashCodigo('111111', 'a@udlap.mx', process.env.SESSION_SECRET!),
          expiresAt: vencimientoDesde(ahora),
          consumedAt: null,
          intentos: 0,
        }),
        updateMany: async ({ data }: { data: { intentos?: { increment: number }; consumedAt?: Date } }) => {
          if (data.intentos) intentos += data.intentos.increment;
          if (data.consumedAt) throw new Error('no debe consumir codigo incorrecto');
          return { count: 1 };
        },
      },
      session: {
        create: async () => {
          sesiones += 1;
        },
      },
      $transaction: async () => {
        sesiones += 1;
      },
    } as unknown as PrismaService;

    const prevCod = process.env.DEV_OTP_MAESTRO;
    const prevCor = process.env.DEV_OTP_CORREOS;
    try {
      delete process.env.DEV_OTP_MAESTRO;
      delete process.env.DEV_OTP_CORREOS;

      const servicio = new AuthService(prisma, correoMock);
      await assert.rejects(
        () => servicio.verificarCodigo('a@udlap.mx', '999999', {}, ahora),
        (err: unknown) => err instanceof UnauthorizedException,
      );
      assert.equal(intentos, 1);
      assert.equal(sesiones, 0);
    } finally {
      if (prevCod === undefined) delete process.env.DEV_OTP_MAESTRO;
      else process.env.DEV_OTP_MAESTRO = prevCod;
      if (prevCor === undefined) delete process.env.DEV_OTP_CORREOS;
      else process.env.DEV_OTP_CORREOS = prevCor;
    }
  });
});

test('volver a entrar no levanta una suspension', async () => {
  await withSessionSecret(async () => {
    const { hashCodigo, vencimientoDesde } = await import('@agora/auth');
    const ahora = new Date('2026-10-08T12:00:00Z');
    let estadoGuardado: string | undefined;

    const prisma = {
      user: {
        findUnique: async () => ({
          id: 'u1',
          email: 'a@udlap.mx',
          estado: 'SUSPENDIDO',
          emailVerifiedAt: ahora,
          profile: { id: 'p1' },
        }),
        update: (args: { data: { estado: string } }) => {
          estadoGuardado = args.data.estado;
          return Promise.resolve({});
        },
      },
      otpCode: {
        findFirst: async () => ({
          id: 'otp1',
          codeHash: hashCodigo('111111', 'a@udlap.mx', process.env.SESSION_SECRET!),
          expiresAt: vencimientoDesde(ahora),
          consumedAt: null,
          intentos: 0,
        }),
        updateMany: async () => ({ count: 1 }),
      },
      session: { create: () => Promise.resolve({}) },
      $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    } as unknown as PrismaService;

    const prevCod = process.env.DEV_OTP_MAESTRO;
    try {
      delete process.env.DEV_OTP_MAESTRO;
      await new AuthService(prisma, correoMock).verificarCodigo('a@udlap.mx', '111111', {}, ahora);
      assert.equal(estadoGuardado, 'SUSPENDIDO');
    } finally {
      if (prevCod === undefined) delete process.env.DEV_OTP_MAESTRO;
      else process.env.DEV_OTP_MAESTRO = prevCod;
    }
  });
});

/**
 * Simula una tabla de un solo codigo que aplica las condiciones del WHERE como
 * lo haria Postgres. Sirve para comprobar que el tope de intentos y el canje
 * unico aguantan peticiones en paralelo.
 */
async function otpEnParalelo(codigoCorrecto: string, intentosIniciales = 0) {
  const { hashCodigo, vencimientoDesde } = await import('@agora/auth');
  const ahora = new Date('2026-10-12T12:00:00Z');
  const fila = {
    id: 'otp1',
    codeHash: hashCodigo(codigoCorrecto, 'a@udlap.mx', process.env.SESSION_SECRET!),
    expiresAt: vencimientoDesde(ahora),
    consumedAt: null as Date | null,
    intentos: intentosIniciales,
  };
  let sesiones = 0;
  const prisma = {
    user: {
      findUnique: async () => ({
        id: 'u1',
        email: 'a@udlap.mx',
        estado: 'ACTIVO',
        emailVerifiedAt: ahora,
        profile: { id: 'p1' },
      }),
      update: async () => ({}),
    },
    otpCode: {
      // Todas las lecturas ven la fila tal como estaba: es la ventana de carrera.
      findFirst: async () => ({ ...fila }),
      updateMany: async ({
        where,
        data,
      }: {
        where: { consumedAt: null; intentos?: { lt: number } };
        data: { intentos?: { increment: number }; consumedAt?: Date };
      }) => {
        await new Promise((r) => setImmediate(r));
        if (fila.consumedAt !== null) return { count: 0 };
        if (where.intentos && !(fila.intentos < where.intentos.lt)) return { count: 0 };
        if (data.intentos) fila.intentos += data.intentos.increment;
        if (data.consumedAt) fila.consumedAt = data.consumedAt;
        return { count: 1 };
      },
    },
    session: { create: () => Promise.resolve({}) },
    $transaction: async (ops: Promise<unknown>[]) => {
      sesiones += 1;
      return Promise.all(ops);
    },
  } as unknown as PrismaService;
  return { servicio: new AuthService(prisma, correoMock), fila, ahora, sesiones: () => sesiones };
}

test('verificaciones en paralelo no superan el tope de intentos', async () => {
  await withSessionSecret(async () => {
    const prevCod = process.env.DEV_OTP_MAESTRO;
    try {
      delete process.env.DEV_OTP_MAESTRO;
      const { servicio, fila, ahora } = await otpEnParalelo('111111');
      // Cincuenta adivinanzas a la vez: antes todas leian "0 de 5" y contaban.
      await Promise.allSettled(
        Array.from({ length: 50 }, (_, i) =>
          servicio.verificarCodigo('a@udlap.mx', String(200000 + i), {}, ahora),
        ),
      );
      assert.equal(fila.intentos, 5);
      // Y con el tope gastado, ni el codigo correcto entra ya.
      await assert.rejects(
        () => servicio.verificarCodigo('a@udlap.mx', '111111', {}, ahora),
        (err: unknown) => err instanceof UnauthorizedException,
      );
    } finally {
      if (prevCod === undefined) delete process.env.DEV_OTP_MAESTRO;
      else process.env.DEV_OTP_MAESTRO = prevCod;
    }
  });
});

test('el mismo codigo canjeado dos veces a la vez abre una sola sesion', async () => {
  await withSessionSecret(async () => {
    const prevCod = process.env.DEV_OTP_MAESTRO;
    try {
      delete process.env.DEV_OTP_MAESTRO;
      const { servicio, ahora, sesiones } = await otpEnParalelo('111111');
      const resultados = await Promise.allSettled([
        servicio.verificarCodigo('a@udlap.mx', '111111', {}, ahora),
        servicio.verificarCodigo('a@udlap.mx', '111111', {}, ahora),
      ]);
      assert.equal(resultados.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(sesiones(), 1);
    } finally {
      if (prevCod === undefined) delete process.env.DEV_OTP_MAESTRO;
      else process.env.DEV_OTP_MAESTRO = prevCod;
    }
  });
});
