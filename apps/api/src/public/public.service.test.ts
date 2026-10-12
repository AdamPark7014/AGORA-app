import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PublicService } from './public.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

test('la tarjeta publica de un perfil restringido no lleva su nombre', async () => {
  const prisma = {
    profile: {
      findUnique: async () => ({
        handle: 'ana.lopez',
        nombre: 'Ana',
        apellidos: 'López Ruiz',
        bio: null,
        fotoUrl: '/media/f.jpg',
        visibilidad: 'COMUNIDADES',
        carrera: { nombre: 'Medicina' },
        user: { estado: 'ACTIVO' },
      }),
    },
  } as unknown as PrismaService;

  const t = await new PublicService(prisma).tarjetaPerfil('ana.lopez');
  const crudo = JSON.stringify(t);
  assert.ok(!crudo.includes('López'), 'no debe salir el apellido');
  assert.ok(!crudo.includes('Ana '), 'no debe salir el nombre');
  assert.equal(t.imagen, null);
});

test('la tarjeta de una publicacion no firma con el nombre de un perfil restringido', async () => {
  const prisma = {
    post: {
      findUnique: async () => ({
        id: 'p1',
        texto: 'Hola',
        estado: 'PUBLICADO',
        anonimo: false,
        author: {
          estado: 'ACTIVO',
          profile: { handle: 'ana', nombre: 'Ana', apellidos: 'López', visibilidad: 'COMUNIDADES' },
        },
        media: [],
      }),
    },
  } as unknown as PrismaService;

  const t = await new PublicService(prisma).tarjetaPublicacion('p1');
  assert.equal(t.titulo, 'Publicación en Ágora');
});

test('un evento de comunidad solo se anuncia fuera de la red', async () => {
  const prisma = {
    evento: {
      findUnique: async () => ({
        id: 'e1',
        titulo: 'Fiesta de Medicina en el colegio',
        descripcion: 'En el cuarto 204',
        lugar: 'Colegio Ray Lindley',
        inicioAt: new Date('2026-10-20T22:00:00Z'),
        estado: 'PUBLICADO',
        communityId: 'c-medicina',
        autor: { estado: 'ACTIVO' },
      }),
    },
  } as unknown as PrismaService;

  const t = await new PublicService(prisma).tarjetaEvento('e1');
  assert.ok(!JSON.stringify(t).includes('204'));
  assert.equal(t.titulo, 'Evento en Ágora');
});
