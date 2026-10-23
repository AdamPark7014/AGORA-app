import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { PLAZO_UDLAP_MS, RESULTADO_BUZON, hashCodigo, hashTokenSesion } from '@agora/auth';

import { AuthService } from './auth.service.js';
import { MENSAJE_UDLAP_VENCIDA, SesionGuard } from '../comun/sesion.guard.js';
import type { CorreoService } from '../correo/correo.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const SECRETO = 'test-secret-con-32-caracteres-min';
const AHORA = new Date('2026-10-22T12:00:00Z');
const UDLAP = 'ana.ramirez@udlap.mx';
const PERSONAL = 'ana.ramirez@gmail.com';

interface Usuario {
  id: string;
  email: string;
  estado: string;
  emailVerifiedAt: Date | null;
  passwordHash: string | null;
  passwordSetAt: Date | null;
  correoPersonal: string | null;
  udlapPendienteDesde: Date | null;
  profile: { id: string } | null;
}

interface Codigo {
  id: string;
  userId: string;
  destino: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  intentos: number;
  createdAt: Date;
}

/** Base en memoria con lo justo para el registro con correo personal. */
function base(usuarios: Usuario[] = []) {
  const codigos: Codigo[] = [];
  const enviados: Array<{ destino: string; codigo: string }> = [];
  const sesiones: Array<Record<string, unknown>> = [];
  const revocadas: Array<Record<string, unknown>> = [];
  const coincide = (u: Usuario, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => (u as unknown as Record<string, unknown>)[k] === v);

  const prisma = {
    university: { findFirst: async () => ({ id: 'udlap' }) },
    user: {
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        const u = usuarios.find((x) => coincide(x, where));
        return u ? { ...u } : null;
      },
      upsert: async ({ where, create }: { where: { email: string }; create: { email: string } }) => {
        let u = usuarios.find((x) => x.email === where.email);
        if (!u) {
          u = {
            id: `u${usuarios.length + 1}`,
            email: create.email,
            estado: 'PENDIENTE',
            emailVerifiedAt: null,
            passwordHash: null,
            passwordSetAt: null,
            correoPersonal: null,
            udlapPendienteDesde: null,
            profile: null,
          };
          usuarios.push(u);
        }
        return { ...u };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const u = usuarios.find((x) => x.id === where.id)!;
        Object.assign(u, data);
        return { ...u };
      },
    },
    otpCode: {
      findFirst: async ({ where }: { where: { userId: string; destino?: string } }) =>
        [...codigos]
          .filter((c) => c.userId === where.userId && (!where.destino || c.destino === where.destino))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null,
      count: async () => 0,
      create: async ({ data }: { data: Partial<Codigo> }) => {
        const c: Codigo = {
          id: `c${codigos.length + 1}`,
          userId: data.userId!,
          destino: data.destino ?? 'udlap',
          codeHash: data.codeHash!,
          expiresAt: data.expiresAt!,
          consumedAt: null,
          intentos: 0,
          createdAt: new Date(AHORA.getTime() + codigos.length),
        };
        codigos.push(c);
        return c;
      },
      updateMany: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const c = codigos.find((x) => x.id === where.id);
        if (!c) return { count: 0 };
        if ('consumedAt' in data) {
          if (c.consumedAt) return { count: 0 };
          c.consumedAt = data.consumedAt as Date;
        } else {
          c.intentos += 1;
        }
        return { count: 1 };
      },
    },
    session: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        sesiones.push(data);
        return {};
      },
      updateMany: async (args: Record<string, unknown>) => {
        revocadas.push(args);
        return { count: 2 };
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;

  const correo = {
    enviarCodigo: async (destino: string, codigo: string) => {
      enviados.push({ destino, codigo });
      return null;
    },
  } as unknown as CorreoService;

  const servicio = new AuthService(prisma, correo);
  servicio.verificarBuzon = async () => RESULTADO_BUZON.EXISTE;
  return { servicio, usuarios, codigos, enviados, sesiones, revocadas };
}

