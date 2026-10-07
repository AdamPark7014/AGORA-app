'use client';

import { Suspense } from 'react';

import { CarrilDerecho, CarrilIzquierdo } from './carriles';
import { useSinNavegacion } from '@/lib/navegacion';
import { useConsultaMedia } from '@/lib/pantalla';
import { TransicionPagina } from './transicion-pagina';

/**
 * Envuelve el contenido en la rejilla de tres columnas.
 *
 * Las rutas públicas quedan fuera: ahí todavía no hay sesión, así que los
 * carriles no tendrían nada que mostrar y sus peticiones solo devolverían 401.
 */

export function Marco({ children }: { children: React.ReactNode }) {
  const sinNavegacion = useSinNavegacion();
  // Los carriles se montan solo donde caben (mismos cortes que globals.css):
  // ocultos con CSS seguían pidiendo datos en cada celular.
  const conIzquierdo = useConsultaMedia('(min-width: 861px)');
  const conDerecho = useConsultaMedia('(min-width: 1081px)');

  if (sinNavegacion) {
    return (
      <div className="pagina-centrada">
        <TransicionPagina>{children}</TransicionPagina>
      </div>
    );
  }

  return (
    <div className="rejilla">
      {conIzquierdo ? (
        <Suspense fallback={<aside className="carril carril-izquierdo" aria-hidden="true" />}>
          <CarrilIzquierdo />
        </Suspense>
      ) : (
        <aside className="carril carril-izquierdo" aria-hidden="true" />
      )}
      <div style={{ minWidth: 0 }}>
        <TransicionPagina>{children}</TransicionPagina>
      </div>
      {conDerecho ? (
        <CarrilDerecho />
      ) : (
        <aside className="carril carril-derecho" aria-hidden="true" />
      )}
    </div>
  );
}
