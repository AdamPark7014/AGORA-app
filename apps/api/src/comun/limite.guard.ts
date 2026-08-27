import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

import { extraerToken, type RequestConSesion } from './sesion.guard.js';

/**
 * Limite de peticiones con la clave correcta.
 *
 * El limitador venia contando **por IP**, y eso no funciona aqui por una razon
 * muy concreta de este producto: Agora es una red de campus. Miles de alumnos
 * salen a internet por el NAT de la UDLAP, asi que para el servidor son *una
 * sola IP*. Con 60 peticiones por minuto por IP, el campus entero comparte el
 * cupo de un usuario y la app deja de funcionar justo donde mas se usa —
 * conectado al WiFi de la universidad.
 *
 * La prueba de humo lo enseño sin necesidad de carga: un solo navegador
 * recorriendo quince pantallas ya se ganaba 429.
 *
 * La regla ahora:
 *
 *  - **Con sesion**, la clave es el token. Cada persona tiene su propio cupo y
 *    salir por la misma IP que otros mil no le quita nada.
 *  - **Sin sesion**, se sigue contando por IP, que es lo unico que hay. Ese
 *    tramo cubre el login, que es justo donde el abuso importa.
 *
 * El token se guarda **hasheado**: la clave acaba en memoria del limitador y
 * en mensajes de depuracion, y un token de sesion en claro ahi es una llave
 * de la cuenta tirada en el suelo.
 */
/**
 * La clave con la que se cuenta esta peticion.
 *
 * Aparte del guard para poder probarla: es la decision de seguridad de todo
 * esto y no deberia hacer falta levantar Nest para comprobarla.
 */
export function claveDeLimite(req: RequestConSesion): string {
  const token = extraerToken(req);
  if (token) return `s:${createHash('sha256').update(token).digest('base64url').slice(0, 24)}`;

  // `req.ips` viene poblado cuando TRUST_PROXY=true; ahi el primer elemento
  // es el cliente real y no el proxy.
  return `ip:${req.ips?.[0] ?? req.ip ?? 'desconocida'}`;
}

@Injectable()
export class LimiteGuard extends ThrottlerGuard {
  protected async getTracker(req: RequestConSesion): Promise<string> {
    return claveDeLimite(req);
  }
}
