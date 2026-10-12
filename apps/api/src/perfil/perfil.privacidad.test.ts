import assert from 'node:assert/strict';
import { test } from 'node:test';

import { NotFoundException } from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service.js';
import { PostsService } from '../posts/posts.service.js';
import { PerfilService } from './perfil.service.js';

const DUENO = 'u-dueno';
const YO = 'u-yo';

const perfilCon = (opciones: { visibilidad: string; bloqueado?: boolean; comparte?: boolean }) => {
  let consultoSeguidores = false;
  const prisma = {
    profile: {
      findUnique: async () => ({
        userId: DUENO,
        visibilidad: opciones.visibilidad,
        user: { estado: 'ACTIVO' },
      }),
    },
    block: {
      findFirst: async ({ where }: { where: { bloqueadorId: string; soloSilencio: boolean } }) =>
        opciones.bloqueado && where.bloqueadorId === DUENO && where.soloSilencio === false
          ? { id: 'b' }
          : null,
    },
    membership: {
      findFirst: async () => (opciones.comparte ? { id: 'm' } : null),
      findMany: async () => [],
    },
    follow: {
      findMany: async () => {
        consultoSeguidores = true;
        return [];
      },
    },
    post: { findMany: async () => [] },
  } as unknown as PrismaService;
  return { servicio: new PerfilService(prisma, {} as never, {} as never), consulto: () => consultoSeguidores };
};

test('la lista de seguidores de un perfil "solo mis comunidades" no se ve desde fuera', async () => {
  const { servicio, consulto } = perfilCon({ visibilidad: 'COMUNIDADES', comparte: false });

  const r = await servicio.listarSeguidores('alguien', YO);

  assert.deepEqual(r, { personas: [], restringido: true });
  assert.equal(consulto(), false);
});

test('quien comparte comunidad si ve la lista', async () => {
  const { servicio, consulto } = perfilCon({ visibilidad: 'COMUNIDADES', comparte: true });

  const r = await servicio.listarSiguiendo('alguien', YO);

  assert.equal(r.restringido, false);
  assert.equal(consulto(), true);
});

test('si el dueno me bloqueo, su perfil y sus listas no existen para mi', async () => {
  const { servicio } = perfilCon({ visibilidad: 'UNIVERSIDAD', bloqueado: true });

  await assert.rejects(servicio.listarSeguidores('alguien', YO), NotFoundException);
  await assert.rejects(servicio.publicacionesDe('alguien', YO), NotFoundException);
});

test('silenciar es unilateral: el silenciado sigue viendo a quien lo silencio', async () => {
  let filtro: unknown;
  const prisma = {
    user: { findUnique: async () => ({ universityId: 'udlap' }) },
    block: {
      findMany: async ({ where }: { where: unknown }) => {
        filtro = where;
        return [];
      },
    },
    post: { findMany: async () => [] },
    guardado: { findMany: async () => [] },
  } as unknown as PrismaService;
  const auth = { asegurarMembresiaCampus: async () => undefined };
  const posts = new PostsService(prisma, {} as never, auth as never, {} as never, {} as never);

  await posts.feed(YO, { limite: 20 } as never);

  assert.deepEqual(filtro, {
    OR: [{ bloqueadorId: YO }, { bloqueadoId: YO, soloSilencio: false }],
  });
});

test('compartir "Toda la UDLAP" no abre un perfil restringido', async () => {
  // Todo el mundo es miembro del campus: si contara como comunidad compartida,
  // "solo mis comunidades" no restringiria a nadie.
  let filtro: { community?: { tipo?: unknown } } | undefined;
  const prisma = {
    profile: {
      findUnique: async () => ({ userId: 'otro', visibilidad: 'COMUNIDADES', user: { estado: 'ACTIVO' } }),
    },
    block: { findFirst: async () => null },
    membership: {
      findFirst: async (args: { where: { community?: { tipo?: unknown } } }) => {
        filtro = args.where;
        return null;
      },
    },
    follow: { findMany: async () => [] },
  } as unknown as PrismaService;

  await new PerfilService(prisma, {} as never, {} as never).listarSeguidores('alguien', YO);
  assert.deepEqual(filtro?.community?.tipo, { not: 'UNIVERSIDAD' });
});

test('sugerencias: primero mi carrera, sin mi, sin a quien sigo ni bloqueados', async () => {
  const consultas: Array<{ where: { carreraId?: string; userId: { notIn: string[] } }; take: number }> = [];
  const persona = (id: string) => ({
    userId: id,
    handle: id,
    nombre: id,
    apellidos: '',
    fotoUrl: null,
    carrera: { nombre: 'Actuaria' },
  });
  const prisma = {
    user: {
      findUnique: async () => ({
        universityId: 'udlap',
        profile: { carreraId: 'c-act' },
        siguiendo: [{ seguidoId: 'u-sigo' }],
      }),
    },
    block: { findMany: async () => [{ bloqueadorId: YO, bloqueadoId: 'u-bloq' }] },
    profile: {
      findMany: async (args: (typeof consultas)[number]) => {
        consultas.push(args);
        return args.where.carreraId ? [persona('u-carrera')] : [persona('u-campus')];
      },
    },
  } as unknown as PrismaService;
  const servicio = new PerfilService(prisma, {} as never, {} as never);

  const r = await servicio.sugerencias(YO, 2);

  assert.deepEqual(r.map((p) => [p.handle, p.deTuCarrera]), [
    ['u-carrera', true],
    ['u-campus', false],
  ]);
  assert.equal(consultas[0]!.where.carreraId, 'c-act');
  assert.deepEqual(new Set(consultas[0]!.where.userId.notIn), new Set([YO, 'u-sigo', 'u-bloq']));
  assert.ok(consultas[1]!.where.userId.notIn.includes('u-carrera'));
  assert.equal(consultas[1]!.take, 1);
});
