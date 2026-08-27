'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { TextoConMenciones } from '@/componentes/texto-con-menciones';
import { TiempoRelativo } from '@/componentes/tiempo';
import { Hash } from 'lucide-react';

interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  autor: { handle: string; nombre: string; fotoUrl: string | null; verificado?: boolean } | null;
  comunidad: { slug: string; nombre: string };
  numComments: number;
  numReactions: number;
}

export default function HashtagPage({ params }: { params: Promise<{ tag: string }> }) {
  const [tag, setTag] = useState('');
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void params.then((p) => setTag(decodeURIComponent(p.tag)));
  }, [params]);

  const cargar = useCallback(
    async (desde?: string) => {
      if (!tag) return;
      if (desde) setCargandoMas(true);
      else setCargando(true);
      try {
        const p = new URLSearchParams();
        if (desde) p.set('cursor', desde);
        const datos = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
          `/hashtags/${encodeURIComponent(tag)}?${p}`,
        );
        setPublicaciones((prev) => (desde ? [...prev, ...datos.publicaciones] : datos.publicaciones));
        setCursor(datos.siguienteCursor);
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

      {cargando && (
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '70%' }} />
        </div>
      )}

      {!cargando && publicaciones.length === 0 && (
        <EstadoVacio icono={Hash} titulo="Nadie ha usado este hashtag">
          Sé el primero en publicar con #{tag}.
        </EstadoVacio>
      )}

      <ul className="lista">
        {publicaciones.map((p) => (
          <li key={p.id} className="tarjeta tarjeta-interactiva">
            <div className="pub-cabeza">
              <Avatar
                nombre={p.autor?.nombre ?? 'Alguien'}
                semilla={p.autor?.handle ?? p.id}
                fotoUrl={p.autor?.fotoUrl}
                verificado={p.autor?.verificado}
              />
              <div className="pub-identidad">
                {p.autor ? (
                  <Link href={`/perfil/${p.autor.handle}`} className="pub-autor">
                    {p.autor.nombre}
                  </Link>
                ) : (
                  <span className="pub-autor">Alguien</span>
                )}
                <div className="pub-meta">
                  <TiempoRelativo fecha={p.createdAt} />
                </div>
              </div>
              <span className="etiqueta naranja pub-comunidad">{p.comunidad.nombre}</span>
            </div>
            {p.texto && (
              <p className="pub-texto">
                <TextoConMenciones texto={p.texto} />
              </p>
            )}
            <div className="pub-pie">
              <Link href={`/publicacion/${p.id}`} className="reaccion" style={{ textDecoration: 'none' }}>
                Ver publicación
              </Link>
              {p.numReactions > 0 && (
                <span className="pub-cuentas">{p.numReactions} reacciones</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {cursor && <div ref={sentinel} style={{ height: 1 }} aria-hidden="true" />}
      {cargandoMas && <p className="tenue" style={{ textAlign: 'center' }}>Cargando más…</p>}
    </main>
  );
}
