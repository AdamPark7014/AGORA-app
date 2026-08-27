import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { hashTokenSesion, sesionVigente } from '@agora/auth';
import { algunRolTienePermiso, esRolValido, type PermissionKey, type RoleKey } from '@agora/rbac';

import { PrismaService } from '../prisma/prisma.service.js';

export interface UsuarioSesion {
  readonly id: string;
  readonly email: string;
  readonly roles: RoleKey[];
  readonly perfilId: string | null;
  readonly handle: string | null;
}

/** Request con el usuario ya resuelto. Evita castear a `any` en los controladores. */
export interface RequestConSesion extends Request {
  usuario?: UsuarioSesion;
  tokenSesion?: string;
}

export const COOKIE_SESION = 'agora_sesion';

@Injectable()
export class SesionGuard implements CanActivate {
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

    if (!sesion || !sesionVigente(sesion, new Date())) {
      throw new UnauthorizedException('Tu sesion expiro.');
    }
    if (sesion.user.estado === 'BAJA') {
      throw new UnauthorizedException('Esta cuenta ya no esta activa.');
    }

    req.usuario = {
      id: sesion.user.id,
      email: sesion.user.email,
      roles: sesion.user.roles.filter(esRolValido),
      perfilId: sesion.user.profile?.id ?? null,
      handle: sesion.user.profile?.handle ?? null,
    };
    req.tokenSesion = token;
    return true;
  }
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
