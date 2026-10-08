import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ActualizarAnuncio, CrearAnuncio, ListarAnuncios } from '@agora/contracts';
import { DECISIONES, masSevero, moderarImagen, moderarTexto } from '@agora/moderation';
import { Prisma } from '@agora/db';

import { PrismaService } from '../prisma/prisma.service.js';
import { moderacionPreviaActiva } from '../comun/moderacion.js';

@Injectable()
export class MarketplaceService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(userId: string, datos: CrearAnuncio) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    // Solo se aceptan imagenes que subio esta misma persona y aun sin dueno:
    // si no se comprobara el dueno, cualquiera con el id podria colgar en su
    // anuncio la foto de otro (incluida la de perfil, que nunca se adjunta a
    // nada). Misma regla que en publicaciones y perfil.
    let urls: string[] = [];
    if (datos.imagenIds.length > 0) {
      const libres = await this.prisma.media.findMany({
        where: { id: { in: datos.imagenIds }, postId: null, anuncioId: null, ownerId: userId },
        select: { url: true },
      });
      if (libres.length !== datos.imagenIds.length) {
        throw new BadRequestException('Alguna de esas imágenes ya no está disponible.');
      }
      urls = libres.map((m) => m.url);
    }

    // Las fotos pasan por la misma moderacion que las de las publicaciones.
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey && moderacionPreviaActiva()) {
      const publicas = urls.filter((url) => url.startsWith('https://'));
      const veredicto = masSevero(
        await Promise.all([
          moderarTexto(`${datos.titulo}\n${datos.descripcion}`, { apiKey }),
          ...publicas.map((url) => moderarImagen(url, { apiKey })),
        ]),
      );
      if (veredicto.decision === DECISIONES.RETIRAR) {
        throw new BadRequestException(veredicto.motivo ?? 'Ese contenido cruza una línea roja.');
      }
    }

    const anuncio = await this.prisma.anuncio.create({
      data: {
        vendedorId: userId,
        universityId: usuario.universityId,
        titulo: datos.titulo,
        descripcion: datos.descripcion,
        categoria: datos.categoria,
        precioMxn: datos.precioMxn,
      },
      select: { id: true },
    });

    if (datos.imagenIds.length > 0) {
      await this.prisma.media.updateMany({
        where: { id: { in: datos.imagenIds } },
        data: { anuncioId: anuncio.id },
      });
    }

    return anuncio;
  }

  async listar(userId: string, filtros: ListarAnuncios) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const where: Prisma.AnuncioWhereInput = {
      universityId: usuario.universityId,
      estado: 'PUBLICADO',
      // Lo vendido se oculta: un marketplace lleno de cosas que ya no estan
      // hace que la gente deje de confiar en lo que ve.
      estadoVenta: { not: 'VENDIDO' },
      ...(filtros.categoria ? { categoria: filtros.categoria } : {}),
      ...(filtros.q
        ? {
            OR: [
              { titulo: { contains: filtros.q, mode: 'insensitive' } },
              { descripcion: { contains: filtros.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const anuncios = await this.prisma.anuncio.findMany({
      where,
      include: {
        vendedor: {
          select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } },
        },
        imagenes: { select: { url: true }, take: 4 },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: filtros.limite + 1,
      ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
    });

    const hayMas = anuncios.length > filtros.limite;
    const pagina = hayMas ? anuncios.slice(0, filtros.limite) : anuncios;

    return {
      anuncios: pagina.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        descripcion: a.descripcion,
        categoria: a.categoria,
        precioMxn: a.precioMxn,
        estadoVenta: a.estadoVenta,
        createdAt: a.createdAt,
        imagenes: a.imagenes.map((i) => i.url),
        vendedor: a.vendedor.profile
          ? {
              handle: a.vendedor.profile.handle,
              nombre: `${a.vendedor.profile.nombre} ${a.vendedor.profile.apellidos}`,
              fotoUrl: a.vendedor.profile.fotoUrl,
            }
          : null,
        esMio: a.vendedorId === userId,
      })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

  async detalle(anuncioId: string, userId: string) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const anuncio = await this.prisma.anuncio.findFirst({
      where: {
        id: anuncioId,
        universityId: usuario.universityId,
        estado: 'PUBLICADO',
      },
      include: {
        vendedor: {
          select: { profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } } },
        },
        imagenes: { select: { url: true, mime: true } },
      },
    });
    if (!anuncio) throw new NotFoundException('Ese anuncio no existe.');

    return {
      id: anuncio.id,
      titulo: anuncio.titulo,
      descripcion: anuncio.descripcion,
      categoria: anuncio.categoria,
      precioMxn: anuncio.precioMxn,
      estadoVenta: anuncio.estadoVenta,
      createdAt: anuncio.createdAt,
      imagenes: anuncio.imagenes.map((i) => ({
        url: i.url,
        esVideo: i.mime.startsWith('video/'),
      })),
      vendedor: anuncio.vendedor.profile
        ? {
            handle: anuncio.vendedor.profile.handle,
            nombre: `${anuncio.vendedor.profile.nombre} ${anuncio.vendedor.profile.apellidos}`,
            fotoUrl: anuncio.vendedor.profile.fotoUrl,
          }
        : null,
      esMio: anuncio.vendedorId === userId,
    };
  }

  async actualizar(anuncioId: string, userId: string, datos: ActualizarAnuncio) {
    const anuncio = await this.prisma.anuncio.findUnique({
      where: { id: anuncioId },
      select: { vendedorId: true, titulo: true, descripcion: true },
    });
    if (!anuncio) throw new NotFoundException('Ese anuncio no existe.');
    if (anuncio.vendedorId !== userId) throw new ForbiddenException('No es tu anuncio.');

    if (datos.titulo !== undefined || datos.descripcion !== undefined) {
      const titulo = datos.titulo ?? anuncio.titulo;
      const descripcion = datos.descripcion ?? anuncio.descripcion;
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && moderacionPreviaActiva()) {
        const veredicto = await moderarTexto(`${titulo}\n${descripcion}`, { apiKey });
        if (veredicto.decision === DECISIONES.RETIRAR) {
          throw new BadRequestException(veredicto.motivo ?? 'Ese contenido cruza una línea roja.');
        }
      }
    }

    const actualizado = await this.prisma.anuncio.update({
      where: { id: anuncioId },
      data: {
        ...(datos.estadoVenta !== undefined ? { estadoVenta: datos.estadoVenta } : {}),
        ...(datos.titulo !== undefined ? { titulo: datos.titulo } : {}),
        ...(datos.descripcion !== undefined ? { descripcion: datos.descripcion } : {}),
        ...(datos.precioMxn !== undefined ? { precioMxn: datos.precioMxn } : {}),
      },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        precioMxn: true,
        estadoVenta: true,
      },
    });

    return actualizado;
  }

  async borrar(anuncioId: string, userId: string) {
    const anuncio = await this.prisma.anuncio.findUnique({
      where: { id: anuncioId },
      select: { vendedorId: true },
    });
    if (!anuncio) throw new NotFoundException('Ese anuncio no existe.');
    if (anuncio.vendedorId !== userId) throw new ForbiddenException('No es tu anuncio.');

    await this.prisma.anuncio.update({
      where: { id: anuncioId },
      data: { estado: 'BORRADO_POR_AUTOR' },
    });
  }
}
