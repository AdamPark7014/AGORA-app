/**
 * Rachas e insignias de campus.
 *
 * El ping registra actividad del día; se manda una vez por sesión de pestaña
 * al abrir el feed para no martillar la API en cada navegación interna.
 */

import {
  mensajeNuevaInsignia,
  type BadgeCodigo,
  type ComparacionCampus,
  type GamificacionPingResponse,
  type GamificacionResponse,
  type LeaderboardResponse,
  type RetoSemanal,
  type SemanaPregunta,
} from '@agora/contracts';

import { api } from './api';

const CLAVE_PING_SESION = 'agora-gamificacion-ping';
export const EVENTO_REFRESH_GAMIFICACION = 'agora-gamificacion-refresh';

/** Progreso semanal de la pregunta del día (lunes–domingo, campus). */
export type { SemanaPregunta, RetoSemanal, ComparacionCampus };

export type GamificacionExtendida = GamificacionResponse & {
  semanaPregunta?: SemanaPregunta;
  retoSemanal?: RetoSemanal;
  comparacionCampus?: ComparacionCampus;
};

/** Estado de gamificación del usuario autenticado. */
export function obtenerGamificacion(): Promise<GamificacionExtendida> {
  return api<GamificacionExtendida>('/gamificacion/mio');
}

/** Rachas e insignias públicas de un perfil (misma universidad). */
export function gamificacionPorHandle(handle: string): Promise<GamificacionResponse> {
  return api<GamificacionResponse>(`/gamificacion/${encodeURIComponent(handle)}`);
}

/** Texto para compartir la racha actual. */
export function textoCompartirRacha(rachaActual: number): string {
  return `Llevo 🔥 ${rachaActual} días seguidos en Ágora — ¿te sumas? https://udlagora.com`;
}

/** Top rachas del campus (misma universidad). */
export function obtenerLeaderboard(limite = 5): Promise<LeaderboardResponse> {
  return api<LeaderboardResponse>(`/gamificacion/leaderboard?limite=${limite}`);
}

function mostrarToastInsignias(codigos: BadgeCodigo[]): void {
  if (typeof document === 'undefined') return;

  codigos.forEach((codigo, index) => {
    const el = document.createElement('div');
    el.className = 'insignia-toast';
    el.setAttribute('role', 'status');
    el.textContent = mensajeNuevaInsignia(codigo);
    el.style.top = `${16 + index * 64}px`;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('insignia-toast--visible'));
    window.setTimeout(() => {
      el.classList.remove('insignia-toast--visible');
      window.setTimeout(() => el.remove(), 320);
    }, 4200);
  });
}

/** Muestra celebración de insignias nuevas (ping, pregunta, publicar, aventón). */
export function notificarInsigniasNuevas(codigos?: BadgeCodigo[] | null): void {
  if (!codigos?.length) return;
  mostrarToastInsignias(codigos);
  window.dispatchEvent(new CustomEvent(EVENTO_REFRESH_GAMIFICACION));
}

/** Registra actividad de hoy y evalúa insignias nuevas. */
export function pingGamificacion(): Promise<GamificacionPingResponse> {
  return api<GamificacionPingResponse>('/gamificacion/ping', { method: 'POST' }).then((resp) => {
    notificarInsigniasNuevas(resp.nuevasInsignias);
    return resp;
  });
}

/** Ping idempotente por sesión de pestaña (sessionStorage). */
export function pingGamificacionSiNecesario(): void {
  if (typeof window === 'undefined') return;

  try {
    if (sessionStorage.getItem(CLAVE_PING_SESION)) return;
    sessionStorage.setItem(CLAVE_PING_SESION, '1');
    void pingGamificacion().catch(() => {
      sessionStorage.removeItem(CLAVE_PING_SESION);
    });
  } catch {
    // Modo privado estricto: intentar igual, sin marcar sesión.
    void pingGamificacion().catch(() => undefined);
  }
}
