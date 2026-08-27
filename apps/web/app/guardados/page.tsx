'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { TextoConMenciones } from '@/componentes/texto-con-menciones';
import { TiempoRelativo } from '@/componentes/tiempo';
import { Bookmark } from 'lucide-react';

interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  guardadoAt?: string;
  autor: { handle: string; nombre: string; fotoUrl: string | null; verificado?: boolean } | null;
  comunidad: { slug: string; nombre: string };
  numComments: number;
  numReactions: number;
}

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
                  <TiempoRelativo fecha={p.guardadoAt ?? p.createdAt} />
                  {' · guardado'}
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
                <span className="pub-cuentas">
                  {p.numReactions} {p.numReactions === 1 ? 'reacción' : 'reacciones'}
                </span>
              )}
              {p.numComments > 0 && (
                <span className="pub-cuentas">
                  {p.numComments} {p.numComments === 1 ? 'comentario' : 'comentarios'}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
