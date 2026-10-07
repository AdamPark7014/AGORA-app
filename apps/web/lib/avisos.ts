'use client';

/**
 * Avisos y confirmaciones globales. Funciones sueltas (no hooks) para poder
 * llamarlas desde cualquier handler; `<AvisosGlobales />` en el layout las pinta.
 */

export type TonoAviso = 'info' | 'error';

export interface DetalleAviso {
  texto: string;
  tono: TonoAviso;
}

export interface OpcionesConfirmar {
  titulo: string;
  detalle?: string;
  accion?: string;
  peligro?: boolean;
}

export interface DetalleConfirmar extends OpcionesConfirmar {
  responder: (si: boolean) => void;
}

export const EVENTO_AVISO = 'agora:aviso';
export const EVENTO_CONFIRMAR = 'agora:confirmar';

export function avisar(texto: string, tono: TonoAviso = 'info'): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<DetalleAviso>(EVENTO_AVISO, { detail: { texto, tono } }));
}

/** Sustituto de `window.confirm` con diálogo accesible. */
export function confirmar(opciones: OpcionesConfirmar): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  return new Promise((responder) => {
    const evento = new CustomEvent<DetalleConfirmar>(EVENTO_CONFIRMAR, {
      detail: { ...opciones, responder },
      cancelable: true,
    });
    // Si nadie escucha (componente sin montar), el evento no se cancela y
    // se cae al confirm nativo antes que perder la acción.
    if (window.dispatchEvent(evento)) responder(window.confirm(opciones.titulo));
  });
}
