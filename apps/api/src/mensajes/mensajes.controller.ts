import { Body, Controller, Get, Param, Post, Query, Req, Sse, UseGuards } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  abrirConversacionSchema,
  enviarMensajeSchema,
  listarMensajesSchema,
  type AbrirConversacion,
  type EnviarMensaje,
  type ListarMensajes,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { MensajesService } from './mensajes.service.js';
import { MensajesStreamService } from './mensajes-stream.service.js';

@Controller('mensajes')
@UseGuards(SesionGuard)
export class MensajesController {
  constructor(
    private readonly mensajes: MensajesService,
    private readonly stream: MensajesStreamService,
  ) {}

  @Get()
  async bandeja(@Req() req: RequestConSesion) {
    return this.mensajes.bandeja(req.usuario!.id);
  }

  @Get('no-leidos')
  async noLeidos(@Req() req: RequestConSesion) {
    return this.mensajes.noLeidos(req.usuario!.id);
  }

  @Post('abrir')
  async abrir(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(abrirConversacionSchema)) datos: AbrirConversacion,
  ) {
    return this.mensajes.abrirCon(req.usuario!.id, datos.handle);
  }

  @Sse(':id/stream')
  async streamConversacion(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    await this.mensajes.exigirParticipante(id, req.usuario!.id);
    return this.stream.canal(id) as Observable<MessageEvent>;
  }

  @Get(':id')
  async conversacion(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Query(new ZodPipe(listarMensajesSchema)) filtros: ListarMensajes,
  ) {
    return this.mensajes.mensajes(id, req.usuario!.id, filtros);
  }

  @Post(':id')
  async enviar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(enviarMensajeSchema)) datos: EnviarMensaje,
  ) {
    return this.mensajes.enviar(id, req.usuario!.id, datos);
  }
}
