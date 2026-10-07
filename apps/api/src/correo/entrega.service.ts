import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import {
  ESTADOS_FINALES,
  combinarEstado,
  desbloquearBrevo,
  estadoDeEvento,
  eventosBrevo,
  type EstadoEntrega,
  type Proveedor,
} from '@agora/correo';

/** Lo que dura el seguimiento: el codigo vence a los 10 minutos. */
const TTL_MS = 30 * 60_000;
/** Tope de envios seguidos a la vez; de sobra para el campus. */
const MAXIMO = 5_000;
/** Si el webhook no ha dicho nada, cada cuanto se le pregunta a Brevo. */
const CADA_CONSULTA_MS = 8_000;

interface Envio {
  readonly messageId: string;
  readonly destino: string;
  readonly proveedor: Proveedor;
  readonly creado: number;
  estado: EstadoEntrega;
  motivo: string | null;
  consultadoEn: number;
  desbloqueado: boolean;
}

export interface EstadoEnvio {
  readonly estado: EstadoEntrega;
}

/**
 * Sigue cada codigo enviado hasta saber si llego al buzon.
 *
 * Fuentes, en orden: el webhook de Brevo (casi inmediato) y, si no ha dicho
 * nada, la API de eventos de Brevo cuando la pantalla pregunta. Asi un webhook
 * caido o un reinicio no dejan a nadie sin saber que paso.
 *
 * Vive en memoria a proposito: hay una sola replica de la API y el dato vale
 * minutos. Si algun dia hay varias, esto se muda a Redis.
 *
 * Cada desenlace queda en el log ("Entregado a …", "Rebotó …"): es la
 * bitacora con la que se revisa que los codigos lleguen.
 */
@Injectable()
export class EntregaService {
  private readonly logger = new Logger(EntregaService.name);
  private readonly envios = new Map<string, Envio>();
  private readonly porMensaje = new Map<string, string>();

  /** Empieza a seguir un mensaje aceptado por el proveedor. Devuelve el id opaco para la pantalla. */
  registrar(messageId: string, destino: string, proveedor: Proveedor, ahora = Date.now()): string {
    this.purgar(ahora);
    const envioId = randomUUID();
    this.envios.set(envioId, {
      messageId,
      destino,
      proveedor,
      creado: ahora,
      estado: 'enviado',
      motivo: null,
      consultadoEn: ahora,
      desbloqueado: false,
    });
    this.porMensaje.set(normalizarId(messageId), envioId);
    return envioId;
  }

  /** Aplica un evento del webhook. Ignora mensajes que no son codigos de Agora (la cuenta es compartida). */
  async aplicarEvento(messageId: string, evento: string, motivo: string | null): Promise<void> {
    const envioId = this.porMensaje.get(normalizarId(messageId));
    const envio = envioId ? this.envios.get(envioId) : undefined;
    if (!envio) return;
    await this.avanzar(envio, evento, motivo);
  }

  /** Estado para la pantalla; si sigue abierto y el webhook calla, pregunta a Brevo. */
  async consultar(envioId: string, ahora = Date.now()): Promise<EstadoEnvio | null> {
    const envio = this.envios.get(envioId);
    if (!envio) return null;

    if (
      !ESTADOS_FINALES.has(envio.estado) &&
      envio.proveedor === 'brevo' &&
      ahora - envio.consultadoEn >= CADA_CONSULTA_MS
    ) {
      envio.consultadoEn = ahora;
      try {
        const eventos = await eventosBrevo(process.env.BREVO_API_KEY ?? '', envio.messageId);
        // Brevo los devuelve del mas nuevo al mas viejo; se aplican en orden.
        for (const e of [...eventos].reverse()) await this.avanzar(envio, e.evento, e.motivo);
      } catch (error) {
        const detalle = error instanceof Error ? error.message : String(error);
        this.logger.warn(`No se pudo consultar la entrega en Brevo: ${detalle}`);
      }
    }

    return { estado: envio.estado };
  }

  private async avanzar(envio: Envio, evento: string, motivo: string | null): Promise<void> {
    const nuevo = estadoDeEvento(evento);
    if (!nuevo) return;

    const antes = envio.estado;
    envio.estado = combinarEstado(antes, nuevo);
    if (envio.estado === antes) return;
    if (motivo) envio.motivo = motivo;

    const quien = enmascarar(envio.destino);
    const segundos = Math.round((Date.now() - envio.creado) / 1000);
    const porque = envio.motivo ? `: ${envio.motivo}` : '';

    switch (envio.estado) {
      case 'entregado':
        this.logger.log(`Entregado a ${quien} en ${segundos} s`);
        break;
      case 'demorado':
        this.logger.warn(`Entrega demorada a ${quien}${porque}`);
        break;
      case 'rebotado':
        this.logger.error(`Rebotó el código para ${quien}${porque}`);
        break;
      case 'error':
        this.logger.error(`Error del proveedor con ${quien}${porque}`);
        break;
      case 'bloqueado':
        this.logger.error(`Brevo tenía bloqueado a ${quien} por un rebote anterior`);
        await this.desbloquear(envio);
        break;
    }
  }

  /**
   * Libera la direccion para el siguiente intento. Si de verdad no existe,
   * el siguiente envio rebota y la pantalla lo dice; si era buena, la persona
   * vuelve a poder entrar. Una sola vez por envio.
   */
  private async desbloquear(envio: Envio): Promise<void> {
    if (envio.desbloqueado || envio.proveedor !== 'brevo') return;
    envio.desbloqueado = true;
    try {
      const estaba = await desbloquearBrevo(process.env.BREVO_API_KEY ?? '', envio.destino);
      if (estaba) this.logger.log(`Desbloqueado en Brevo: ${enmascarar(envio.destino)}`);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo desbloquear en Brevo: ${detalle}`);
    }
  }

  private purgar(ahora: number): void {
    for (const [id, envio] of this.envios) {
      if (ahora - envio.creado < TTL_MS && this.envios.size < MAXIMO) break;
      this.envios.delete(id);
      this.porMensaje.delete(normalizarId(envio.messageId));
    }
  }
}

/** El webhook manda el Message-ID a veces con `<>` y a veces sin ellos. */
const normalizarId = (messageId: string): string => messageId.trim().replace(/^<|>$/g, '');

const enmascarar = (email: string): string => {
  const [buzon = '', dominio = ''] = email.split('@');
  return `${buzon.slice(0, 2)}${'*'.repeat(Math.max(buzon.length - 2, 1))}@${dominio}`;
};
