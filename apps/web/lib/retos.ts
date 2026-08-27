/**
 * Retos entre amigos y eventos en vivo del feed.
 *
 * Los retos comparan racha o semana de preguntas con alguien que sigues o
 * compartes comunidad. Los eventos en vivo son los que están en curso o
 * empiezan en las próximas horas.
 */

import type {
  CrearReto,
  EnVivoResponse,
  PuedeRetarResponse,
  RetosActivosResponse,
  RetosHistorialResponse,
  RetosRankingSemanalResponse,
} from '@agora/contracts';
import { TIPOS_RETO_AMIGO } from '@agora/contracts';

import { api } from './api';

export type TipoRetoAmigo = (typeof TIPOS_RETO_AMIGO)[number];

export const EVENTO_REFRESH_RETOS = 'agora-retos-refresh';

/** Eventos en curso o que empiezan pronto (ventana en horas). */
export function obtenerEventosEnVivo(horas = 4): Promise<EnVivoResponse> {
  return api<EnVivoResponse>(`/eventos/en-vivo?horas=${horas}`);
}

/** Retos pendientes (te retaron) y duelos activos. */
export function obtenerRetosActivos(): Promise<RetosActivosResponse> {
  return api<RetosActivosResponse>('/retos/activos');
}

/** Desafía a un amigo por handle. */
export function crearReto(datos: CrearReto): Promise<{ id: string; estado: string }> {
  return api<{ id: string; estado: string }>('/retos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

/** Indica si puedes retar a alguien (misma universidad, sin bloqueo implícito en crear). */
export function puedeRetar(handle: string): Promise<PuedeRetarResponse> {
  return api<PuedeRetarResponse>(`/retos/puede/${encodeURIComponent(handle)}`);
}

/** Top de victorias en duelos activos de la semana ISO. */
export function rankingSemanal(limite = 5): Promise<RetosRankingSemanalResponse> {
  return api<RetosRankingSemanalResponse>(`/retos/ranking-semanal?limite=${limite}`);
}

/** Duelos rechazados y de semanas pasadas. */
export function obtenerRetosHistorial(
  cursor?: string,
  limite = 20,
): Promise<RetosHistorialResponse> {
  const params = new URLSearchParams({ limite: String(limite) });
  if (cursor) params.set('cursor', cursor);
  return api(`/retos/historial?${params.toString()}`);
}

/** Acepta o rechaza un reto pendiente. */
export function responderReto(
  retoId: string,
  aceptar: boolean,
): Promise<{ estado: 'ACTIVO' | 'RECHAZADO' }> {
  return api<{ estado: 'ACTIVO' | 'RECHAZADO' }>(`/retos/${retoId}/responder`, {
    method: 'POST',
    body: JSON.stringify({ aceptar }),
  });
}

/** Etiqueta legible del tipo de reto. */
export function etiquetaTipoReto(tipo: TipoRetoAmigo, corto = false): string {
  if (tipo === 'RACHA') return corto ? '🔥 Racha' : '🔥 racha diaria';
  return corto ? '🧠 Preguntas' : '🧠 semana de preguntas';
}

/** Avisa a otros paneles del feed que recarguen retos. */
export function refrescarRetosEnFeed(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENTO_REFRESH_RETOS));
}
