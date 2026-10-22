import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import {
  debeRenovarse,
  hashTokenSesion,
  sesionVigente,
  udlapVencida,
  vencimientoSesion,
} from '@agora/auth';
import { algunRolTienePermiso, esRolValido, type PermissionKey, type RoleKey } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';

export interface UsuarioSesion {
  readonly id: string;
  readonly email: string;
  readonly roles: RoleKey[];
  readonly perfilId: string | null;
  readonly handle: string | null;
  /** false = cuenta de antes de las contraseñas: la pantalla le pide crearla. */
  readonly tieneContrasena: boolean;
  /** Registrada con correo personal y sin confirmar su buzón UDLAP. Null = confirmado. */
  readonly udlapPendienteDesde: Date | null;
}

/**
 * Pasado el plazo para confirmar el correo UDLAP, la cuenta solo puede usar lo
 * de la cuenta misma: ver su estado, pedir y canjear el código, la contraseña,
 * salir y darse de baja.
 */
const RUTA_DE_CUENTA = /\/(auth|cuenta)\//;
export const MENSAJE_UDLAP_VENCIDA =
  'Confirma tu correo UDLAP para seguir usando Ágora: pide el código a tu correo @udlap.mx.';

/** La fila de la sesion, para las decisiones que dependen de como se abrio. */
export interface SesionActual {
  readonly id: string;
  readonly viaCodigo: boolean;
  readonly persistente: boolean;
  readonly createdAt: Date;
}

/** Request con el usuario ya resuelto. Evita castear a `any` en los controladores. */
export interface RequestConSesion extends Request {
  usuario?: UsuarioSesion;
  sesion?: SesionActual;
  tokenSesion?: string;
}

export const COOKIE_SESION = 'agora_sesion';

/**
 * `expires` null = cookie de sesion: el navegador la tira al cerrarse. Es lo
 * que pide quien entra sin "recordarme" en una computadora prestada.
 */
export const opcionesCookieSesion = (expires: Date | null): CookieOptions => ({
  httpOnly: true, // fuera del alcance de cualquier script en la pagina
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  ...(expires ? { expires } : {}),
  path: '/',
  // Con COOKIE_DOMAIN=".agora.mx" la sesion vale igual en agora.mx y en
  // admin.agora.mx, que es lo que hace posible el panel en un subdominio
  // sin un segundo inicio de sesion. En desarrollo se omite: poner un
  // dominio con "localhost" hace que el navegador descarte la cookie.
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
});

@Injectable()
export class SesionGuard implements CanActivate {
  /** Ver SesionGuardBaja: la unica ruta que un suspendido si puede usar. */
  protected readonly permiteSuspendido: boolean = false;

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const req = contexto.switchToHttp().getRequest<RequestConSesion>();
    const token = extraerToken(req);
    if (!token) throw new UnauthorizedException('Necesitas iniciar sesion.');

    const sesion = await this.prisma.session.findUnique({
      where: { tokenHash: hashTokenSesion(token) },
      include: {
        user: {
          include: { profile: { select: { id: true, handle: true } } },
        },
      },
    });

    const ahora = new Date();
    if (!sesion || !sesionVigente(sesion, ahora)) {
      throw new UnauthorizedException('Tu sesion expiro.');
    }
    if (sesion.user.estado === 'BAJA') {
      throw new UnauthorizedException('Esta cuenta ya no esta activa.');
    }
    if (sesion.user.estado === 'SUSPENDIDO' && !this.permiteSuspendido) {
      throw new UnauthorizedException('Tu cuenta esta suspendida.');
    }
    const udlapPendienteDesde = sesion.user.udlapPendienteDesde ?? null;
    if (
      udlapVencida(udlapPendienteDesde, ahora) &&
      !RUTA_DE_CUENTA.test(req.originalUrl ?? req.url ?? '')
    ) {
      // 403 y no 401: la sesión es buena (las apps no deben borrarla), solo
      // falta confirmar el buzón. La pantalla lo sabe por /auth/yo.
      throw new ForbiddenException(MENSAJE_UDLAP_VENCIDA);
    }

    // Sesion que se renueva con el uso: mientras abras la app al menos una vez
    // cada medio año, no vuelves a entrar. Las de "no recordarme" no se
    // renuevan: duran un dia y punto.
    if (sesion.persistente !== false && debeRenovarse(sesion.expiresAt, ahora)) {
      const expiraEn = vencimientoSesion(ahora);
      await this.prisma.session.update({ where: { id: sesion.id }, data: { expiresAt: expiraEn } });
      if (req.cookies?.[COOKIE_SESION] === token) {
        contexto.switchToHttp().getResponse<Response>().cookie(COOKIE_SESION, token, opcionesCookieSesion(expiraEn));
      }
    }

    req.usuario = {
      id: sesion.user.id,
      email: sesion.user.email,
      roles: sesion.user.roles.filter(esRolValido),
      perfilId: sesion.user.profile?.id ?? null,
      handle: sesion.user.profile?.handle ?? null,
      tieneContrasena: Boolean(sesion.user.passwordHash),
      udlapPendienteDesde,
    };
    req.sesion = {
      id: sesion.id,
      viaCodigo: sesion.viaCodigo !== false,
      persistente: sesion.persistente !== false,
      createdAt: sesion.createdAt ?? ahora,
    };
    req.tokenSesion = token;
    return true;
  }
}

/**
 * Igual que SesionGuard, pero deja pasar a una cuenta suspendida. Solo para
 * darse de baja: el derecho de cancelacion (LFPDPPP) y las reglas de las
 * tiendas no dejan de aplicar porque la cuenta este suspendida.
 */
@Injectable()
export class SesionGuardBaja extends SesionGuard {
  protected override readonly permiteSuspendido = true;
}

/**
 * El token viaja en cookie httpOnly. Se acepta tambien el header Authorization
 * porque la app Expo de la Fase 8 no comparte el frasco de cookies del
 * navegador.
 */
export const extraerToken = (req: RequestConSesion): string | undefined => {
  const cookie = (req.cookies as Record<string, string> | undefined)?.[COOKIE_SESION];
  if (cookie) return cookie;

  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice('Bearer '.length).trim();

  return undefined;
};

/** Exige un permiso concreto. Usar despues de SesionGuard. */
export const exigePermiso =
  (permiso: PermissionKey) =>
  (usuario: UsuarioSesion | undefined): void => {
    if (!usuario || !algunRolTienePermiso(usuario.roles, permiso)) {
      throw new UnauthorizedException('No tienes permiso para esto.');
    }
  };
