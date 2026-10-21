import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { BLOQUEO_LOGIN_MS, MAX_FALLIDOS_LOGIN, VENTANA_CODIGO_RECIENTE_MS } from '@agora/auth';

import { AuthService, MENSAJE_ENTRADA_INVALIDA } from './auth.service.js';
import { hashContrasena, verificarContrasena } from './contrasena.js';
import type { CorreoService } from '../correo/correo.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const correoMock = { enviarCodigo: async () => {} } as unknown as CorreoService;
const AHORA = new Date('2026-10-21T12:00:00Z');
const CORREO = 'ana.ramirez@udlap.mx';
const CONTRASENA = 'cafe-de-cholula-2026';

/** Un hash real, calculado una vez: argon2 tarda decenas de ms. */
const hashReal = hashContrasena(CONTRASENA);

interface Fila {
  id: string;
  email: string;
  estado: string;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  loginFallidos: number;
  loginBloqueadoHasta: Date | null;
  profile: { id: string } | null;
}

/**
 * Base de un solo usuario que aplica `increment` y guarda lo que se escribe,
 * para comprobar contadores y bloqueos sin Postgres.
 */
function baseCon(fila: Fila) {
  const sesionesCreadas: Array<Record<string, unknown>> = [];
  const revocadas: Array<Record<string, unknown>> = [];
  const prisma = {
    user: {
      findUnique: async () => ({ ...fila }),
      update: async ({ data }: { data: Record<string, unknown> }) => {
        for (const [k, v] of Object.entries(data)) {
          if (k === 'loginFallidos' && typeof v === 'object' && v && 'increment' in v) {
            fila.loginFallidos += (v as { increment: number }).increment;
          } else {
            (fila as unknown as Record<string, unknown>)[k] = v;
          }
        }
        return { ...fila };
      },
    },
    session: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        sesionesCreadas.push(data);
        return {};
      },
      updateMany: async (args: Record<string, unknown>) => {
        revocadas.push(args);
        return { count: 1 };
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;
  return { servicio: new AuthService(prisma, correoMock), fila, sesionesCreadas, revocadas };
}

const conContrasena = async (extra: Partial<Fila> = {}): Promise<Fila> => ({
  id: 'u1',
  email: CORREO,
  estado: 'ACTIVO',
  emailVerifiedAt: AHORA,
  passwordHash: await hashReal,
  loginFallidos: 0,
  loginBloqueadoHasta: null,
  profile: { id: 'p1' },
  ...extra,
});

async function conSecreto<T>(fn: () => Promise<T>): Promise<T> {
  const previo = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'test-secret-con-32-caracteres-min';
  try {
    return await fn();
  } finally {
    if (previo === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previo;
  }
}

// --- argon2

test('el hash no es la contraseña, verifica la buena y rechaza la mala', async () => {
  const h = await hashReal;
  assert.ok(h.startsWith('$argon2id$'));
  assert.ok(!h.includes(CONTRASENA));
  assert.equal(await verificarContrasena(h, CONTRASENA), true);
  assert.equal(await verificarContrasena(h, CONTRASENA + 'x'), false);
  assert.equal(await verificarContrasena('basura', CONTRASENA), false, 'un hash roto no lanza');
});

// --- entrar

test('entrar con la contraseña correcta abre sesion por contraseña y limpia fallos', async () => {
  await conSecreto(async () => {
    const { servicio, fila, sesionesCreadas } = baseCon(await conContrasena({ loginFallidos: 3 }));
    const r = await servicio.entrar(CORREO, CONTRASENA, {}, { recordarme: true }, AHORA);
    assert.ok(r.token.length > 40);
    assert.equal(r.tienePerfil, true);
    assert.equal(r.tieneContrasena, true);
    assert.equal(fila.loginFallidos, 0);
    assert.equal(sesionesCreadas[0]?.viaCodigo, false);
    assert.equal(sesionesCreadas[0]?.persistente, true);
  });
});

test('sin "recordarme" la sesion es corta y no persistente', async () => {
  await conSecreto(async () => {
    const { servicio, sesionesCreadas } = baseCon(await conContrasena());
    const r = await servicio.entrar(CORREO, CONTRASENA, {}, { recordarme: false }, AHORA);
    assert.equal(sesionesCreadas[0]?.persistente, false);
    assert.ok(r.expiraEn.getTime() - AHORA.getTime() <= 24 * 3600_000);
  });
});

test('correo desconocido, cuenta sin contraseña y contraseña mal dan el mismo mensaje', async () => {
  await conSecreto(async () => {
    const casos = [
      baseCon(await conContrasena({ passwordHash: null })),
      baseCon(await conContrasena({ estado: 'BAJA' })),
      baseCon(await conContrasena()),
    ];
    const sinUsuario = new AuthService(
      { user: { findUnique: async () => null } } as unknown as PrismaService,
      correoMock,
    );
    for (const { servicio } of casos) {
      await assert.rejects(
        () => servicio.entrar(CORREO, 'otra-cosa-distinta', {}, { recordarme: true }, AHORA),
        (e: unknown) => e instanceof UnauthorizedException && e.message === MENSAJE_ENTRADA_INVALIDA,
      );
    }
    await assert.rejects(
      () => sinUsuario.entrar('nadie@udlap.mx', 'otra-cosa-distinta', {}, { recordarme: true }, AHORA),
      (e: unknown) => e instanceof UnauthorizedException && e.message === MENSAJE_ENTRADA_INVALIDA,
    );
  });
});

test('al quinto fallo seguido se bloquea quince minutos y el bloqueo responde 429', async () => {
  await conSecreto(async () => {
    const { servicio, fila } = baseCon(await conContrasena());
    for (let i = 0; i < MAX_FALLIDOS_LOGIN; i += 1) {
      await assert.rejects(
        () => servicio.entrar(CORREO, 'mal', {}, { recordarme: true }, AHORA),
        UnauthorizedException,
      );
    }
    assert.equal(fila.loginFallidos, MAX_FALLIDOS_LOGIN);
    assert.equal(fila.loginBloqueadoHasta?.getTime(), AHORA.getTime() + BLOQUEO_LOGIN_MS);

    // Ni con la buena, mientras dure.
    await assert.rejects(
      () => servicio.entrar(CORREO, CONTRASENA, {}, { recordarme: true }, AHORA),
      (e: unknown) => e instanceof HttpException && e.getStatus() === 429 && /código/.test(e.message),
    );

    // Pasado el bloqueo, entra y el contador vuelve a cero.
    const despues = new Date(AHORA.getTime() + BLOQUEO_LOGIN_MS + 1);
    await servicio.entrar(CORREO, CONTRASENA, {}, { recordarme: true }, despues);
    assert.equal(fila.loginFallidos, 0);
    assert.equal(fila.loginBloqueadoHasta, null);
  });
});

// --- fijar contraseña

const sesionPorCodigo = { id: 's1', viaCodigo: true, createdAt: AHORA };

test('una cuenta sin contraseña la crea desde cualquier sesion, sin cerrar las demas', async () => {
  const { servicio, fila, revocadas } = baseCon(await conContrasena({ passwordHash: null }));
  const vieja = { id: 's1', viaCodigo: true, createdAt: new Date(AHORA.getTime() - 60 * 24 * 3600_000) };
  await servicio.fijarContrasena('u1', vieja, 'mi-nueva-clave-2026', AHORA);
  assert.ok(fila.passwordHash?.startsWith('$argon2id$'));
  assert.equal(await verificarContrasena(fila.passwordHash!, 'mi-nueva-clave-2026'), true);
  assert.equal(revocadas.length, 0, 'crear la primera no echa al telefono');
});

test('con contraseña puesta, solo una sesion reciente por codigo la reemplaza; y cierra las demas', async () => {
  const { servicio, fila, revocadas } = baseCon(await conContrasena());
  const porContrasena = { id: 's2', viaCodigo: false, createdAt: AHORA };
  await assert.rejects(
    () => servicio.fijarContrasena('u1', porContrasena, 'otra-clave-larga', AHORA),
    ForbiddenException,
  );
  const tarde = { id: 's3', viaCodigo: true, createdAt: new Date(AHORA.getTime() - VENTANA_CODIGO_RECIENTE_MS - 1) };
  await assert.rejects(
    () => servicio.fijarContrasena('u1', tarde, 'otra-clave-larga', AHORA),
    ForbiddenException,
  );

  await servicio.fijarContrasena('u1', sesionPorCodigo, 'otra-clave-larga', AHORA);
  assert.equal(await verificarContrasena(fila.passwordHash!, 'otra-clave-larga'), true);
  assert.equal(revocadas.length, 1);
  const where = (revocadas[0] as { where: { id: { not: string } } }).where;
  assert.equal(where.id.not, 's1', 'la sesion que la cambio sigue viva');
});

test('las reglas de la contraseña se aplican con la forma de error de ZodPipe', async () => {
  const { servicio } = baseCon(await conContrasena({ passwordHash: null }));
  for (const mala of ['corta7', 'password1', 'ana.ramirez-2026', 'zzzzzzzzzz']) {
    await assert.rejects(
      () => servicio.fijarContrasena('u1', sesionPorCodigo, mala, AHORA),
      (e: unknown) => {
        if (!(e instanceof BadRequestException)) return false;
        const r = e.getResponse() as { mensaje: string; errores: Array<{ campo: string }> };
        return typeof r.mensaje === 'string' && r.errores[0]?.campo === 'contrasena';
      },
      `deberia rechazar ${mala}`,
    );
  }
});

// --- cambiar contraseña

test('cambiarla exige la actual, la valida, y cierra las demas sesiones', async () => {
  const { servicio, fila, revocadas } = baseCon(await conContrasena());
  await assert.rejects(
    () => servicio.cambiarContrasena('u1', 's1', 'no-es-esta', 'nueva-clave-larga', AHORA),
    UnauthorizedException,
  );
  assert.equal(fila.loginFallidos, 1, 'adivinar desde aqui tambien cuenta');

  await assert.rejects(
    () => servicio.cambiarContrasena('u1', 's1', CONTRASENA, 'corta7', AHORA),
    BadRequestException,
  );

  await servicio.cambiarContrasena('u1', 's1', CONTRASENA, 'nueva-clave-larga', AHORA);
  assert.equal(await verificarContrasena(fila.passwordHash!, 'nueva-clave-larga'), true);
  assert.equal(fila.loginFallidos, 0);
  assert.equal(revocadas.length, 1);
});

test('una cuenta sin contraseña no puede "cambiarla": tiene que crearla', async () => {
  const { servicio } = baseCon(await conContrasena({ passwordHash: null }));
  await assert.rejects(
    () => servicio.cambiarContrasena('u1', 's1', 'x', 'nueva-clave-larga', AHORA),
    BadRequestException,
  );
});
