import { Injectable } from '@nestjs/common';
import { extraerHashtags } from '@agora/shared';
import { esStaff } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';
import { aMediaVista } from '../posts/vista-post.js';
import { ocultosPara } from '../bloqueos/bloqueos.js';

const VISIBLES = ['PUBLICADO', 'EN_REVISION'] as const;

@Injectable()
export class HashtagsService {
  constructor(private readonly prisma: PrismaService) {}

  async sincronizar(postId: string, texto: string, universityId: string) {
    const tags = extraerHashtags(texto);
    await this.prisma.postHashtag.deleteMany({ where: { postId } });
    if (tags.length === 0) return;

    for (const tag of tags) {
      const hashtag = await this.prisma.hashtag.upsert({
        where: { universityId_tag: { universityId, tag } },
        create: { universityId, tag },
        update: { lastUsedAt: new Date() },
      });
      await this.prisma.postHashtag.create({
        data: { postId, hashtagId: hashtag.id },
      });
    }
  }

  async trending(userId: string, limite = 8) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) return { hashtags: [] };

    const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const filas = await this.prisma.postHashtag.groupBy({
      by: ['hashtagId'],
      where: {
        createdAt: { gte: desde },
        hashtag: { universityId: usuario.universityId },
      },
      _count: { hashtagId: true },
      orderBy: { _count: { hashtagId: 'desc' } },
      take: limite,
    });

    if (filas.length === 0) return { hashtags: [] };

    const ids = filas.map((f) => f.hashtagId);
    const hashtags = await this.prisma.hashtag.findMany({ where: { id: { in: ids } } });
    const porId = new Map(hashtags.map((h) => [h.id, h]));

    return {
      hashtags: filas
        .map((f) => {
          const h = porId.get(f.hashtagId);
          if (!h) return null;
          return { tag: h.tag, usos: f._count.hashtagId };
        })
        .filter((h): h is { tag: string; usos: number } => h !== null),
    };
  }

  async publicaciones(userId: string, tag: string, cursor?: string, limite = 15) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) return { publicaciones: [], siguienteCursor: null };

    const hashtag = await this.prisma.hashtag.findUnique({
      where: { universityId_tag: { universityId: usuario.universityId, tag: tag.toLowerCase() } },
    });
    if (!hashtag) return { publicaciones: [], siguienteCursor: null };

    const misComunidades = await this.prisma.membership.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const idsComunidad = misComunidades.map((m) => m.communityId);
    if (idsComunidad.length === 0) return { publicaciones: [], siguienteCursor: null };

    // Mismo criterio que el feed: aqui tambien salia quien te bloqueo.
    const ocultos = await ocultosPara(this.prisma, userId);

    const enlaces = await this.prisma.postHashtag.findMany({
      where: {
        hashtagId: hashtag.id,
        post: {
          estado: { in: [...VISIBLES] },
          anonimo: false,
          communityId: { in: idsComunidad },
          ...(ocultos.size > 0 ? { authorId: { notIn: [...ocultos] } } : {}),
        },
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                roles: true,
                profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
              },
            },
            community: { select: { slug: true, nombre: true } },
            media: true,
            reactions: { where: { userId }, select: { tipo: true } },
          },
        },
      },
      take: limite + 1,
      ...(cursor
        ? {
            cursor: { postId_hashtagId: { postId: cursor, hashtagId: hashtag.id } },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
    });

    const hayMas = enlaces.length > limite;
    const pagina = hayMas ? enlaces.slice(0, limite) : enlaces;

    return {
      publicaciones: pagina.map((e) => ({
        id: e.post.id,
        texto: e.post.texto,
        createdAt: e.post.createdAt,
        autor: e.post.author.profile
          ? {
              handle: e.post.author.profile.handle,
              nombre: `${e.post.author.profile.nombre} ${e.post.author.profile.apellidos}`,
              fotoUrl: e.post.author.profile.fotoUrl,
              verificado: esStaff(e.post.author.roles),
            }
          : null,
        comunidad: { slug: e.post.community.slug, nombre: e.post.community.nombre },
        media: e.post.media.map(aMediaVista),
        numComments: e.post.numComments,
        numReactions: e.post.numReactions,
        miReaccion: e.post.reactions[0]?.tipo ?? null,
      })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.postId ?? null) : null,
    };
  }
}
