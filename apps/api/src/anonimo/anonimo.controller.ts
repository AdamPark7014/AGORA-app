import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { publicarAnonimoSchema, type PublicarAnonimo } from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { AnonimoService } from './anonimo.service.js';

@Controller('anonimo')
@UseGuards(SesionGuard)
export class AnonimoController {
  constructor(private readonly anonimo: AnonimoService) {}

  /** Si la zona esta apagada, la interfaz no la muestra siquiera. */
  @Get('estado')
  estado() {
    return { habilitada: this.anonimo.habilitada };
  }

  @Get('alias')
  async alias(@Req() req: RequestConSesion) {
    return this.anonimo.miAlias(req.usuario!.id);
  }

  @Get()
  async feed(@Req() req: RequestConSesion, @Query('cursor') cursor?: string) {
    return this.anonimo.feed(req.usuario!.id, 30, cursor);
  }

  @Post()
  async publicar(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(publicarAnonimoSchema)) datos: PublicarAnonimo,
  ) {
    return this.anonimo.publicar(req.usuario!.id, datos.texto);
  }

  @Delete(':id')
  @HttpCode(204)
  async borrar(@Req() req: RequestConSesion, @Param('id') id: string) {
    await this.anonimo.borrar(id, req.usuario!.id);
  }
}
