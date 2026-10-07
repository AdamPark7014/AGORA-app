import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  actualizarPerfilSchema,
  crearPerfilSchema,
  silenciarComunidadSchema,
  type ActualizarPerfil,
  type CrearPerfil,
  type SilenciarComunidad,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { PerfilService } from './perfil.service.js';

@Controller('perfil')
@UseGuards(SesionGuard)
export class PerfilController {
  constructor(private readonly perfiles: PerfilService) {}

  @Post()
  async crear(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearPerfilSchema)) datos: CrearPerfil,
  ) {
    return this.perfiles.crear(req.usuario!.id, datos);
  }

  @Get('mio')
  async mio(@Req() req: RequestConSesion) {
    return this.perfiles.mio(req.usuario!.id);
  }

  @Patch()
  async actualizar(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(actualizarPerfilSchema)) datos: ActualizarPerfil,
  ) {
    return this.perfiles.actualizar(req.usuario!.id, datos);
  }

  @Get('mis-comunidades')
  async misComunidades(@Req() req: RequestConSesion) {
    return this.perfiles.misComunidades(req.usuario!.id);
  }

  @Patch('comunidades/:slug')
  async silenciarComunidad(
    @Req() req: RequestConSesion,
    @Param('slug') slug: string,
    @Body(new ZodPipe(silenciarComunidadSchema)) datos: SilenciarComunidad,
  ) {
    return this.perfiles.silenciarComunidad(req.usuario!.id, slug, datos.silenciada);
  }

  @Post(':handle/seguir')
  async seguir(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.perfiles.alternarSeguir(req.usuario!.id, handle.toLowerCase());
  }

  @Get(':handle/publicaciones')
  async publicaciones(
    @Req() req: RequestConSesion,
    @Param('handle') handle: string,
    @Query('cursor') cursor?: string,
    @Query('limite') limite?: string,
  ) {
    return this.perfiles.publicacionesDe(
      handle.toLowerCase(),
      req.usuario!.id,
      cursor,
      Number(limite) > 0 ? Math.min(Math.floor(Number(limite)), 40) : 20,
    );
  }

  @Get(':handle/seguidores')
  async seguidores(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.perfiles.listarSeguidores(handle.toLowerCase(), req.usuario!.id);
  }

  @Get(':handle/siguiendo')
  async siguiendo(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.perfiles.listarSiguiendo(handle.toLowerCase(), req.usuario!.id);
  }

  @Get(':handle')
  async porHandle(@Req() req: RequestConSesion, @Param('handle') handle: string) {
    return this.perfiles.porHandle(handle.toLowerCase(), req.usuario!.id);
  }
}
