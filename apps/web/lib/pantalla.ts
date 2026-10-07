'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * `matchMedia` como estado de React. Devuelve `null` en el servidor y durante
 * la hidratación: ahí no se sabe el ancho, y adivinar monta componentes que
 * piden datos para luego quitarlos.
 */
export function useConsultaMedia(consulta: string): boolean | null {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const mql = window.matchMedia(consulta);
      mql.addEventListener('change', avisar);
      return () => mql.removeEventListener('change', avisar);
    },
    [consulta],
  );
  return useSyncExternalStore(
    suscribir,
    () => window.matchMedia(consulta).matches,
    () => null,
  );
}
