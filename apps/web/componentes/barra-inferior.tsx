'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useSinNavegacion } from '@/lib/navegacion';
import { IconoNav } from './iconos';

/**
 * Navegación de teléfono del diseño D: píldora oscura flotante con Publicar en
 * naranja al centro (docs/diseno-d.md §3). Mensajes vive en el encabezado y
 * "Campus" junta lo demás (mercado, aventones, directorio, sin nombre).
 */
const DESTINOS: Array<{
  href: string;
  icono: 'feed' | 'clips' | 'publicar' | 'eventos' | 'campus';
  texto: string;
  fab?: boolean;
  /** Otras rutas en las que este destino se marca como actual. */
  tambien?: string[];
}> = [
  { href: '/feed', icono: 'feed', texto: 'Inicio' },
  { href: '/clips', icono: 'clips', texto: 'Clips' },
  { href: '/feed#publicar', icono: 'publicar', texto: 'Publicar', fab: true },
  { href: '/eventos', icono: 'eventos', texto: 'Eventos' },
  {
    href: '/mas',
    icono: 'campus',
    texto: 'Campus',
    tambien: ['/marketplace', '/aventones', '/directorio', '/anonimo', '/retos', '/guardados'],
  },
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

  // Sin sesion no hay a donde navegar, y pedir los no leidos solo gana un 401.
  if (sinNavegacion) return null;

  return (
    <nav className="barra-inferior" aria-label="Navegación principal">
      {DESTINOS.map((d) => {
        const activo = d.fab
          ? false
          : ruta === d.href ||
            (d.href !== '/feed' && ruta.startsWith(d.href)) ||
            (d.tambien ?? []).some((r) => ruta.startsWith(r));
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
              <IconoNav nombre={d.icono} size={22} strokeWidth={d.fab ? 2.4 : 1.9} />
            </span>
            {!d.fab && <span className="destino-texto">{d.texto}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
