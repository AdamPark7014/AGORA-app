import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { buscarGlobalSchema, type BuscarGlobal } from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { BusquedaService } from './busqueda.service.js';

@Controller('buscar')
@UseGuards(SesionGuard)
export class BusquedaController {
  constructor(private readonly busqueda: BusquedaService) {}

  @Get()
  async buscar(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(buscarGlobalSchema)) filtros: BuscarGlobal,
  ) {
    return this.busqueda.buscar(req.usuario!.id, filtros);
  }
}
