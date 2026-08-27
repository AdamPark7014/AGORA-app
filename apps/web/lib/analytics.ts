/**
 * Analytics de producto — fire-and-forget a la API interna.
 * Sin SDK externo: los eventos se almacenan en Postgres vía POST /analytics/evento.
 */

import { api } from './api';

type AnalyticsProps = Record<string, unknown>;

const PLATAFORMA = 'web';

function enviar(nombre: string, propiedades?: AnalyticsProps): void {
  void api('/analytics/evento', {
    method: 'POST',
    body: JSON.stringify({
      nombre,
      propiedades: { ...propiedades, plataforma: PLATAFORMA },
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Fire-and-forget: nunca bloquear la UX por telemetría.
  });
}

/** Registra un evento de producto. */
export function track(nombre: string, propiedades?: AnalyticsProps): void {
  enviar(nombre, propiedades);
}

/** Eventos instrumentados en web. */
export const analytics = {
  login: () => track('login'),
  publicar: (props?: AnalyticsProps) => track('publicar', props),
  dmEnviado: (props?: AnalyticsProps) => track('dm_enviado', props),
  eventoAsistencia: (props?: AnalyticsProps) => track('evento_asistencia', props),
};

/** Crash reporting básico (window.onerror / unhandledrejection). */
export function installCrashReporting(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    void api('/analytics/crash', {
      method: 'POST',
      body: JSON.stringify({
        mensaje: event.message?.slice(0, 2000) ?? 'window.error',
        stack: event.error?.stack?.slice(0, 8000),
        plataforma: PLATAFORMA,
      }),
    }).catch(() => {});
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const mensaje =
      reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : 'unhandledrejection';
    const stack = reason instanceof Error ? reason.stack : undefined;
    void api('/analytics/crash', {
      method: 'POST',
      body: JSON.stringify({
        mensaje: mensaje.slice(0, 2000),
        stack: stack?.slice(0, 8000),
        plataforma: PLATAFORMA,
      }),
    }).catch(() => {});
  });
}
