'use client';

import { usePathname } from 'next/navigation';
import { Suspense } from 'react';

import { AvisoContrasena } from './aviso-contrasena';
import { AvisoUdlap } from './aviso-udlap';
import { BloqueoUdlap } from './bloqueo-udlap';
import { CarrilDerecho, CarrilIzquierdo } from './carriles';
import { useSinNavegacion } from '@/lib/navegacion';
import { useConsultaMedia } from '@/lib/pantalla';
import { TransicionPagina } from './transicion-pagina';

/**
 * Pantallas sin navegación que sí necesitan sesión (crear el perfil y la
 * bienvenida): ahí también aplica el bloqueo por no confirmar la UDLAP.
 */
const SIN_NAVEGACION_CON_SESION = new Set(['/registro', '/bienvenida']);

/**
 * Envuelve el contenido en la rejilla de tres columnas.
 *
 * Las rutas públicas quedan fuera: ahí todavía no hay sesión, así que los
 * carriles no tendrían nada que mostrar y sus peticiones solo devolverían 401.
 *
 * Con sesión, todo pasa por `BloqueoUdlap`: si venció el plazo para confirmar
 * el correo UDLAP, la API contesta 403 y en lugar del contenido va el bloqueo.
 */

export function Marco({ children }: { children: React.ReactNode }) {
  const sinNavegacion = useSinNavegacion();
  const ruta = usePathname();
  // Los carriles se montan solo donde caben (mismos cortes que globals.css):
  // ocultos con CSS seguían pidiendo datos en cada celular.
  const conIzquierdo = useConsultaMedia('(min-width: 861px)');
  const conDerecho = useConsultaMedia('(min-width: 1081px)');

  if (sinNavegacion) {
    const pagina = (
      <div className="pagina-centrada">
        <TransicionPagina>{children}</TransicionPagina>
      </div>
    );
    return SIN_NAVEGACION_CON_SESION.has(ruta) ? <BloqueoUdlap>{pagina}</BloqueoUdlap> : pagina;
  }

  return (
    <BloqueoUdlap>
      <div className="rejilla">
        {conIzquierdo ? (
          <Suspense fallback={<aside className="carril carril-izquierdo" aria-hidden="true" />}>
            <CarrilIzquierdo />
          </Suspense>
        ) : (
          <aside className="carril carril-izquierdo" aria-hidden="true" />
        )}
        <div style={{ minWidth: 0 }}>
          <AvisoUdlap />
          <AvisoContrasena />
          <TransicionPagina>{children}</TransicionPagina>
        </div>
        {conDerecho ? (
          <CarrilDerecho />
        ) : (
          <aside className="carril carril-derecho" aria-hidden="true" />
        )}
      </div>
    </BloqueoUdlap>
  );
}
