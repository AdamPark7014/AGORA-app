import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, finalize, interval, map, merge } from 'rxjs';

export interface MensajeStreamPayload {
  id: string;
  texto: string;
  createdAt: Date;
  autorId: string;
  autor: {
    handle: string;
    nombre: string;
    fotoUrl: string | null;
  } | null;
}

export interface EventoMensajeStream {
  tipo: 'mensaje' | 'ping';
  mensaje?: MensajeStreamPayload;
}

/**
 * Canal SSE por conversacion. Cada hilo tiene un Subject compartido entre
 * todas las pestañas/dispositivos conectados a ese chat.
 */
@Injectable()
export class MensajesStreamService implements OnModuleDestroy {
  private readonly canales = new Map<
    string,
    { sujeto: Subject<EventoMensajeStream>; conexiones: number }
  >();

  canal(conversationId: string): Observable<{ data: EventoMensajeStream }> {
    let entrada = this.canales.get(conversationId);
    if (!entrada) {
      entrada = { sujeto: new Subject<EventoMensajeStream>(), conexiones: 0 };
      this.canales.set(conversationId, entrada);
    }
    entrada.conexiones += 1;

    return merge(
      entrada.sujeto.asObservable(),
      interval(30_000).pipe(map(() => ({ tipo: 'ping' as const }))),
    ).pipe(
      map((evento) => ({ data: evento })),
      finalize(() => this.soltar(conversationId)),
    );
  }

  emitir(conversationId: string, evento: EventoMensajeStream) {
    this.canales.get(conversationId)?.sujeto.next(evento);
  }

  get conectados(): number {
    return this.canales.size;
  }

  private soltar(conversationId: string) {
    const entrada = this.canales.get(conversationId);
    if (!entrada) return;

    entrada.conexiones -= 1;
    if (entrada.conexiones > 0) return;

    entrada.sujeto.complete();
    this.canales.delete(conversationId);
  }

  onModuleDestroy() {
    for (const { sujeto } of this.canales.values()) sujeto.complete();
    this.canales.clear();
  }
}