async function conSecreto<T>(fn: () => Promise<T>): Promise<T> {
  const previo = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = SECRETO;
  try {
    return await fn();
  } finally {
    if (previo === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previo;
  }
}

const usuarioBase = (extra: Partial<Usuario> = {}): Usuario => ({
  id: 'u1',
  email: UDLAP,
  estado: 'PENDIENTE',
  emailVerifiedAt: null,
  passwordHash: null,
  passwordSetAt: null,
  correoPersonal: null,
  udlapPendienteDesde: null,
  profile: null,
  ...extra,
});

test('si Microsoft dice que el buzón no existe, no se manda nada', async () => {
  await conSecreto(async () => {
    const b = base();
    b.servicio.verificarBuzon = async () => RESULTADO_BUZON.NO_EXISTE;
    // El aviso sale bajo el campo del correo personal: dice cuál correo falló
    // para que no parezca que rechazan el personal.
    await assert.rejects(
      b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, AHORA),
      (e: unknown) =>
        e instanceof BadRequestException &&
        e.message.includes(UDLAP) &&
        e.message.includes('tu correo personal está bien'),
    );
    assert.equal(b.enviados.length, 0);
    assert.equal(b.usuarios.length, 0, 'ni siquiera se crea la cuenta');
  });
});

test('si Microsoft no contesta, se pide intentar más tarde (no se adivina)', async () => {
  await conSecreto(async () => {
    const b = base();
    b.servicio.verificarBuzon = async () => RESULTADO_BUZON.DESCONOCIDO;
    await assert.rejects(
      b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, AHORA),
      ServiceUnavailableException,
    );
    assert.equal(b.enviados.length, 0);
  });
});

test('una cuenta que ya confirmó su UDLAP no puede usar el correo personal', async () => {
  await conSecreto(async () => {
    const b = base([usuarioBase({ emailVerifiedAt: AHORA, estado: 'ACTIVO' })]);
    await assert.rejects(b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, AHORA), ConflictException);
    assert.equal(b.enviados.length, 0);
  });
});

test('un correo personal ya ligado a otra cuenta no se reutiliza', async () => {
  await conSecreto(async () => {
    const b = base([usuarioBase({ id: 'otra', email: 'otra@udlap.mx', correoPersonal: PERSONAL })]);
    await assert.rejects(b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, AHORA), ConflictException);
  });
});

test('el código va al correo personal, atado a él, y abre una cuenta pendiente de UDLAP', async () => {
  await conSecreto(async () => {
    const b = base();
    await b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, AHORA);
    assert.equal(b.enviados.length, 1);
    assert.equal(b.enviados[0]!.destino, PERSONAL);
    const codigo = b.enviados[0]!.codigo;
    assert.equal(b.codigos[0]!.destino, 'personal');
    assert.equal(b.codigos[0]!.codeHash, hashCodigo(codigo, PERSONAL, SECRETO));

    // El código personal no sirve por la puerta del código UDLAP.
    await assert.rejects(b.servicio.verificarCodigo(UDLAP, codigo, {}, AHORA), UnauthorizedException);
    // Ni con otro correo personal.
    await assert.rejects(
      b.servicio.verificarCodigoPersonal(UDLAP, 'otro@gmail.com', codigo, {}, AHORA),
      UnauthorizedException,
    );

    const sesion = await b.servicio.verificarCodigoPersonal(UDLAP, PERSONAL, codigo, {}, AHORA);
    assert.equal(sesion.udlapPendiente, true);
    assert.equal(sesion.tieneContrasena, false);
    const u = b.usuarios[0]!;
    assert.equal(u.correoPersonal, PERSONAL);
    assert.deepEqual(u.udlapPendienteDesde, AHORA);
    assert.equal(u.emailVerifiedAt, null, 'el correo personal no confirma la UDLAP');
    assert.equal(b.sesiones[0]?.viaCodigo, true);
  });
});

test('pedir el código al correo personal justo después del UDLAP no espera el minuto', async () => {
  await conSecreto(async () => {
    const b = base();
    await b.servicio.solicitarCodigo(UDLAP, AHORA);
    // 24 s después (lo que tardó Adam el 23-10): antes daba 429 y no salía nada.
    const despues = new Date(AHORA.getTime() + 24_000);
    await b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, despues);
    assert.deepEqual(
      b.enviados.map((e) => e.destino),
      [UDLAP, PERSONAL],
    );
  });
});

test('dos códigos al correo personal seguidos sí esperan el minuto', async () => {
  await conSecreto(async () => {
    const b = base();
    await b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, AHORA);
    const despues = new Date(AHORA.getTime() + 24_000);
    await assert.rejects(
      b.servicio.solicitarCodigoPersonal(UDLAP, PERSONAL, despues),
      (e: unknown) => e instanceof HttpException && e.getStatus() === 429,
    );
    assert.equal(b.enviados.length, 1);
  });
});

