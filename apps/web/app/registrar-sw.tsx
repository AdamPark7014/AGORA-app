'use client';

import { useEffect } from 'react';
import { installCrashReporting } from '@/lib/analytics';

/**
 * Registra el service worker y limpia versiones viejas que cacheaban HTML
 * sin estilos.
 */
export function RegistrarSW() {
  useEffect(() => {
    installCrashReporting();
    if (!('serviceWorker' in navigator)) return;

    // Forzar actualización del SW y borrar caches rotos de agora-v1.
    void caches.keys().then((claves) => {
      claves
        .filter((c) => c.startsWith('agora-') && c !== 'agora-v2')
        .forEach((c) => void caches.delete(c));
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update())
      .catch(() => undefined);
  }, []);

  return null;
}
