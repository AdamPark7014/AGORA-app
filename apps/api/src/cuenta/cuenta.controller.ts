import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { eliminarCuentaSchema, type EliminarCuenta } from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { COOKIE_SESION, SesionGuardBaja, type RequestConSesion } from '../comun/sesion.guard.js';
import { CuentaService } from './cuenta.service.js';

@Controller('cuenta')
// Un suspendido tambien puede darse de baja: ver SesionGuardBaja.
@UseGuards(SesionGuardBaja)
export class CuentaController {
  constructor(private readonly cuenta: CuentaService) {}

  /** POST y no DELETE con cuerpo: algunos clientes HTTP no mandan cuerpo en DELETE. */
  @Post('eliminar')
  @HttpCode(204)
  async eliminar(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(eliminarCuentaSchema)) datos: EliminarCuenta,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.cuenta.eliminar(req.usuario!.id, datos.confirmacion);
    res.clearCookie(COOKIE_SESION, {
      path: '/',
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });
  }
}
