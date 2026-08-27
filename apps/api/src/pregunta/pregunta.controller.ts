import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { responderPreguntaSchema, type ResponderPregunta } from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { PreguntaService } from './pregunta.service.js';

@Controller('pregunta')
@UseGuards(SesionGuard)
export class PreguntaController {
  constructor(private readonly pregunta: PreguntaService) {}

  @Get('hoy')
  async hoy(@Req() req: RequestConSesion) {
    return this.pregunta.hoyPara(req.usuario!.id);
  }

  @Post(':id/responder')
  async responder(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(responderPreguntaSchema)) datos: ResponderPregunta,
  ) {
    return this.pregunta.responder(req.usuario!.id, id, datos.opcion);
  }
}
