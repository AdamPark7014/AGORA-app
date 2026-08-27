import { Controller, Get, Header } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Catalogo academico para el formulario de perfil.
 *
 * Publico a proposito: se consulta antes de tener sesion, durante el registro.
 * No expone nada que no este ya en udlap.mx.
 */
@Controller('catalogo')
export class CatalogoController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Se puede guardar en cache una hora.
   *
   * Son las 5 escuelas, las 52 carreras y los 4 colegios de la UDLAP: cambian
   * como mucho una vez por semestre, y son 5 kB que hoy se descargan enteros
   * en cada carga del formulario de registro. `public` porque no depende de
   * quien pregunte — de hecho se consulta sin sesion.
   */
  @Get()
  @Header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  async todo() {
    const escuelas = await this.prisma.escuela.findMany({
      include: {
        carreras: { orderBy: { nombre: 'asc' } },
        departamentos: { orderBy: { nombre: 'asc' } },
      },
      orderBy: { nombre: 'asc' },
    });

    const colegios = await this.prisma.colegioResidencial.findMany({
      orderBy: { nombre: 'asc' },
    });

    return {
      escuelas: escuelas.map((e) => ({
        slug: e.slug,
        nombre: e.nombre,
        carreras: e.carreras.map((c) => ({ slug: c.slug, nombre: c.nombre })),
        departamentos: e.departamentos.map((d) => ({ slug: d.slug, nombre: d.nombre })),
      })),
      colegios: colegios.map((c) => ({ slug: c.slug, nombre: c.nombre })),
    };
  }
}
