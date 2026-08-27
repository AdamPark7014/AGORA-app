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
  crearComentarioSchema,
  crearPostSchema,
  editarPostSchema,
  feedSchema,
  reaccionarSchema,
  votarEncuestaSchema,
  type CrearComentario,
  type CrearPost,
  type EditarPost,
  type Feed,
  type Reaccionar,
  type VotarEncuesta,
} from '@agora/contracts';

import { ZodPipe } from '../comun/zod.pipe.js';
import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { PostsService } from './posts.service.js';

@Controller()
@UseGuards(SesionGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get('feed')
  async feed(
    @Req() req: RequestConSesion,
    @Query(new ZodPipe(feedSchema)) filtros: Feed,
  ) {
    return this.posts.feed(req.usuario!.id, filtros);
  }

  @Post('posts')
  async crear(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearPostSchema)) datos: CrearPost,
  ) {
    return this.posts.crear(req.usuario!.id, datos);
  }

  @Get('posts/:id')
  async detalle(@Req() req: RequestConSesion, @Param('id') id: string) {
    return this.posts.detalle(id, req.usuario!.id);
  }

  @Post('posts/:id/comentarios')
  async comentar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(crearComentarioSchema)) datos: CrearComentario,
  ) {
    return this.posts.comentar(id, req.usuario!.id, datos);
  }

  @Post('posts/:id/reacciones')
  async reaccionar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(reaccionarSchema)) datos: Reaccionar,
  ) {
    return this.posts.reaccionar(id, req.usuario!.id, datos);
  }

  @Post('posts/:id/votos')
  async votar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(votarEncuestaSchema)) datos: VotarEncuesta,
  ) {
    return this.posts.votar(id, req.usuario!.id, datos.opcionId);
  }

  @Delete('posts/:id')
  @HttpCode(204)
  async borrar(@Req() req: RequestConSesion, @Param('id') id: string) {
    await this.posts.borrar(id, req.usuario!.id);
  }

  @Patch('posts/:id')
  async editar(
    @Req() req: RequestConSesion,
    @Param('id') id: string,
    @Body(new ZodPipe(editarPostSchema)) datos: EditarPost,
  ) {
    return this.posts.editar(id, req.usuario!.id, datos);
  }
}
