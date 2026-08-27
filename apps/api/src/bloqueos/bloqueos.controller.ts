import { Body, Controller, Delete, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { bloquearSchema, type Bloquear } from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { BloqueosService } from './bloqueos.service.js';

@Controller('bloqueos')
@UseGuards(SesionGuard)
export class BloqueosController {
  constructor(private readonly bloqueos: BloqueosService) {}

  @Get(':handle')
  async estado(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.bloqueos.estado(req.usuario!.id, handle.toLowerCase());
  }

  @Post(':handle')
  async aplicar(
    @Req() req: RequestConSesion,
    @Param('handle') handle: string,
    @Body(new ZodPipe(bloquearSchema)) datos: Bloquear,
  ) {
    return this.bloqueos.aplicar(req.usuario!.id, handle.toLowerCase(), datos.soloSilencio);
  }

  @Delete(':handle')
  @HttpCode(204)
  async quitar(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    await this.bloqueos.quitar(req.usuario!.id, handle.toLowerCase());
  }
}
