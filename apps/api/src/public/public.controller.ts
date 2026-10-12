import { Controller, Get, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { PublicService } from './public.service.js';

/**
 * Tarjetas mínimas para OG / crawlers. Sin SesionGuard.
 * No expone correo ni datos sensibles, ni el nombre de perfiles restringidos.
 *
 * Sin limite por IP a proposito: quien mas las pide es el servidor de la web
 * (metadatos de cada pagina compartida), y todas sus peticiones salen de la
 * misma IP. Lo que protege aqui es que la tarjeta no lleve nada privado.
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
