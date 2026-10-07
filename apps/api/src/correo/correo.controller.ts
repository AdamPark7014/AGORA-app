import { createHash, timingSafeEqual } from 'node:crypto';

import { Body, Controller, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { EntregaService } from './entrega.service.js';

interface EventoWebhook {
  readonly event?: unknown;
  readonly 'message-id'?: unknown;
  readonly reason?: unknown;
}

/**
 * Webhook de eventos transaccionales de Brevo.
 *
 * La URL lleva un token (CORREO_WEBHOOK_TOKEN) porque Brevo no firma sus
 * webhooks. Sin token configurado la ruta no existe. Sin limite de tasa: la
 * cuenta de Brevo es compartida con otras campanas y una tanda grande manda
 * cientos de eventos de golpe desde las mismas IPs; los que no son codigos de
 * Agora se descartan sin tocar nada.
 */
@Controller('correo')
export class CorreoController {
  constructor(private readonly entrega: EntregaService) {}

  @Post('brevo/:token')
  @SkipThrottle()
  @HttpCode(204)
  async eventosBrevo(@Param('token') token: string, @Body() cuerpo: unknown): Promise<void> {
    if (!tokenValido(token)) throw new NotFoundException();

    // Brevo manda un objeto por evento, o una lista si el webhook es "batched".
    const eventos = (Array.isArray(cuerpo) ? cuerpo : [cuerpo]) as EventoWebhook[];
    for (const e of eventos) {
      if (typeof e?.event !== 'string' || typeof e['message-id'] !== 'string') continue;
      await this.entrega.aplicarEvento(
        e['message-id'],
        e.event,
        typeof e.reason === 'string' ? e.reason : null,
      );
    }
  }
}

const huella = (texto: string): Buffer => createHash('sha256').update(texto).digest();

/** Comparacion en tiempo constante; las huellas igualan el largo. */
const tokenValido = (token: string): boolean => {
  const esperado = process.env.CORREO_WEBHOOK_TOKEN;
  if (!esperado) return false;
  return timingSafeEqual(huella(token), huella(esperado));
};
