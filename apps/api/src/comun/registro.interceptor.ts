import {
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';

import type { RequestConSesion } from './sesion.guard.js';

/**
 * Registro de peticiones.
 *
 * La API no anotaba **ninguna**. Con eso, "va lento" o "a veces falla" no se
 * puede investigar: no hay dato que mirar. Y en un VPS propio no hay panel de
 * la nube que lo supla.
 *
 * Lo que se anota y por que:
 *
 *  - **Solo lo lento y lo que falla**, por omision. Una linea por peticion a
 *    9,000 usuarios es un registro que nadie lee y un disco que se llena. Lo
 *    interesante es la cola: la peticion de 3 segundos, no las mil de 20 ms.
 *  - **La duracion**, que es el dato que dice si algo se esta degradando.
 *  - **Quien**, con el id de usuario y no el token, para poder seguir un
 *    problema concreto sin dejar credenciales escritas en el disco.
 *
 * Con `LOG_TODAS_LAS_PETICIONES=true` se anotan todas, para depurar un rato.
 */

/** A partir de aqui una peticion es "lenta" y se anota aunque haya ido bien. */
const LENTA_MS = 700;

/** El healthcheck lo llama el orquestador cada pocos segundos: seria todo ruido. */
const SILENCIOSAS = new Set(['/api/salud']);

@Injectable()
export class RegistroInterceptor implements NestInterceptor {
  private readonly log = new Logger('HTTP');
  private readonly todas = process.env.LOG_TODAS_LAS_PETICIONES === 'true';

  intercept(contexto: ExecutionContext, siguiente: CallHandler): Observable<unknown> {
    if (contexto.getType() !== 'http') return siguiente.handle();

    const http = contexto.switchToHttp();
    const req = http.getRequest<RequestConSesion>();
    if (SILENCIOSAS.has(req.originalUrl.split('?')[0] ?? '')) return siguiente.handle();

    const inicio = Date.now();

    // `tap` con los tres casos: los errores tambien tardan, y una peticion que
    // falla despues de dos segundos es un dato distinto de una que falla al
    // instante.
    return siguiente.handle().pipe(
      tap({
        next: () => this.anotar(req, http.getResponse<Response>().statusCode, inicio),
        error: (error: unknown) => this.anotar(req, estadoDe(error), inicio),
      }),
    );
  }

  private anotar(req: RequestConSesion, estado: number, inicio: number): void {
    const ms = Date.now() - inicio;
    const lenta = ms >= LENTA_MS;
    const fallo = estado >= 400;

    if (!this.todas && !lenta && !fallo) return;

    // El id del usuario, no el token: el registro acaba en disco y en copias.
    const quien = req.usuario?.id ?? 'anonimo';
    const linea = `${estado} ${req.method} ${rutaSinDatos(req)} ${ms}ms ${quien}`;

    if (estado >= 500) this.log.error(linea);
    else if (fallo || lenta) this.log.warn(linea);
    else this.log.log(linea);
  }
}

/**
 * La ruta sin la cadena de consulta.
 *
 * Los parametros llevan busquedas, cursores y a veces el texto que alguien
 * escribio en el buscador. Nada de eso tiene que quedar escrito en un archivo
 * de registro solo para saber que endpoint tardo.
 */
export const rutaSinDatos = (req: Pick<Request, 'originalUrl'>): string =>
  req.originalUrl.split('?')[0] ?? req.originalUrl;

/** El codigo que le va a tocar a un error, para poder anotarlo antes del filtro. */
export function estadoDe(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    const e = error as { status?: unknown; getStatus?: () => number };
    if (typeof e.getStatus === 'function') return e.getStatus();
    if (typeof e.status === 'number') return e.status;
  }
  return 500;
}
