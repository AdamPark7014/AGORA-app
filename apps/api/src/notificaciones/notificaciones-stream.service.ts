import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, finalize, interval, map, merge } from 'rxjs';

export interface EventoNotificacionStream {
  tipo: 'actualizacion' | 'ping';
  total?: number;
}

/**
 * El canal de avisos en vivo (SSE).
 *
 * Un `Subject` por persona conectada, con cuenta de suscriptores. Lo de la
 * cuenta no es adorno: la version anterior metia el `Subject` en el mapa y no
 * lo sacaba nunca, asi que el mapa crecia con **cada persona que se hubiera
 * conectado alguna vez** y no bajaba jamas. Con ~9,000 cuentas eso no tumba el
 * proceso, pero es memoria que solo sube en un servidor que se supone que vive
 * meses sin reiniciarse — y el dia que entre otra universidad, sube el doble.
 *
 * Una misma persona puede tener varias conexiones a la vez (el navegador, el
 * telefono, otra pestaña). Todas comparten el `Subject`, y el canal solo se
 * tira cuando se va la ultima.
 */
@Injectable()
export class NotificacionesStreamService implements OnModuleDestroy {
  private readonly canales = new Map<
    string,
    { sujeto: Subject<EventoNotificacionStream>; conexiones: number }
  >();

  canal(userId: string): Observable<{ data: EventoNotificacionStream }> {
    let entrada = this.canales.get(userId);
    if (!entrada) {
      entrada = { sujeto: new Subject<EventoNotificacionStream>(), conexiones: 0 };
      this.canales.set(userId, entrada);
    }
    entrada.conexiones += 1;

    return merge(
      entrada.sujeto.asObservable(),
      // Un latido cada 30 s. Sin el, los proxys cortan una conexion que lleva
      // minutos callada y el cliente cree que sigue viva.
      interval(30_000).pipe(map(() => ({ tipo: 'ping' as const }))),
    ).pipe(
      map((evento) => ({ data: evento })),
      finalize(() => this.soltar(userId)),
    );
  }

  emitir(userId: string, evento: EventoNotificacionStream) {
    this.canales.get(userId)?.sujeto.next(evento);
  }

  /** Cuantas personas tienen el canal abierto. Para /salud y para pruebas. */
  get conectados(): number {
    return this.canales.size;
  }

  private soltar(userId: string) {
    const entrada = this.canales.get(userId);
    if (!entrada) return;

    entrada.conexiones -= 1;
    if (entrada.conexiones > 0) return;

    entrada.sujeto.complete();
    this.canales.delete(userId);
  }

  onModuleDestroy() {
    for (const { sujeto } of this.canales.values()) sujeto.complete();
    this.canales.clear();
  }
}
