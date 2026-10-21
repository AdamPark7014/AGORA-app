import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ExecutionContext } from '@nestjs/common';
import { TTL_SESION_MS } from '@agora/auth';

import { COOKIE_SESION, SesionGuard } from './sesion.guard.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const DIA = 24 * 60 * 60 * 1000;

/** Guard con una sesion que vence en `vence` ms; registra renovaciones y cookies. */
const probar = async (vence: number, porCookie: boolean, persistente = true) => {
  const renovaciones: Date[] = [];
  const cookies: { nombre: string; expires?: Date }[] = [];
  const prisma = {
    session: {
      findUnique: async () => ({
        id: 's1',
        revokedAt: null,
        persistente,
        viaCodigo: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + vence),
        user: { id: 'u1', email: 'a@udlap.mx', roles: [], estado: 'ACTIVO', profile: null, passwordHash: null },
      }),
      update: async ({ data }: { data: { expiresAt: Date } }) => {
        renovaciones.push(data.expiresAt);
        return {};
      },
    },
  } as unknown as PrismaService;
  const req = porCookie
    ? { cookies: { [COOKIE_SESION]: 'tok' }, headers: {} }
    : { cookies: {}, headers: { authorization: 'Bearer tok' } };
  const res = {
    cookie: (nombre: string, _v: string, op: { expires?: Date }) => cookies.push({ nombre, expires: op.expires }),
  };
  const contexto = {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  await new SesionGuard(prisma).canActivate(contexto);
  return { renovaciones, cookies };
};

test('una sesion usada hoy no se reescribe en cada peticion', async () => {
  const { renovaciones, cookies } = await probar(TTL_SESION_MS - 60_000, true);
  assert.equal(renovaciones.length, 0);
  assert.equal(cookies.length, 0);
});

test('una sesion de hace dias se renueva y la cookie se extiende', async () => {
  const { renovaciones, cookies } = await probar(TTL_SESION_MS - 10 * DIA, true);
  assert.equal(renovaciones.length, 1);
  assert.ok(renovaciones[0]!.getTime() > Date.now() + TTL_SESION_MS - DIA);
  assert.equal(cookies[0]?.nombre, COOKIE_SESION);
});

test('la app nativa (token) se renueva en la base sin cookie', async () => {
  const { renovaciones, cookies } = await probar(5 * DIA, false);
  assert.equal(renovaciones.length, 1);
  assert.equal(cookies.length, 0);
});

test('una sesion sin "recordarme" no se renueva aunque le quede poco', async () => {
  const { renovaciones, cookies } = await probar(5 * DIA, true, false);
  assert.equal(renovaciones.length, 0);
  assert.equal(cookies.length, 0);
});
