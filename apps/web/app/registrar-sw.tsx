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

    // Borrar caches viejos; conservar el activo (agora-v4 en sw.js).
    const CACHE_ACTIVO = 'agora-v4';
    void caches.keys().then((claves) => {
      claves
        .filter((c) => c.startsWith('agora-') && c !== CACHE_ACTIVO)
        .forEach((c) => void caches.delete(c));
    });

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => reg.update())
      .catch(() => undefined);
  }, []);

  return null;
}
