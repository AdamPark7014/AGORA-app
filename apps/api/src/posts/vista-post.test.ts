import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';

import { aMediaVista, aVistaPost, type PostConRelaciones } from './vista-post.js';
import { PostsService } from './posts.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function post(anonimo: boolean): PostConRelaciones {
  return {
    id: 'p1',
    authorId: 'u-real',
    communityId: 'c1',
    texto: 'hola',
    estado: 'PUBLICADO',
    anonimo,
    numComments: 0,
    numReactions: 0,
    createdAt: new Date('2026-10-07T12:00:00Z'),
    updatedAt: new Date('2026-10-07T12:00:00Z'),
    author: {
      roles: ['miembro'],
      profile: { handle: 'adam', nombre: 'Adam', apellidos: 'Del Pozo', fotoUrl: 'https://x/f.jpg' },
      aliasAnonimo: { alias: 'Ocelote 772' },
    },
    community: { slug: 'anonimo', nombre: 'Sin nombre' },
    media: [],
    poll: null,
    reactions: [],
  } as unknown as PostConRelaciones;
}

test('una publicacion anonima nunca lleva al autor real', () => {
  const vista = aVistaPost(post(true), false);
  const crudo = JSON.stringify(vista);

  assert.equal(vista.autor, null);
  assert.equal(vista.anonimo, true);
  assert.equal(vista.alias, 'Ocelote 772');
  assert.ok(!crudo.includes('adam'), 'no debe salir el handle');
  assert.ok(!crudo.includes('Del Pozo'), 'no debe salir el nombre');
  assert.ok(!crudo.includes('u-real'), 'no debe salir el id');
  assert.ok(!crudo.includes('f.jpg'), 'no debe salir la foto');
});

test('una publicacion firmada no revela el alias de su autor', () => {
  const vista = aVistaPost(post(false), false);

  assert.equal(vista.anonimo, false);
  assert.equal(vista.alias, null);
  assert.equal(vista.autor?.handle, 'adam');
  assert.ok(!JSON.stringify(vista).includes('Ocelote'));
});

test('editar rechaza publicaciones anonimas', async () => {
  const prisma = {
    post: {
      findUnique: async () => ({ authorId: 'u1', estado: 'PUBLICADO', anonimo: true }),
      update: async () => {
        throw new Error('no debe actualizar');
      },
    },
  } as unknown as PrismaService;
  const servicio = new PostsService(prisma, {} as never, {} as never, {} as never, {} as never);

  await assert.rejects(
    () => servicio.editar('p1', 'u1', { texto: 'nuevo @alguien' }),
    (err: unknown) => err instanceof BadRequestException,
  );
});

test('los adjuntos mandan la miniatura y las medidas para las listas', () => {
  assert.deepEqual(
    aMediaVista({ url: '/media/a.jpg', thumbUrl: '/media/a.webp', ancho: 2048, alto: 1536, mime: 'image/jpeg' }),
    {
      url: '/media/a.jpg',
      thumbUrl: '/media/a.webp',
      ancho: 2048,
      alto: 1536,
      mime: 'image/jpeg',
      esVideo: false,
    },
  );
});
