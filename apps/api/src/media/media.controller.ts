import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize } from 'node:path';

import {
  BadRequestException,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

/**
 * Forma del archivo que entrega multer.
 *
 * Se declara aqui en vez de depender de `global.Express.Multer`: el tsconfig
 * fija `types: ["node"]`, asi que las declaraciones globales de @types/multer
 * no se cargan solas y el tipo no existiria.
 */
interface ArchivoMulter {
  readonly buffer: Buffer;
  readonly size: number;
  readonly mimetype: string;
  readonly originalname: string;
}

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  AlmacenLocal,
  MAX_BYTES,
  crearAlmacen,
  esVideo,
  excedeCuota,
  nombreArchivoLocalValido,
  validarSubida,
  type Almacen,
} from './almacen.js';
import { limpiarMetadatosVideo } from './metadatos-video.js';
import { ImagenInvalida, procesarImagen } from './procesar.js';

@Controller('media')
export class MediaController {
  private readonly almacen: Almacen = crearAlmacen();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sube una imagen y devuelve su id. Todavia no pertenece a nada: se asocia
   * al crear la publicacion o el anuncio.
   *
   * Se sube antes de publicar para que el usuario vea la miniatura mientras
   * escribe. El precio es que puede quedar basura si abandona el formulario;
   * eso lo limpia un barrido periodico, no vale bloquear la interfaz por ello.
   */
  @Post()
  @UseGuards(SesionGuard)
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: MAX_BYTES } }))
  async subir(@Req() req: RequestConSesion, @UploadedFile() archivo?: ArchivoMulter) {
    if (!archivo) throw new BadRequestException('No llego ningun archivo.');
    const ownerId = req.usuario!.id;

    // El tipo real (magic bytes), no el Content-Type que manda el cliente.
    const validacion = validarSubida(archivo.buffer, archivo.size);
    if (!validacion.ok) throw new BadRequestException(validacion.motivo);
    const { mime } = validacion;

    const usado = await this.prisma.media.aggregate({
      where: { ownerId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      _count: { _all: true },
      _sum: { bytes: true },
    });
    if (
      excedeCuota({ archivos: usado._count._all, bytes: usado._sum.bytes ?? 0 }, archivo.size)
    ) {
      throw new HttpException(
        'Llegaste al limite de archivos de hoy. Intenta de nuevo manana.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    let datos = archivo.buffer;
    let mimeFinal = mime;
    let ancho: number | null = null;
    let alto: number | null = null;
    let miniatura: Buffer | null = null;
    if (esVideo(mime)) {
      // MP4/MOV traen la ubicacion de grabacion; WebM no lleva GPS.
      if (mime !== 'video/webm') datos = limpiarMetadatosVideo(archivo.buffer).datos;
    } else {
      try {
        const procesada = await procesarImagen(archivo.buffer, mime);
        ({ datos, ancho, alto, miniatura } = procesada);
        mimeFinal = procesada.mime;
      } catch (e) {
        if (e instanceof ImagenInvalida) {
          throw new BadRequestException('La imagen esta danada o no se puede leer.');
        }
        throw e;
      }
    }

    const guardado = await this.almacen.guardar(datos, mimeFinal);
    const thumb = miniatura ? await this.almacen.guardar(miniatura, 'image/webp') : null;

    const media = await this.prisma.media.create({
      data: {
        ownerId,
        url: guardado.url,
        thumbUrl: thumb?.url ?? null,
        mime: guardado.mime,
        bytes: guardado.bytes + (thumb?.bytes ?? 0),
        ancho,
        alto,
      },
      select: { id: true, url: true, thumbUrl: true, mime: true, ancho: true, alto: true },
    });

    return { ...media, esVideo: esVideo(media.mime) };
  }

  /**
   * Sirve las imagenes del almacen local. En produccion no se usa: ahi las
   * sirve el CDN de R2 directamente, sin pasar por la API.
   */
  @Get('archivo/:nombre')
  async archivo(@Param('nombre') nombre: string, @Res() res: Response) {
    if (!(this.almacen instanceof AlmacenLocal)) {
      throw new NotFoundException('Las imagenes se sirven desde el CDN.');
    }

    // El nombre lo genera el servidor, pero igual se valida: un `..` aqui
    // seria leer cualquier archivo del disco.
    if (!nombreArchivoLocalValido(nombre)) {
      throw new NotFoundException('No existe.');
    }

    const ruta = normalize(join(this.almacen.raiz, nombre));
    if (!ruta.startsWith(normalize(this.almacen.raiz))) {
      throw new NotFoundException('No existe.');
    }

    try {
      await stat(ruta);
    } catch {
      throw new NotFoundException('No existe.');
    }

    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    createReadStream(ruta).pipe(res);
  }
}
