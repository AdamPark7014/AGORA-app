import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DirectorioService } from './directorio.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const perfil = (o: { userId: string; visibilidad: string; comparte: boolean }) => ({
  id: `p-${o.userId}`,
  userId: o.userId,
  handle: o.userId,
  nombre: 'Ana',
  apellidos: 'López',
  fotoUrl: null,
  visibilidad: o.visibilidad,
  generacion: 2024,
  carrera: { nombre: 'Medicina', escuela: { nombre: 'Salud' } },
  colegio: { nombre: 'Colegio Ray Lindley' },
  user: { roles: [], memberships: o.comparte ? [{ communityId: 'c1' }] : [] },
});

const servicio = (perfiles: unknown[], capturar?: (where: unknown) => void) =>
  new DirectorioService({
    membership: { findMany: async () => [{ communityId: 'c1' }] },
    profile: {
      findMany: async (args: { where: unknown }) => {
        capturar?.(args.where);
        return perfiles;
      },
    },
  } as unknown as PrismaService);

const filtros = { limite: 20 } as Parameters<DirectorioService['buscar']>[0];

test('el directorio no muestra colegio ni generacion de un perfil restringido', async () => {
  const r = await servicio([
    perfil({ userId: 'restringida', visibilidad: 'COMUNIDADES', comparte: false }),
    perfil({ userId: 'companera', visibilidad: 'COMUNIDADES', comparte: true }),
    perfil({ userId: 'abierta', visibilidad: 'UNIVERSIDAD', comparte: false }),
  ]).buscar(filtros, 'yo');

  const [restringida, companera, abierta] = r.resultados;
  assert.equal(restringida?.colegio, null);
  assert.equal(restringida?.generacion, null);
  assert.equal(restringida?.carrera, 'Medicina');
  assert.equal(companera?.colegio, 'Colegio Ray Lindley');
  assert.equal(abierta?.generacion, 2024);
});

test('filtrar por colegio deja fuera a los perfiles restringidos', async () => {
  let where: { AND?: unknown } | undefined;
  await servicio([], (w) => {
    where = w as { AND?: unknown };
  }).buscar({ ...filtros, colegio: 'ray-lindley' }, 'yo');

  assert.ok(Array.isArray(where?.AND), 'debe exigir visibilidad completa al filtrar por colegio');
});
