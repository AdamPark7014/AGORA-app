import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  crearAventonSchema,
  listarAventonesSchema,
  type CrearAventon,
  type ListarAventones,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { AventonesService } from './aventones.service.js';

@Controller('aventones')
@UseGuards(SesionGuard)
export class AventonesController {
  constructor(private readonly aventones: AventonesService) {}

  @Get()
  async proximos(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(listarAventonesSchema)) filtros: ListarAventones,
  ) {
    return this.aventones.proximos(req.usuario!.id, filtros);
  }

  @Post()
  async crear(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearAventonSchema)) datos: CrearAventon,
  ) {
    return this.aventones.crear(req.usuario!.id, datos);
  }

  @Post(':id/asiento')
  async apartar(@Req() req: RequestConSesion, @Param('id') id: string) {
    return this.aventones.apartar(id, req.usuario!.id);
  }

  @Delete(':id')
  @HttpCode(204)
  async cancelar(@Req() req: RequestConSesion, @Param('id') id: string) {
    await this.aventones.cancelar(id, req.usuario!.id);
  }
}
