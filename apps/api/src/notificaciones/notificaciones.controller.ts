import { Body, Controller, Get, HttpCode, Patch, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { z } from 'zod';
import type { TipoNotificacion } from '@agora/db';

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { ZodPipe } from '../comun/zod.pipe.js';
import { NotificacionesService } from './notificaciones.service.js';
import { NotificacionesStreamService } from './notificaciones-stream.service.js';

const preferenciasSchema = z.object({
  preferencias: z.array(
    z.object({
      tipo: z.enum([
        'COMENTARIO',
        'REACCION',
        'MENSAJE',
        'EVENTO_NUEVO',
        'AVENTON_APARTADO',
        'MODERACION',
        'MENCION',
        'SEGUIDOR',
        'INSIGNIA',
        'RETO',
      ]),
      inApp: z.boolean(),
      push: z.boolean(),
    }),
  ),
});

@Controller('notificaciones')
@UseGuards(SesionGuard)
export class NotificacionesController {
  constructor(
    private readonly notificaciones: NotificacionesService,
    private readonly stream: NotificacionesStreamService,
  ) {}

  @Sse('stream')
  streamNotificaciones(@Req() req: RequestConSesion): Observable<MessageEvent> {
    return this.stream.canal(req.usuario!.id) as Observable<MessageEvent>;
  }

  @Get()
  async listar(
    @Req() req: RequestConSesion,
    @Query('cursor') cursor?: string,
    @Query('limite') limite?: string,
  ) {
    return this.notificaciones.listar(
      req.usuario!.id,
      cursor,
      limite ? Math.min(Number(limite), 50) : 30,
    );
  }

  @Get('preferencias')
  async preferencias(@Req() req: RequestConSesion) {
    return this.notificaciones.preferencias(req.usuario!.id);
  }

  @Patch('preferencias')
  async actualizarPreferencias(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(preferenciasSchema)) datos: z.infer<typeof preferenciasSchema>,
  ) {
    return this.notificaciones.actualizarPreferencias(
      req.usuario!.id,
      datos.preferencias as Array<{ tipo: TipoNotificacion; inApp: boolean; push: boolean }>,
    );
  }

  @Get('sin-leer')
  async sinLeer(@Req() req: RequestConSesion) {
    return this.notificaciones.sinLeer(req.usuario!.id);
  }

  @Get('cumples')
  async cumples(@Req() req: RequestConSesion) {
    return this.notificaciones.cumplenHoy(req.usuario!.id);
  }

  @Post('leidas')
  @HttpCode(204)
  async leidas(@Req() req: RequestConSesion) {
    await this.notificaciones.marcarLeidas(req.usuario!.id);
  }
}
