'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { useSinNavegacion } from '@/lib/navegacion';
import { IconoNav } from './iconos';

/**
 * Navegación de teléfono con FAB central para publicar.
 */
const DESTINOS: Array<{
  href: string;
  icono: 'feed' | 'eventos' | 'publicar' | 'mensajes' | 'mas';
  texto: string;
  fab?: boolean;
}> = [
  { href: '/feed', icono: 'feed' as const, texto: 'Feed' },
  { href: '/eventos', icono: 'eventos' as const, texto: 'Eventos' },
  { href: '/feed#publicar', icono: 'publicar' as const, texto: 'Publicar', fab: true },
  { href: '/mensajes', icono: 'mensajes' as const, texto: 'Mensajes' },
  { href: '/mas', icono: 'mas' as const, texto: 'Más' },
];

function dispararPublicar() {
  if (typeof window === 'undefined') return;
  if (window.location.hash !== '#publicar') {
    window.location.hash = 'publicar';
  } else {
    window.dispatchEvent(new Event('agora:publicar'));
  }
}

export function BarraInferior() {
  const ruta = usePathname();
  const sinNavegacion = useSinNavegacion();
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    if (sinNavegacion) return;
    api<{ total: number }>('/mensajes/no-leidos')
      .then((d) => setNoLeidos(d.total))
      .catch(() => undefined);
  }, [ruta, sinNavegacion]);

  // Sin sesion no hay a donde navegar, y pedir los no leidos solo gana un 401.
  if (sinNavegacion) return null;

  return (
    <nav className="barra-inferior" aria-label="Navegación principal">
      {DESTINOS.map((d) => {
        const activo = d.fab
          ? false
          : ruta === d.href || (d.href !== '/feed' && ruta.startsWith(d.href));
        return (
          <Link
            key={d.href}
            href={d.href}
            className={d.fab ? 'destino destino-fab' : 'destino'}
            aria-current={activo ? 'page' : undefined}
            aria-label={d.fab ? 'Publicar' : undefined}
            onClick={(e) => {
              if (!d.fab) return;
              if (ruta === '/feed') {
                e.preventDefault();
                dispararPublicar();
              }
            }}
          >
            <span className="destino-icono" aria-hidden="true">
              <IconoNav nombre={d.icono} size={d.fab ? 24 : 22} />
              {d.href === '/mensajes' && noLeidos > 0 && (
                <span className="destino-globo">{noLeidos > 9 ? '9+' : noLeidos}</span>
              )}
            </span>
            {!d.fab && <span className="destino-texto">{d.texto}</span>}
            {activo && !d.fab && <span className="destino-indicador" aria-hidden="true" />}
          </Link>
        );
      })}
    </nav>
  );
}
