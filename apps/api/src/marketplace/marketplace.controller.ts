import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  actualizarAnuncioSchema,
  crearAnuncioSchema,
  listarAnunciosSchema,
  type ActualizarAnuncio,
  type CrearAnuncio,
  type ListarAnuncios,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { MarketplaceService } from './marketplace.service.js';

@Controller('anuncios')
@UseGuards(SesionGuard)
export class MarketplaceController {
  constructor(private readonly marketplace: MarketplaceService) {}

  @Get()
  async listar(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(listarAnunciosSchema)) filtros: ListarAnuncios,
  ) {
    return this.marketplace.listar(req.usuario!.id, filtros);
  }

  @Get(':id')
  async detalle(@Req() req: RequestConSesion, @Param('id') id: string) {
    return this.marketplace.detalle(id, req.usuario!.id);
  }

  @Post()
  async crear(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearAnuncioSchema)) datos: CrearAnuncio,
  ) {
    return this.marketplace.crear(req.usuario!.id, datos);
  }

  @Patch(':id')
  async actualizar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(actualizarAnuncioSchema)) datos: ActualizarAnuncio,
  ) {
    return this.marketplace.actualizar(id, req.usuario!.id, datos);
  }

  @Delete(':id')
  @HttpCode(204)
  async borrar(@Req() req: RequestConSesion, @Param('id') id: string) {
    await this.marketplace.borrar(id, req.usuario!.id);
  }
}
