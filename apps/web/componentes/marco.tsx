'use client';

import { Suspense } from 'react';

import { CarrilDerecho, CarrilIzquierdo } from './carriles';
import { useSinNavegacion } from '@/lib/navegacion';
import { TransicionPagina } from './transicion-pagina';

/**
 * Envuelve el contenido en la rejilla de tres columnas.
 *
 * Las rutas públicas quedan fuera: ahí todavía no hay sesión, así que los
 * carriles no tendrían nada que mostrar y sus peticiones solo devolverían 401.
 */

export function Marco({ children }: { children: React.ReactNode }) {
  if (useSinNavegacion()) {
    return (
      <div className="pagina-centrada">
        <TransicionPagina>{children}</TransicionPagina>
      </div>
    );
  }

  return (
    <div className="rejilla">
      <Suspense fallback={<aside className="carril carril-izquierdo" aria-hidden="true" />}>
        <CarrilIzquierdo />
      </Suspense>
      <div style={{ minWidth: 0 }}>
        <TransicionPagina>{children}</TransicionPagina>
      </div>
      <CarrilDerecho />
    </div>
  );
}
