import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { GuardadosService } from './guardados.service.js';
import { limiteDeConsulta } from '../comun/consulta.js';

@Controller()
@UseGuards(SesionGuard)
export class GuardadosController {
  constructor(private readonly guardados: GuardadosService) {}

  @Get('guardados')
  async listar(
    @Req() req: RequestConSesion,
    @Query('cursor') cursor?: string,
    @Query('limite') limite?: string,
  ) {
    return this.guardados.listar(
      req.usuario!.id,
      cursor,
      limiteDeConsulta(limite, 20, 40),
    );
  }

  @Post('posts/:id/guardar')
  async alternar(@Req() req: RequestConSesion, @Param('id') id: string) {
    return this.guardados.alternar(req.usuario!.id, id);
  }
}
