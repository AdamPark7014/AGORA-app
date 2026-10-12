'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { TarjetaPost } from '@/componentes/tarjeta-post';
import type { Publicacion } from '@/lib/publicaciones';
import { Bookmark } from 'lucide-react';

export default function Guardados() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await api<{ publicaciones: Publicacion[] }>('/guardados');
      setPublicaciones(datos.publicaciones);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <main>
      <EncabezadoPagina
        titulo="Guardados"
        entradilla="Publicaciones que marcaste para ver después."
      />

      {cargando && (
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '70%' }} />
          <div className="esqueleto" style={{ width: '90%' }} />
        </div>
      )}

      {!cargando && publicaciones.length === 0 && (
        <EstadoVacio icono={Bookmark} titulo="Nada guardado todavía">
          Toca el icono de guardar en cualquier publicación del feed.
        </EstadoVacio>
      )}

      <ul className="lista">
        {publicaciones.map((p) => (
          <TarjetaPost
            key={p.id}
            post={p}
            fecha={p.guardadoAt}
            sufijoMeta=" · guardado"
            actualizar={(cambio) =>
              setPublicaciones((prev) => prev.map((x) => (x.id === p.id ? cambio(x) : x)))
            }
          />
        ))}
      </ul>
    </main>
  );
}
