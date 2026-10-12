import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

export interface TarjetaPublica {
  titulo: string;
  descripcion: string;
  imagen: string | null;
  canonical: string;
}

const VISIBLES = ['PUBLICADO', 'EN_REVISION'] as const;

function excerpt(texto: string, max = 160): string {
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  return `${limpio.slice(0, max - 1).trimEnd()}…`;
}

@Injectable()
export class PublicService {
  constructor(private readonly prisma: PrismaService) {}

  async tarjetaPublicacion(id: string): Promise<TarjetaPublica> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        texto: true,
        estado: true,
        anonimo: true,
        author: {
          select: {
            estado: true,
            profile: { select: { handle: true, nombre: true, apellidos: true, visibilidad: true } },
          },
        },
        media: { select: { url: true, mime: true }, take: 1, orderBy: { createdAt: 'asc' } },
      },
    });

    if (
      !post ||
      !VISIBLES.includes(post.estado as (typeof VISIBLES)[number]) ||
      post.author.estado === 'BAJA'
    ) {
      throw new NotFoundException('Esa publicación no existe.');
    }

    // Esto lo lee cualquiera en internet. Si el autor limito su perfil a sus
    // comunidades, su nombre tampoco sale aqui.
    const firmado = !post.anonimo && post.author.profile?.visibilidad === 'UNIVERSIDAD';
    const autor = firmado && post.author.profile
      ? `${post.author.profile.nombre} ${post.author.profile.apellidos}`.trim()
      : null;

    const imagen =
      post.media.find((m) => m.mime.startsWith('image/'))?.url ?? null;

    return {
      titulo: autor ? `Publicación de ${autor}` : 'Publicación en Ágora',
      // Lo anonimo solo se lee con sesion: fuera de la red no hay moderacion
      // que respalde el texto y el extracto viaja a cualquier unfurl.
      descripcion: post.anonimo
        ? 'Publicación de la zona sin nombre. Entra con tu correo @udlap.mx para leerla.'
        : excerpt(post.texto),
      imagen: post.anonimo ? null : imagen,
      canonical: `/publicacion/${post.id}`,
    };
  }

  async tarjetaPerfil(handle: string): Promise<TarjetaPublica> {
    const perfil = await this.prisma.profile.findUnique({
      where: { handle },
      select: {
        handle: true,
        nombre: true,
        apellidos: true,
        bio: true,
        fotoUrl: true,
        visibilidad: true,
        carrera: { select: { nombre: true } },
        user: { select: { estado: true } },
      },
    });

    if (!perfil || perfil.user.estado === 'BAJA') {
      throw new NotFoundException('No existe ese perfil.');
    }

    const nombre = `${perfil.nombre} ${perfil.apellidos}`.trim();
    const restringido = perfil.visibilidad === 'COMUNIDADES';

    return {
      titulo: `@${perfil.handle} · Ágora`,
      // Sin sesion ni limite: con el nombre completo aqui, recorrer handles
      // bastaba para sacar nombres reales de quien limito su perfil.
      descripcion: restringido
        ? 'Perfil limitado a comunidades compartidas. Entra con tu correo @udlap.mx para verlo.'
        : excerpt(
            [perfil.bio, perfil.carrera?.nombre].filter(Boolean).join(' · ') ||
              `${nombre} en la red verificada de la UDLAP.`,
          ),
      imagen: restringido ? null : perfil.fotoUrl,
      canonical: `/perfil/${perfil.handle}`,
    };
  }

  async tarjetaEvento(id: string): Promise<TarjetaPublica> {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        lugar: true,
        inicioAt: true,
        estado: true,
        communityId: true,
        autor: { select: { estado: true } },
      },
    });

    if (
      !evento ||
      !VISIBLES.includes(evento.estado as (typeof VISIBLES)[number]) ||
      evento.autor.estado === 'BAJA'
    ) {
      throw new NotFoundException('Ese evento no existe.');
    }

    // Un evento de una comunidad (carrera, colegio...) es para sus miembros:
    // fuera de la red solo se anuncia que existe.
    if (evento.communityId) {
      return {
        titulo: 'Evento en Ágora',
        descripcion: 'Evento de una comunidad de la UDLAP. Entra con tu correo @udlap.mx para verlo.',
        imagen: null,
        canonical: `/eventos/${evento.id}`,
      };
    }

    const cuando = evento.inicioAt.toLocaleString('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    });

    return {
      titulo: evento.titulo,
      descripcion: excerpt(
        [evento.descripcion, evento.lugar ? `Lugar: ${evento.lugar}` : null, cuando]
          .filter(Boolean)
          .join(' · '),
      ),
      imagen: null,
      canonical: `/eventos/${evento.id}`,
    };
  }

  async tarjetaAnuncio(id: string): Promise<TarjetaPublica> {
    const anuncio = await this.prisma.anuncio.findUnique({
      where: { id },
      select: {
        id: true,
        titulo: true,
        descripcion: true,
        precioMxn: true,
        estado: true,
        vendedor: { select: { estado: true } },
        imagenes: { select: { url: true }, take: 1, orderBy: { createdAt: 'asc' } },
      },
    });

    if (
      !anuncio ||
      anuncio.estado !== 'PUBLICADO' ||
      anuncio.vendedor.estado === 'BAJA'
    ) {
      throw new NotFoundException('Ese anuncio no existe.');
    }

    const precio =
      anuncio.precioMxn != null
        ? `$${anuncio.precioMxn.toLocaleString('es-MX')} MXN`
        : null;

    return {
      titulo: anuncio.titulo,
      descripcion: excerpt([precio, anuncio.descripcion].filter(Boolean).join(' · ')),
      imagen: anuncio.imagenes[0]?.url ?? null,
      canonical: `/marketplace/${anuncio.id}`,
    };
  }
}
