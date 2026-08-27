'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { esRutaPublica } from '@/lib/rutas';
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
] ;

export function BarraInferior() {
  const ruta = usePathname();
  const [noLeidos, setNoLeidos] = useState(0);

  useEffect(() => {
    if (esRutaPublica(ruta)) return;
    api<{ total: number }>('/mensajes/no-leidos')
      .then((d) => setNoLeidos(d.total))
      .catch(() => undefined);
  }, [ruta]);

  // Sin sesion no hay a donde navegar, y pedir los no leidos solo gana un 401.
  if (esRutaPublica(ruta)) return null;

  return (
    <nav className="barra-inferior" aria-label="Navegación principal">
      {DESTINOS.map((d) => {
        const activo =
          d.href === '/feed#publicar'
            ? ruta === '/feed'
            : ruta === d.href || (d.href !== '/feed' && ruta.startsWith(d.href));
        return (
          <Link
            key={d.href}
            href={d.href}
            className={d.fab ? 'destino destino-fab' : 'destino'}
            aria-current={activo ? 'page' : undefined}
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
