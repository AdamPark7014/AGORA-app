import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { buscarDirectorioSchema, type BuscarDirectorio } from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { DirectorioService } from './directorio.service.js';

@Controller('directorio')
@UseGuards(SesionGuard)
export class DirectorioController {
  constructor(private readonly directorio: DirectorioService) {}

  @Get()
  async buscar(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(buscarDirectorioSchema)) filtros: BuscarDirectorio,
  ) {
    return this.directorio.buscar(filtros, req.usuario!.id);
  }
}
