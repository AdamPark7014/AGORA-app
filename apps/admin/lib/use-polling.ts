'use client';

import { useEffect, useRef } from 'react';

/** Ejecuta un callback cada `ms` mientras el componente esté montado y la pestaña visible. */
export function usePolling(callback: () => void | Promise<void>, ms: number, activo = true) {
  const guardado = useRef(callback);
  guardado.current = callback;

  useEffect(() => {
    if (!activo) return;

    const tick = () => {
      if (document.visibilityState === 'visible') void guardado.current();
    };

    const id = setInterval(tick, ms);
    return () => clearInterval(id);
  }, [ms, activo]);
}
