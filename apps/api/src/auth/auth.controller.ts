import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import {
  cambiarContrasenaSchema,
  crearContrasenaSchema,
  entrarSchema,
  solicitarOtpSchema,
  verificarOtpSchema,
  type CambiarContrasena,
  type CrearContrasena,
  type Entrar,
} from '@agora/contracts';
import { algunRolTienePermiso, esStaff, PERMISSIONS } from '@agora/rbac';

import {
  LIMITE_ENTRAR,
  LIMITE_OTP_SOLICITAR,
  LIMITE_OTP_VERIFICAR,
} from '../comun/almacen-limite.js';
import { LimitePorIp } from '../comun/limite.guard.js';
import { ZodPipe } from '../comun/zod.pipe.js';
import {
  COOKIE_SESION,
  opcionesCookieSesion,
  SesionGuard,
  type RequestConSesion,
} from '../comun/sesion.guard.js';
import { EntregaService, type EstadoEnvio } from '../correo/entrega.service.js';
import { AuthService } from './auth.service.js';

/** Los ids de seguimiento son UUID v4; cualquier otra cosa ni se busca. */
const ID_ENVIO = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Lo que devuelven las dos puertas (codigo y contraseña). `token` solo en modo token. */
interface RespuestaSesion {
  tienePerfil: boolean;
  tieneContrasena: boolean;
  token?: string;
  expiraEn?: Date;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly entrega: EntregaService,
  ) {}

  /**
   * Pide un codigo. Responde 204 siempre que el correo sea @udlap.mx, exista
   * la cuenta o no: no se puede usar este endpoint para descubrir quien esta
   * registrado.
   *
   * Limite propio y mas estrecho que el general: aqui no hay sesion todavia,
   * asi que se cuenta por IP, y este es el unico endpoint donde el abuso
   * cuesta dinero — cada llamada manda un correo de verdad.
   *
   * Techos (20/min, 200/h) alineados con los caps de negocio de `@agora/auth`
   * (1/min y 10/dia **por buzon**) sin ahogar el NAT del campus: muchas altas
   * comparten IP. El tope por correo es la defensa real; este es el cortafuegos
   * por IP.
   *
   * El id de seguimiento de la entrega va en la cabecera `X-Envio-Id` y no en
   * el cuerpo, para no cambiar el 204 del que dependen las apps nativas.
   */
  @Post('otp/solicitar')
  @Throttle(LIMITE_OTP_SOLICITAR)
  @LimitePorIp()
  @HttpCode(204)
  async solicitar(
    @Body(new ZodPipe(solicitarOtpSchema)) cuerpo: { email: string },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const envioId = await this.auth.solicitarCodigo(cuerpo.email);
    if (envioId) res.setHeader('X-Envio-Id', envioId);
  }

  /**
   * Si el codigo llego al buzon, reboto o sigue en camino. La pantalla de
   * "Revisa tu correo" lo pregunta mientras espera: es lo que convierte un
   * correo mal escrito en un aviso inmediato en vez de diez minutos de espera.
   * El id es opaco y de un solo envio; no revela a quien se mando.
   */
  @Get('otp/entrega/:envioId')
  @LimitePorIp()
  async entregaCodigo(@Param('envioId') envioId: string): Promise<EstadoEnvio> {
    const estado = ID_ENVIO.test(envioId) ? await this.entrega.consultar(envioId) : null;
    if (!estado) throw new NotFoundException('Envio desconocido.');
    return estado;
  }

  /**
   * Mismo motivo: sin sesion; adivinar codigos se hace aqui (30/min, 300/h).
   *
   * Desde las contraseñas, el codigo es para registrarse, para la primera vez
   * de una cuenta de antes y para "olvide mi contraseña". `tieneContrasena`
   * le dice a la pantalla si toca crearla; las apps nativas viejas lo ignoran.
   */
  @Post('otp/verificar')
  @Throttle(LIMITE_OTP_VERIFICAR)
  @LimitePorIp()
  async verificar(
    @Body(new ZodPipe(verificarOtpSchema))
    cuerpo: { email: string; codigo: string; modo: 'cookie' | 'token' },
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaSesion> {
    const { token, expiraEn, tienePerfil, tieneContrasena } = await this.auth.verificarCodigo(
      cuerpo.email,
      cuerpo.codigo,
      { userAgent: req.headers['user-agent'], ip: req.ip },
    );

    // La app nativa recibe el token y NO la cookie: guardarla no le serviria y
    // dejarla puesta seria una copia de la sesion viviendo de mas.
    if (cuerpo.modo === 'token') {
      return { tienePerfil, tieneContrasena, token, expiraEn };
    }

    res.cookie(COOKIE_SESION, token, opcionesCookieSesion(expiraEn));

    return { tienePerfil, tieneContrasena };
  }

  /**
   * Entrar con correo + contraseña: lo de todos los dias. Sin sesion, asi que
   * cuenta por IP; el bloqueo por cuenta vive en el servicio.
   */
  @Post('entrar')
  @Throttle(LIMITE_ENTRAR)
  @LimitePorIp()
  async entrar(
    @Body(new ZodPipe(entrarSchema)) cuerpo: Entrar,
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaSesion> {
    const { token, expiraEn, tienePerfil, tieneContrasena } = await this.auth.entrar(
      cuerpo.email,
      cuerpo.contrasena,
      { userAgent: req.headers['user-agent'], ip: req.ip },
      { recordarme: cuerpo.recordarme },
    );

    if (cuerpo.modo === 'token') {
      return { tienePerfil, tieneContrasena, token, expiraEn };
    }

    // Sin "recordarme" la cookie no lleva fecha: muere al cerrar el navegador.
    res.cookie(COOKIE_SESION, token, opcionesCookieSesion(cuerpo.recordarme ? expiraEn : null));

    return { tienePerfil, tieneContrasena };
  }

  /**
   * Crea la contraseña (o la reemplaza sin la actual si la sesion se abrio
   * con un codigo hace poco: "olvide mi contraseña").
   */
  @Post('contrasena')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async fijarContrasena(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(crearContrasenaSchema)) cuerpo: CrearContrasena,
  ): Promise<void> {
    await this.auth.fijarContrasena(req.usuario!.id, req.sesion!, cuerpo.contrasena);
  }

  /** Cambiarla sabiendo la actual. Con tope: aqui tambien se puede adivinar. */
  @Post('contrasena/cambiar')
  @HttpCode(204)
  @Throttle(LIMITE_ENTRAR)
  @UseGuards(SesionGuard)
  async cambiarContrasena(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(cambiarContrasenaSchema)) cuerpo: CambiarContrasena,
  ): Promise<void> {
    await this.auth.cambiarContrasena(req.usuario!.id, req.sesion!.id, cuerpo.actual, cuerpo.nueva);
  }

  @Get('yo')
  @UseGuards(SesionGuard)
  async yo(@Req() req: RequestConSesion) {
    const usuario = req.usuario!;
    const perfil = usuario.perfilId
      ? await this.auth.resumenPerfil(usuario.perfilId)
      : null;
    return {
      id: usuario.id,
      email: usuario.email,
      roles: usuario.roles,
      handle: usuario.handle,
      tienePerfil: usuario.perfilId !== null,
      tieneContrasena: usuario.tieneContrasena,
      // Para que la pantalla sepa si esta sesion puede fijar contraseña sin la actual.
      viaCodigo: req.sesion?.viaCodigo ?? true,
      nombre: perfil ? `${perfil.nombre} ${perfil.apellidos}` : null,
      fotoUrl: perfil?.fotoUrl ?? null,
      esStaff: esStaff(usuario.roles),
      puedeModerar: algunRolTienePermiso(usuario.roles, PERMISSIONS.MODERACION_COLA_VER),
      puedeSuspender: algunRolTienePermiso(usuario.roles, PERMISSIONS.USUARIO_SUSPENDER),
    };
  }

  @Post('salir')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async salir(
    @Req() req: RequestConSesion,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (req.tokenSesion) await this.auth.cerrarSesion(req.tokenSesion);
    res.clearCookie(COOKIE_SESION, {
      path: '/',
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    });
  }
}
