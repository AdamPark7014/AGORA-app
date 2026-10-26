import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { MarketplaceService } from './marketplace.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

test('crear falla si el usuario no existe', async () => {
  const prisma = {
    user: { findUnique: async () => null },
  } as unknown as PrismaService;
  const servicio = new MarketplaceService(prisma);

  await assert.rejects(
    () =>
      servicio.crear('u1', {
        titulo: 'Libro',
        descripcion: 'Calc 1',
        categoria: 'LIBROS',
        precioMxn: 100,
        imagenIds: [],
      }),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('crear rechaza imagenes ya ligadas a otro anuncio o post', async () => {
  const prevKey = process.env.ANTHROPIC_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.MODERACION_OPCIONAL = 'true';

    const prisma = {
      user: { findUnique: async () => ({ universityId: 'uni-1' }) },
      // Solo una de las dos es de esta persona y esta libre.
      media: { findMany: async () => [{ url: '/m/img1.jpg' }] },
      anuncio: {
        create: async () => {
          throw new Error('no debe crear');
        },
      },
    } as unknown as PrismaService;
    const servicio = new MarketplaceService(prisma);

    await assert.rejects(
      () =>
        servicio.crear('u1', {
          titulo: 'Bici',
          descripcion: 'Rodada',
          categoria: 'OTRO',
          precioMxn: 500,
          imagenIds: ['img1', 'img2'],
        }),
      (err: unknown) => err instanceof BadRequestException,
    );
  } finally {
    if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});

test('actualizar solo lo permite el vendedor', async () => {
  const prisma = {
    anuncio: {
      findUnique: async () => ({
        vendedorId: 'otro',
        titulo: 'X',
        descripcion: 'Y',
      }),
    },
  } as unknown as PrismaService;
  const servicio = new MarketplaceService(prisma);

  await assert.rejects(
    () => servicio.actualizar('a1', 'yo', { precioMxn: 10 }),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('borrar solo lo permite el vendedor', async () => {
  const prisma = {
    anuncio: {
      findUnique: async () => ({ vendedorId: 'otro' }),
      update: async () => {
        throw new Error('no debe borrar');
      },
    },
  } as unknown as PrismaService;
  const servicio = new MarketplaceService(prisma);

  await assert.rejects(
    () => servicio.borrar('a1', 'yo'),
    (err: unknown) => err instanceof ForbiddenException,
  );
});

test('detalle de otra universidad no existe', async () => {
  const prisma = {
    user: { findUnique: async () => ({ universityId: 'uni-1' }) },
    anuncio: { findFirst: async () => null },
  } as unknown as PrismaService;
  const servicio = new MarketplaceService(prisma);

  await assert.rejects(
    () => servicio.detalle('a1', 'yo'),
    (err: unknown) => err instanceof NotFoundException,
  );
});

test('crear solo acepta imagenes que subio el mismo vendedor', async () => {
  const prevKey = process.env.ANTHROPIC_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    delete process.env.ANTHROPIC_API_KEY;
    process.env.MODERACION_OPCIONAL = 'true';

    let filtro: unknown;
    const prisma = {
      user: { findUnique: async () => ({ universityId: 'uni-1' }) },
      media: {
        findMany: async (args: { where: unknown }) => {
          filtro = args.where;
          return [];
        },
      },
    } as unknown as PrismaService;

    await assert.rejects(
      () =>
        new MarketplaceService(prisma).crear('u1', {
          titulo: 'Bici',
          descripcion: 'Rodada',
          categoria: 'OTRO',
          precioMxn: 500,
          imagenIds: ['foto-de-perfil-ajena'],
        }),
      (err: unknown) => err instanceof BadRequestException,
    );
    assert.deepEqual(filtro, {
      id: { in: ['foto-de-perfil-ajena'] },
      postId: null,
      anuncioId: null,
      ownerId: 'u1',
    });
  } finally {
    if (prevKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});
