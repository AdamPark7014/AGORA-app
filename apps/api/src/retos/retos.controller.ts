import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  crearRetoSchema,
  responderRetoSchema,
  type CrearReto,
  type ResponderReto,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { RetosService } from './retos.service.js';

@Controller('retos')
@UseGuards(SesionGuard)
export class RetosController {
  constructor(private readonly retos: RetosService) {}

  @Post()
  async crear(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearRetoSchema)) datos: CrearReto,
  ) {
    return this.retos.crear(req.usuario!.id, datos);
  }

  @Get('activos')
  async activos(@Req() req: RequestConSesion) {
    return this.retos.activos(req.usuario!.id);
  }

  @Get('ranking-semanal')
  async rankingSemanal(@Req() req: RequestConSesion, @Query('limite') limite?: string) {
    const n = limite ? Math.min(Math.max(parseInt(limite, 10) || 5, 1), 50) : 5;
    return this.retos.rankingSemanal(req.usuario!.id, n);
  }

  @Get('puede/:handle')
  async puede(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.retos.puedePorHandle(req.usuario!.id, handle);
  }

  @Get('historial')
  async historial(
    @Req() req: RequestConSesion,
    @Query('cursor') cursor?: string,
    @Query('limite') limite?: string,
  ) {
    const n = limite ? Math.min(Math.max(parseInt(limite, 10) || 20, 1), 50) : 20;
    return this.retos.historial(req.usuario!.id, cursor, n);
  }

  @Post(':id/responder')
  async responder(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(responderRetoSchema)) datos: ResponderReto,
  ) {
    return this.retos.responder(id, req.usuario!.id, datos);
  }
}
