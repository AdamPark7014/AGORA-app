'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import { api } from '@/lib/api';
import { esRutaPublica } from '@/lib/rutas';
import { olvidarSesion, sesion } from '@/lib/sesion';
import { Avatar } from './avatar';
import { Campana } from './campana';
import { ToggleTema } from './proveedor-tema';
import { Isotipo } from './isotipo';

interface Yo {
  handle: string | null;
  nombre: string | null;
  fotoUrl: string | null;
  tienePerfil: boolean;
  esStaff: boolean;
  puedeModerar: boolean;
}

/**
 * Encabezado con estado de sesion.
 *
 * Antes no habia forma de cerrar sesion ni de llegar a tu propio perfil: la
 * app te dejaba dentro sin salida. Los enlaces solo aparecen cuando hay
 * sesion, para que la pantalla de entrada no ofrezca cosas que no funcionan.
 */
export function Encabezado() {
  const router = useRouter();
  const ruta = usePathname();
  const [yo, setYo] = useState<Yo | null>(null);
  const publica = esRutaPublica(ruta);

  useEffect(() => {
    // En rutas publicas no hay sesion que consultar; preguntarlo solo suma un
    // 401 por pantalla. La portada se encarga de su propia comprobacion,
    // porque ahi si importa redirigir a quien ya entro.
    if (publica) {
      setYo(null);
      return;
    }
    sesion()
      .then(setYo)
      .catch(() => setYo(null));
  }, [ruta, publica]);

  async function salir() {
    try {
      await api('/auth/salir', { method: 'POST' });
    } finally {
      // Sin esto la copia guardada sobrevive al cierre de sesion y la
      // siguiente pantalla sigue creyendo que hay usuario.
      olvidarSesion();
      setYo(null);
      router.push('/');
    }
  }

  return (
    <header className="encabezado">
      <Link href={yo ? '/feed' : '/'} className="marca">
        <Isotipo />
        Ágora
      </Link>

      {publica && !yo && (
        <>
          <span className="empuje" />
          <ToggleTema />
        </>
      )}

      {yo && (
        <>
          {/* La navegacion vive en el carril izquierdo; aqui solo queda la
              identidad, para no repetir los mismos enlaces dos veces. */}
          <span className="empuje" />
          <Link href="/buscar" className="enlace-nav" aria-label="Buscar">
            <Search size={20} strokeWidth={1.75} aria-hidden="true" />
          </Link>
          <ToggleTema />
          <Campana />
          {yo.handle && (
            <Link
              href={`/perfil/${yo.handle}`}
              className="enlace-nav"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Avatar
                nombre={yo.nombre ?? yo.handle}
                semilla={yo.handle}
                fotoUrl={yo.fotoUrl}
                tamano="chico"
                verificado={yo.esStaff}
              />
              <span>@{yo.handle}</span>
            </Link>
          )}
          <button type="button" className="fantasma" onClick={salir}>
            Salir
          </button>
        </>
      )}
    </header>
  );
}