test('confirmar la UDLAP borra el correo personal y la contraseña y cierra todas las sesiones', async () => {
  await conSecreto(async () => {
    const b = base([
      usuarioBase({
        correoPersonal: PERSONAL,
        udlapPendienteDesde: AHORA,
        passwordHash: '$argon2id$de-quien-se-registro',
        passwordSetAt: AHORA,
        profile: { id: 'p1' },
        estado: 'ACTIVO',
      }),
    ]);
    await b.servicio.solicitarCodigo(UDLAP, AHORA);
    const codigo = b.enviados[0]!.codigo;
    assert.equal(b.enviados[0]!.destino, UDLAP);

    const sesion = await b.servicio.verificarCodigo(UDLAP, codigo, {}, AHORA);
    const u = b.usuarios[0]!;
    assert.equal(u.udlapPendienteDesde, null);
    assert.equal(u.correoPersonal, null);
    assert.equal(u.passwordHash, null);
    assert.deepEqual(u.emailVerifiedAt, AHORA, 'ahora sí está confirmada');
    assert.equal(sesion.udlapPendiente, false);
    assert.equal(sesion.tieneContrasena, false, 'la pantalla pide elegir contraseña de nuevo');
    assert.equal(b.revocadas.length, 1, 'se cerraron las sesiones anteriores');
  });
});

test('entrar con contraseña no confirma la UDLAP de una cuenta pendiente', async () => {
  await conSecreto(async () => {
    const { hashContrasena } = await import('./contrasena.js');
    const b = base([
      usuarioBase({
        correoPersonal: PERSONAL,
        udlapPendienteDesde: AHORA,
        passwordHash: await hashContrasena('cafe-de-cholula-2026'),
        profile: { id: 'p1' },
        estado: 'ACTIVO',
      }),
    ]);
    const prisma = (b.servicio as unknown as { prisma: { user: Record<string, unknown> } }).prisma;
    prisma.user.findUnique = async () => ({ ...b.usuarios[0]!, loginFallidos: 0, loginBloqueadoHasta: null });
    const sesion = await b.servicio.entrar(UDLAP, 'cafe-de-cholula-2026', {}, { recordarme: true }, AHORA);
    assert.equal(sesion.udlapPendiente, true);
    assert.equal(b.usuarios[0]!.emailVerifiedAt, null);
  });
});

// --- El plazo: vencido, solo quedan las rutas de la cuenta

function guardCon(udlapPendienteDesde: Date | null) {
  const token = 'tok-de-prueba';
  const prisma = {
    session: {
      findUnique: async () => ({
        id: 's1',
        tokenHash: hashTokenSesion(token),
        expiresAt: new Date(Date.now() + 10 * 24 * 3600 * 1000),
        revokedAt: null,
        persistente: true,
        viaCodigo: false,
        createdAt: new Date(),
        user: {
          id: 'u1',
          email: UDLAP,
          estado: 'ACTIVO',
          roles: ['miembro'],
          passwordHash: 'x',
          udlapPendienteDesde,
          profile: { id: 'p1', handle: 'ana' },
        },
      }),
      update: async () => ({}),
    },
  } as unknown as PrismaService;
  const guard = new SesionGuard(prisma);
  const contexto = (url: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers: { authorization: `Bearer ${token}` }, cookies: {}, originalUrl: url }),
        getResponse: () => ({ cookie: () => {} }),
      }),
    }) as unknown as ExecutionContext;
  return { guard, contexto };
}

test('dentro del plazo la cuenta pendiente usa todo', async () => {
  const { guard, contexto } = guardCon(new Date());
  assert.equal(await guard.canActivate(contexto('/api/feed')), true);
});

test('vencido el plazo solo quedan las rutas de la cuenta', async () => {
  const hace31dias = new Date(Date.now() - PLAZO_UDLAP_MS - 24 * 3600 * 1000);
  const { guard, contexto } = guardCon(hace31dias);
  await assert.rejects(guard.canActivate(contexto('/api/feed')), (e: unknown) => {
    assert.ok(e instanceof ForbiddenException);
    assert.equal((e as ForbiddenException).message, MENSAJE_UDLAP_VENCIDA);
    return true;
  });
  assert.equal(await guard.canActivate(contexto('/api/auth/yo')), true);
  assert.equal(await guard.canActivate(contexto('/api/cuenta/eliminar')), true);
});

test('una cuenta confirmada nunca topa con el plazo', async () => {
  const { guard, contexto } = guardCon(null);
  assert.equal(await guard.canActivate(contexto('/api/feed')), true);
});
