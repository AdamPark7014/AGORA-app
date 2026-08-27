import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  crearEventoSchema,
  editarEventoSchema,
  enVivoQuerySchema,
  listarEventosSchema,
  responderEventoSchema,
  type CrearEvento,
  type EditarEvento,
  type EnVivoQuery,
  type ListarEventos,
  type ResponderEvento,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { EventosService } from './eventos.service.js';

@Controller('eventos')
@UseGuards(SesionGuard)
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @Get()
  async proximos(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(listarEventosSchema)) filtros: ListarEventos,
  ) {
    return this.eventos.proximos(req.usuario!.id, filtros);
  }

  @Get('en-vivo')
  async enVivo(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(enVivoQuerySchema)) query: EnVivoQuery,
  ) {
    return this.eventos.enVivo(req.usuario!.id, query);
  }

  @Get(':id')
  async detalle(@Req() req: RequestConSesion, @Param('id') id: string) {
    return this.eventos.detalle(id, req.usuario!.id);
  }

  @Post()
  async crear(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearEventoSchema)) datos: CrearEvento,
  ) {
    return this.eventos.crear(req.usuario!.id, datos);
  }

  @Patch(':id')
  async editar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(editarEventoSchema)) datos: EditarEvento,
  ) {
    return this.eventos.editar(id, req.usuario!.id, datos);
  }

  @Post(':id/asistencia')
  async responder(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(responderEventoSchema)) datos: ResponderEvento,
  ) {
    return this.eventos.responder(id, req.usuario!.id, datos);
  }

  @Delete(':id')
  @HttpCode(204)
  async borrar(@Req() req: RequestConSesion, @Param('id') id: string) {
    await this.eventos.borrar(id, req.usuario!.id);
  }
}
