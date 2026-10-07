import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { PrismaService } from '../prisma/prisma.service.js';
import { MantenimientoService } from './mantenimiento.service.js';

const crear = (huerfanas: Array<{ id: string; url: string; thumbUrl: string | null }>, enPerfil: string[]) => {
  const borradosAlmacen: string[] = [];
  let borradasFilas: string[] = [];
  const prisma = {
    media: {
      findMany: async () => huerfanas,
      deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        borradasFilas = where.id.in;
        return { count: where.id.in.length };
      },
    },
    profile: {
      findMany: async () => enPerfil.map((url) => ({ fotoUrl: url, portadaUrl: null })),
    },
  } as unknown as PrismaService;
  const servicio = new MantenimientoService(prisma);
  (servicio as unknown as { almacen: unknown }).almacen = {
    borrar: async (url: string) => {
      if (url.includes('falla')) throw new Error('R2 caido');
      borradosAlmacen.push(url);
    },
  };
  return { servicio, borradosAlmacen, filas: () => borradasFilas };
};

test('borra archivos huerfanos y su miniatura, pero no la foto de un perfil', async () => {
  const { servicio, borradosAlmacen, filas } = crear(
    [
      { id: 'a', url: '/api/media/archivo/a.jpg', thumbUrl: '/api/media/archivo/a-t.webp' },
      { id: 'avatar', url: '/api/media/archivo/avatar.jpg', thumbUrl: null },
    ],
    ['/api/media/archivo/avatar.jpg'],
  );

  const r = await servicio.limpiarMedia();

  assert.deepEqual(r, { archivos: 1, fallidos: 0 });
  assert.deepEqual(borradosAlmacen, ['/api/media/archivo/a.jpg', '/api/media/archivo/a-t.webp']);
  assert.deepEqual(filas(), ['a']);
});

test('si el almacen falla, la fila se conserva para el siguiente barrido', async () => {
  const { servicio, filas } = crear(
    [
      { id: 'ok', url: '/x/ok.jpg', thumbUrl: null },
      { id: 'mal', url: '/x/falla.jpg', thumbUrl: null },
    ],
    [],
  );

  const r = await servicio.limpiarMedia();

  assert.deepEqual(r, { archivos: 1, fallidos: 1 });
  assert.deepEqual(filas(), ['ok']);
});
