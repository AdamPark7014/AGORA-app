import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException } from '@nestjs/common';

import { aMediaVista, aVistaPost, conteosReacciones, type PostConRelaciones } from './vista-post.js';
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

test('la encuesta trae el voto de quien mira para que sobreviva a recargar', () => {
  const conEncuesta = {
    ...post(false),
    poll: {
      id: 'poll1',
      postId: 'p1',
      pregunta: 'cafe o te?',
      cierraAt: null,
      options: [
        { id: 'o1', pollId: 'poll1', texto: 'cafe', orden: 0, _count: { votes: 3 }, votes: [] },
        { id: 'o2', pollId: 'poll1', texto: 'te', orden: 1, _count: { votes: 1 }, votes: [{ id: 'v1' }] },
      ],
    },
  } as unknown as PostConRelaciones;

  const vista = aVistaPost(conEncuesta, false);
  assert.equal(vista.encuesta?.miVoto, 'o2');
  assert.deepEqual(vista.encuesta?.opciones.map((o) => o.votos), [3, 1]);
  // Los votos crudos (de quien sea) no salen: solo el id de la opcion propia.
  assert.ok(!JSON.stringify(vista).includes('v1'));

  const sinVoto = aVistaPost(
    {
      ...conEncuesta,
      poll: { ...conEncuesta.poll!, options: conEncuesta.poll!.options.map((o) => ({ ...o, votes: [] })) },
    } as PostConRelaciones,
    false,
  );
  assert.equal(sinVoto.encuesta?.miVoto, null);
});

test('conteosReacciones: una sola consulta y ceros donde no hay', async () => {
  let consultas = 0;
  const prisma = {
    reaction: {
      groupBy: async () => {
        consultas += 1;
        return [
          { postId: 'p1', tipo: 'ME_LATE', _count: { _all: 3 } },
          { postId: 'p1', tipo: 'NO_MAMES', _count: { _all: 1 } },
          { postId: 'p2', tipo: 'APOYO', _count: { _all: 2 } },
        ];
      },
    },
  };
  const conteos = await conteosReacciones(prisma, ['p1', 'p2', 'p3']);
  assert.equal(consultas, 1);
  assert.deepEqual(conteos.get('p1'), { ME_LATE: 3, ME_RIO: 0, APOYO: 0, NO_MAMES: 1 });
  assert.deepEqual(conteos.get('p2'), { ME_LATE: 0, ME_RIO: 0, APOYO: 2, NO_MAMES: 0 });
  assert.equal(conteos.get('p3'), undefined);
  assert.equal((await conteosReacciones(prisma, [])).size, 0);
  assert.equal(consultas, 1);
});
