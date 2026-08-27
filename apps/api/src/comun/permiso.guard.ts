import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { algunRolTienePermiso, type PermissionKey } from '@agora/rbac';

import type { RequestConSesion } from './sesion.guard.js';

export const CLAVE_PERMISO = 'agora:permiso';

/**
 * Exige un permiso concreto en la ruta.
 *
 * Se comprueba en el servidor, siempre. El panel de moderación esconde los
 * botones que no te tocan, pero eso es cortesía visual: la única defensa real
 * es esta, porque un endpoint se puede llamar sin pasar por la interfaz.
 */
export const Permiso = (permiso: PermissionKey) => SetMetadata(CLAVE_PERMISO, permiso);

@Injectable()
export class PermisoGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const requerido = this.reflector.getAllAndOverride<PermissionKey | undefined>(CLAVE_PERMISO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (!requerido) return true;

    const req = contexto.switchToHttp().getRequest<RequestConSesion>();
    if (!req.usuario) throw new UnauthorizedException('Necesitas iniciar sesión.');

    if (!algunRolTienePermiso(req.usuario.roles, requerido)) {
      // El mensaje no dice qué permiso falta: enumerar permisos le da a un
      // atacante el mapa de la superficie administrativa.
      throw new ForbiddenException('No tienes permiso para esto.');
    }

    return true;
  }
}
