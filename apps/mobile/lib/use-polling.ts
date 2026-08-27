import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Sondeo con retroceso adaptativo, gemelo del de la web.
 *
 * En el telefono los dos problemas del sondeo fijo pesan mas que en el
 * navegador: cada peticion despierta la radio, y eso es bateria y datos
 * moviles. Un chat abierto a 5 s fijos son 720 peticiones a la hora, casi
 * todas devolviendo lo mismo.
 *
 * Aqui el ritmo se acelera cuando hay novedad y se frena cuando no, y volver a
 * la app dispara una consulta inmediata para que nunca se vea contenido viejo.
 *
 * Se comprueba `AppState` en cada vuelta y ademas se escucha el cambio: sin lo
 * segundo, la app en segundo plano seguia gastando turnos de reloj.
 *
 * @param callback Devuelve `true` si hubo novedad.
 * @param ms       Espera minima.
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
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let espera = ms;

    const programar = () => {
      if (cancelado) return;
      temporizador = setTimeout(() => void correr(), espera);
    };

    const correr = async () => {
      if (cancelado) return;

      if (AppState.currentState !== 'active') {
        espera = msMaximo;
        programar();
        return;
      }

      // Un fallo no acelera: si la red esta mal, insistir mas empeora. El
      // valor por omision ya es `false`, asi que el `catch` no toca nada.
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
      clearTimeout(temporizador);
      espera = ms;
      void correr();
    };

    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') yaMismo();
    });

    reiniciarRef.current = yaMismo;
    programar();

    return () => {
      cancelado = true;
      clearTimeout(temporizador);
      suscripcion.remove();
      reiniciarRef.current = () => undefined;
    };
  }, [ms, msMaximo, activo]);

  const reiniciar = useCallback(() => reiniciarRef.current(), []);
  return { reiniciar };
}
