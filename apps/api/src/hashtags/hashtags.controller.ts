import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { HashtagsService } from './hashtags.service.js';
import { limiteDeConsulta } from '../comun/consulta.js';

@Controller('hashtags')
@UseGuards(SesionGuard)
export class HashtagsController {
  constructor(private readonly hashtags: HashtagsService) {}

  @Get('trending')
  async trending(@Req() req: RequestConSesion) {
    return this.hashtags.trending(req.usuario!.id);
  }

  @Get(':tag')
  async publicaciones(
    @Req() req: RequestConSesion,
    @Param('tag') tag: string,
    @Query('cursor') cursor?: string,
    @Query('limite') limite?: string,
  ) {
    return this.hashtags.publicaciones(
      req.usuario!.id,
      tag,
      cursor,
      limiteDeConsulta(limite, 15, 30),
    );
  }
}
