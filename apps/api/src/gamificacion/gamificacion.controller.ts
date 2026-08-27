import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { GamificacionService } from './gamificacion.service.js';

@Controller('gamificacion')
@UseGuards(SesionGuard)
export class GamificacionController {
  constructor(private readonly gamificacion: GamificacionService) {}

  @Get('mio')
  async mio(@Req() req: RequestConSesion) {
    return this.gamificacion.obtener(req.usuario!.id);
  }

  @Post('ping')
  ping(@Req() req: RequestConSesion) {
    return this.gamificacion.ping(req.usuario!.id);
  }

  @Get('leaderboard')
  leaderboard(@Req() req: RequestConSesion, @Query('limite') limite?: string) {
    const n = limite ? Math.min(Math.max(Number(limite) || 5, 1), 50) : 5;
    return this.gamificacion.leaderboard(req.usuario!.id, n);
  }

  @Get(':handle')
  porHandle(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.gamificacion.porHandle(req.usuario!.id, handle);
  }
}
