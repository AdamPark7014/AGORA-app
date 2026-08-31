import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { PublicService } from './public.service.js';

/**
 * Tarjetas mínimas para OG / crawlers. Sin SesionGuard.
 * No expone correo ni datos sensibles.
 */
@SkipThrottle()
@Controller('public/tarjeta')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  @Get('publicacion/:id')
  publicacion(@Param('id') id: string) {
    return this.publicService.tarjetaPublicacion(id);
  }

  @Get('perfil/:handle')
  perfil(@Param('handle') handle: string) {
    return this.publicService.tarjetaPerfil(handle);
  }

  @Get('evento/:id')
  evento(@Param('id') id: string) {
    return this.publicService.tarjetaEvento(id);
  }

  @Get('anuncio/:id')
  anuncio(@Param('id') id: string) {
    return this.publicService.tarjetaAnuncio(id);
  }
}
