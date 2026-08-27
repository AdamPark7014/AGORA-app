import { Injectable } from '@nestjs/common';
import type { BuscarGlobal } from '@agora/contracts';
import { esStaff } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';

const VISIBLES = ['PUBLICADO', 'EN_REVISION'] as const;

@Injectable()
export class BusquedaService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(userId: string, filtros: BuscarGlobal) {
    const q = filtros.q.trim().replace(/^#/, '');
    if (q.length < 2) {
      return { personas: [], publicaciones: [], eventos: [], anuncios: [] };
    }

    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) {
      return { personas: [], publicaciones: [], eventos: [], anuncios: [] };
    }

    const misComunidades = await this.prisma.membership.findMany({
      where: { userId },
      select: { communityId: true },
    });
    const idsComunidad = misComunidades.map((m) => m.communityId);

    const [personas, publicaciones, eventos, anuncios] = await Promise.all([
      filtros.tipo === 'publicaciones' || filtros.tipo === 'eventos' || filtros.tipo === 'marketplace'
        ? []
        : this.buscarPersonas(userId, q, filtros.limite),
      filtros.tipo === 'personas' || filtros.tipo === 'eventos' || filtros.tipo === 'marketplace'
        ? []
        : this.buscarPublicaciones(q, usuario.universityId, idsComunidad, filtros.limite),
      filtros.tipo === 'personas' || filtros.tipo === 'publicaciones' || filtros.tipo === 'marketplace'
        ? []
        : this.buscarEventos(q, usuario.universityId, filtros.limite),
      filtros.tipo === 'personas' || filtros.tipo === 'publicaciones' || filtros.tipo === 'eventos'
        ? []
        : this.buscarAnuncios(q, usuario.universityId, filtros.limite),
    ]);

    return { personas, publicaciones, eventos, anuncios };
  }

  private async buscarPersonas(userId: string, q: string, limite: number) {
    const perfiles = await this.prisma.profile.findMany({
      where: {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { apellidos: { contains: q, mode: 'insensitive' } },
          { handle: { contains: q.toLowerCase() } },
        ],
        user: {
          estado: { in: ['ACTIVO', 'SUSPENDIDO'] },
          bloqueosHechos: { none: { bloqueadoId: userId, soloSilencio: false } },
        },
      },
      include: { user: { select: { roles: true } }, carrera: true },
      take: limite,
      orderBy: { nombre: 'asc' },
    });

    return perfiles.map((p) => ({
      handle: p.handle,
      nombre: `${p.nombre} ${p.apellidos}`,
      fotoUrl: p.fotoUrl,
      carrera: p.carrera?.nombre ?? null,
      verificado: esStaff(p.user.roles),
    }));
  }

  private async buscarPublicaciones(
    q: string,
    universityId: string,
    comunidades: string[],
    limite: number,
  ) {
    if (comunidades.length === 0) return [];

    const posts = await this.prisma.post.findMany({
      where: {
        texto: { contains: q, mode: 'insensitive' },
        estado: { in: [...VISIBLES] },
        anonimo: false,
        communityId: { in: comunidades },
        community: { universityId },
      },
      include: {
        author: { select: { profile: { select: { handle: true, nombre: true, apellidos: true } } } },
        community: { select: { nombre: true } },
      },
      take: limite,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((p) => ({
      id: p.id,
      texto: p.texto.slice(0, 200),
      createdAt: p.createdAt,
      autor: p.author.profile
        ? { handle: p.author.profile.handle, nombre: `${p.author.profile.nombre} ${p.author.profile.apellidos}` }
        : null,
      comunidad: p.community.nombre,
    }));
  }

  private async buscarEventos(q: string, universityId: string, limite: number) {
    const eventos = await this.prisma.evento.findMany({
      where: {
        universityId,
        OR: [
          { titulo: { contains: q, mode: 'insensitive' } },
          { descripcion: { contains: q, mode: 'insensitive' } },
          { lugar: { contains: q, mode: 'insensitive' } },
        ],
        inicioAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      take: limite,
      orderBy: { inicioAt: 'asc' },
    });

    return eventos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      lugar: e.lugar,
      inicioAt: e.inicioAt,
      tipo: e.tipo,
    }));
  }

  private async buscarAnuncios(q: string, universityId: string, limite: number) {
    const anuncios = await this.prisma.anuncio.findMany({
      where: {
        universityId,
        estadoVenta: { in: ['DISPONIBLE', 'APARTADO'] },
        OR: [
          { titulo: { contains: q, mode: 'insensitive' } },
          { descripcion: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        vendedor: { select: { profile: { select: { handle: true, nombre: true, apellidos: true } } } },
      },
      take: limite,
      orderBy: { createdAt: 'desc' },
    });

    return anuncios.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      precioMxn: a.precioMxn,
      vendedor: a.vendedor.profile
        ? { handle: a.vendedor.profile.handle, nombre: `${a.vendedor.profile.nombre} ${a.vendedor.profile.apellidos}` }
        : null,
    }));
  }
}
