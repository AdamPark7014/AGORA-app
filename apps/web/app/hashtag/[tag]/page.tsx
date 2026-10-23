'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoFeed } from '@/componentes/esqueleto';
import { TarjetaPost } from '@/componentes/tarjeta-post';
import type { Publicacion } from '@/lib/publicaciones';
import { Hash } from 'lucide-react';

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const [tag, setTag] = useState('');
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void params.then((p) => setTag(decodeURIComponent(p.tag)));
  }, [params]);

  const cargar = useCallback(
    async (desde?: string) => {
      if (!tag) return;
      if (desde) setCargandoMas(true);
      else {
        setCargando(true);
        setError(false);
      }
      try {
        const p = new URLSearchParams();
        if (desde) p.set('cursor', desde);
        const datos = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
          `/hashtags/${encodeURIComponent(tag)}?${p}`,
        );
        setPublicaciones((prev) => (desde ? [...prev, ...datos.publicaciones] : datos.publicaciones));
        setCursor(datos.siguienteCursor);
      } catch {
        // Al paginar se deja lo que ya hay; solo la primera carga pide Reintentar.
        if (!desde) setError(true);
      } finally {
        setCargando(false);
        setCargandoMas(false);
      }
    },
    [tag],
  );

  useEffect(() => {
    if (tag) void cargar();
  }, [tag, cargar]);

  useEffect(() => {
    if (!sentinel.current || !cursor) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && cursor && !cargandoMas) void cargar(cursor);
      },
      { rootMargin: '200px' },
    );
    obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [cursor, cargandoMas, cargar]);

  return (
    <main>
      <EncabezadoPagina
        titulo={`#${tag}`}
        entradilla="Publicaciones recientes con este hashtag en el campus."
      />

      {cargando && <EsqueletoFeed cantidad={2} />}

      {!cargando && error && (
        <EstadoError onReintentar={() => void cargar()}>
          No se pudieron cargar las publicaciones de #{tag}.
        </EstadoError>
      )}

      {!cargando && !error && publicaciones.length === 0 && (
        <EstadoVacio icono={Hash} titulo="Nadie ha usado este hashtag">
          Sé el primero en publicar con #{tag}.
        </EstadoVacio>
      )}

      <ul className="lista">
        {publicaciones.map((p) => (
          <TarjetaPost
            key={p.id}
            post={p}
            actualizar={(cambio) =>
              setPublicaciones((prev) => prev.map((x) => (x.id === p.id ? cambio(x) : x)))
            }
          />
        ))}
      </ul>

      {cursor && <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />}
      {cargandoMas && <p className="tenue" style={{ textAlign: 'center' }}>Cargando más…</p>}
    </main>
  );
}
