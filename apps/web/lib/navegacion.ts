'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { esPreviewPublica, esRutaSinSesion } from './rutas';
import { sesion } from './sesion';

/**
 * `true` si esta pantalla se pinta sin la navegacion de la app (barra,
 * carriles, campana).
 *
 * En las previews publicas depende de quien mira: quien llega sin cuenta por
 * un enlace compartido ve la preview limpia; quien ya entro conserva la
 * navegacion. Antes se ocultaba siempre, y abrir una publicacion desde el feed
 * dejaba al usuario sin barra ni forma de volver salvo el boton del navegador.
 *
 * Fuera de las previews no se pregunta nada: el middleware ya garantiza que
 * hay cookie de sesion en cualquier otra ruta privada.
 */
export function useSinNavegacion(): boolean {
  const ruta = usePathname();
  const sinSesion = esRutaSinSesion(ruta);
  const preview = esPreviewPublica(ruta);
  const [conSesion, setConSesion] = useState(false);

  useEffect(() => {
    if (sinSesion) return;
    if (!preview) {
      setConSesion(true);
      return;
    }
    let vivo = true;
    sesion().then(
      () => vivo && setConSesion(true),
      () => vivo && setConSesion(false),
    );
    return () => {
      vivo = false;
    };
  }, [ruta, sinSesion, preview]);

  if (sinSesion) return true;
  return preview ? !conSesion : false;
}
