import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '@agora/rbac';
import {
  crearReporteSchema,
  decidirMarcadoSchema,
  resolverReporteSchema,
  retirarPostSchema,
  type CrearReporte,
  type DecidirMarcado,
  type ResolverReporte,
  type RetirarPost,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { Permiso, PermisoGuard } from '../comun/permiso.guard.js';
import { ModeracionService } from './moderacion.service.js';

/** Reportar: abierto a cualquier miembro con sesión. */
@Controller('reportes')
@UseGuards(SesionGuard)
export class ReportesController {
  constructor(private readonly moderacion: ModeracionService) {}

  @Post()
  async reportar(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearReporteSchema)) datos: CrearReporte,
  ) {
    return this.moderacion.reportar(req.usuario!.id, datos);
  }
}

/** Panel de moderación: exige permiso, no solo sesión. */
@Controller('moderacion')
@UseGuards(SesionGuard, PermisoGuard)
export class ModeracionController {
  constructor(private readonly moderacion: ModeracionService) {}

  @Get('resumen')
  @Permiso(PERMISSIONS.MODERACION_COLA_VER)
  async resumen() {
    return this.moderacion.resumen();
  }

  @Get('cola')
  @Permiso(PERMISSIONS.MODERACION_COLA_VER)
  async cola(@Query('estado') estado?: string) {
    const valido =
      estado === 'RESUELTO_RETIRADO' || estado === 'RESUELTO_SIN_ACCION' ? estado : 'ABIERTO';
    return this.moderacion.cola(valido);
  }

  @Get('marcado-ia')
  @Permiso(PERMISSIONS.MODERACION_COLA_VER)
  async marcadoIA() {
    return this.moderacion.marcadoPorIA();
  }

  @Get('historial')
  @Permiso(PERMISSIONS.MODERACION_COLA_VER)
  async historial() {
    return this.moderacion.historial();
  }

  @Post('reportes/:id/resolver')
  @Permiso(PERMISSIONS.MODERACION_ACTUAR)
  async resolver(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(resolverReporteSchema)) datos: ResolverReporte,
  ) {
    return this.moderacion.resolver(id, req.usuario!.id, datos, req.usuario!.roles);
  }

  @Post('marcado-ia/:id')
  @Permiso(PERMISSIONS.MODERACION_ACTUAR)
  async decidirMarcado(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(decidirMarcadoSchema)) datos: DecidirMarcado,
  ) {
    return this.moderacion.decidirMarcado(id, req.usuario!.id, datos.accion, datos.motivo);
  }

  @Post('posts/:id/retirar')
  @Permiso(PERMISSIONS.MODERACION_ACTUAR)
  async retirarPost(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(retirarPostSchema)) datos: RetirarPost,
  ) {
    return this.moderacion.retirarPost(id, req.usuario!.id, datos.motivo);
  }
}
