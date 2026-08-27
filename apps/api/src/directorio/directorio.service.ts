import { Injectable } from '@nestjs/common';
import type { BuscarDirectorio } from '@agora/contracts';
import { Prisma } from '@agora/db';
import { esStaff } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';

/**
 * El directorio es lo unico que da valor con 20 usuarios: un feed necesita
 * masa critica, un directorio no. Por eso es la Fase 1 y no el feed.
 *
 * Paginacion por cursor sobre el id, no por OFFSET: con OFFSET, insertar un
 * perfil mientras alguien pagina le repite o le salta resultados.
 */
@Injectable()
export class DirectorioService {
  constructor(private readonly prisma: PrismaService) {}

  async buscar(filtros: BuscarDirectorio, solicitanteId: string) {
    const where: Prisma.ProfileWhereInput = {
      user: {
        estado: { in: ['ACTIVO', 'SUSPENDIDO'] },
        // Quien me bloqueo no aparece en mis busquedas.
        bloqueosHechos: { none: { bloqueadoId: solicitanteId, soloSilencio: false } },
      },
    };

    if (filtros.q) {
      const q = filtros.q;
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { apellidos: { contains: q, mode: 'insensitive' } },
        { handle: { contains: q.toLowerCase() } },
      ];
    }
    if (filtros.generacion) where.generacion = filtros.generacion;
    if (filtros.colegio) where.colegio = { slug: filtros.colegio };

    // Carrera y escuela filtran sobre la misma relacion, asi que se arma una
    // sola condicion en vez de sobrescribir una con la otra.
    if (filtros.carrera || filtros.escuela) {
      where.carrera = {
        ...(filtros.carrera ? { slug: filtros.carrera } : {}),
        ...(filtros.escuela ? { escuela: { slug: filtros.escuela } } : {}),
      };
    }

    const perfiles = await this.prisma.profile.findMany({
      where,
      include: {
        carrera: { include: { escuela: true } },
        colegio: true,
        user: { select: { roles: true } },
      },
      // Se pide uno de mas para saber si hay pagina siguiente sin un COUNT.
      take: filtros.limite + 1,
      ...(filtros.cursor ? { cursor: { id: filtros.cursor }, skip: 1 } : {}),
      orderBy: [{ nombre: 'asc' }, { id: 'asc' }],
    });

    const hayMas = perfiles.length > filtros.limite;
    const pagina = hayMas ? perfiles.slice(0, filtros.limite) : perfiles;

    return {
      resultados: pagina.map((p) => ({
        handle: p.handle,
        nombre: p.nombre,
        apellidos: p.apellidos,
        fotoUrl: p.fotoUrl,
        generacion: p.generacion,
        carrera: p.carrera?.nombre ?? null,
        escuela: p.carrera?.escuela.nombre ?? null,
        colegio: p.colegio?.nombre ?? null,
        verificado: esStaff(p.user.roles),
      })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }
}
