'use client';

import { useCallback, useEffect, useRef } from 'react';

/**
 * Sondeo con retroceso adaptativo.
 *
 * Antes esto era un `setInterval` a secas y traia dos problemas reales:
 *
 *  1. **Sondeaba con la pestaña en segundo plano.** Quien dejaba un chat
 *     abierto en otra pestaña seguia pidiendo mensajes cada 5 segundos
 *     indefinidamente. En el telefono eso es bateria; en el servidor, trafico
 *     por una conversacion que nadie esta mirando.
 *  2. **El ritmo era fijo.** Una conversacion activa y una muerta costaban
 *     exactamente lo mismo, y la inmensa mayoria de las respuestas venian
 *     vacias.
 *
 * Ahora el ritmo se adapta: cuando la respuesta trae novedad se mantiene
 * rapido, y cuando no, la espera se duplica hasta el tope. Volver a la
 * pestaña, o llamar a `reiniciar()`, pide al momento y vuelve al ritmo rapido.
 *
 * Con `msMaximo` sin dar, el comportamiento es el de siempre: cadencia fija.
 * Se usa un encadenado de `setTimeout` en vez de `setInterval` para que dos
 * peticiones no se pisen si una tarda mas que el intervalo.
 *
 * @param callback Devuelve `true` si hubo novedad, para no frenar el ritmo.
 * @param ms       Espera minima, la del caso activo.
 * @param activo   Con `false` no sondea.
 * @param msMaximo Techo del retroceso. Por omision, igual que `ms`.
 */
export function usePolling(
  callback: () => boolean | void | Promise<boolean | void>,
  ms: number,
  activo = true,
  msMaximo = ms,
): { reiniciar: () => void } {
  const guardado = useRef(callback);
  guardado.current = callback;

  const reiniciarRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!activo) return;

    let cancelado = false;
    let temporizador: number | undefined;
    let espera = ms;

    const programar = () => {
      if (cancelado) return;
      temporizador = window.setTimeout(() => void correr(), espera);
    };

    const correr = async () => {
      if (cancelado) return;

      // Con la pestaña oculta no se pide nada, y de paso se deja el ritmo en
      // el mas lento para que al volver no haya una rafaga.
      if (document.visibilityState !== 'visible') {
        espera = msMaximo;
        programar();
        return;
      }

      // Un fallo no acelera: si la red esta mal, insistir mas empeora. Por eso
      // el valor por omision es `false` y el `catch` lo deja como estaba.
      let novedad = false;
      try {
        novedad = (await guardado.current()) === true;
      } catch {
        // Sin ruido: el retroceso ya es la respuesta al fallo.
      }

      espera = novedad ? ms : Math.min(espera * 2, msMaximo);
      programar();
    };

    const yaMismo = () => {
      if (cancelado) return;
      window.clearTimeout(temporizador);
      espera = ms;
      void correr();
    };

    const alCambiarVisibilidad = () => {
      if (document.visibilityState === 'visible') yaMismo();
    };

    reiniciarRef.current = yaMismo;
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    programar();

    return () => {
      cancelado = true;
      window.clearTimeout(temporizador);
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
      reiniciarRef.current = () => undefined;
    };
  }, [ms, msMaximo, activo]);

  const reiniciar = useCallback(() => reiniciarRef.current(), []);
  return { reiniciar };
}
