import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { aVistaPost, incluirVistaPost } from '../posts/vista-post.js';

const VISIBLES = ['PUBLICADO', 'EN_REVISION'] as const;

@Injectable()
export class GuardadosService {
  constructor(private readonly prisma: PrismaService) {}

  async alternar(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, estado: true },
    });
    if (!post || !VISIBLES.includes(post.estado as (typeof VISIBLES)[number])) {
      throw new NotFoundException('Esa publicacion no existe.');
    }

    const existente = await this.prisma.guardado.findUnique({
      where: { userId_postId: { userId, postId } },
    });

    if (existente) {
      await this.prisma.guardado.delete({ where: { id: existente.id } });
      return { guardado: false };
    }

    await this.prisma.guardado.create({ data: { userId, postId } });
    return { guardado: true };
  }

  async listar(userId: string, cursor?: string, limite = 20) {
    const filas = await this.prisma.guardado.findMany({
      where: { userId },
      include: {
        post: { include: incluirVistaPost(userId) },
      },
      orderBy: { createdAt: 'desc' },
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hayMas = filas.length > limite;
    const pagina = hayMas ? filas.slice(0, limite) : filas;

    return {
      publicaciones: pagina
        .filter((f) => VISIBLES.includes(f.post.estado as (typeof VISIBLES)[number]))
        .map((f) => ({ ...aVistaPost(f.post, true), guardadoAt: f.createdAt })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

}
