'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { Compartir } from '@/componentes/compartir';
import { Lightbox } from '@/componentes/lightbox';
import { TextoConMenciones } from '@/componentes/texto-con-menciones';
import { ArrowLeft, MessageCircle } from '@/componentes/iconos';
import { TiempoRelativo } from '@/componentes/tiempo';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { Ghost } from 'lucide-react';

interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  precioMxn: number;
  estadoVenta: string;
  createdAt: string;
  imagenes: Array<{ url: string; esVideo: boolean }>;
  vendedor: { handle: string; nombre: string; fotoUrl: string | null } | null;
  esMio: boolean;
}

const CATEGORIAS: Record<string, string> = {
  LIBROS: 'Libros',
  ELECTRONICA: 'Electrónica',
  ROPA: 'Ropa',
  MUEBLES: 'Muebles',
  SERVICIOS: 'Servicios',
  OTRO: 'Otro',
};

export default function AnuncioDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [anuncio, setAnuncio] = useState<Anuncio | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setAnuncio(await api<Anuncio>(`/anuncios/${id}`));
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado === 404 ? 'Ese anuncio no existe.' : 'No se pudo cargar.');
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function escribir(handle: string) {
    try {
      const { id: chatId } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle }),
      });
      router.push(`/mensajes/${chatId}`);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.');
    }
  }

  async function marcar(estadoVenta: string) {
    await api(`/anuncios/${id}`, { method: 'PATCH', body: JSON.stringify({ estadoVenta }) });
    await cargar();
  }

  if (error && !anuncio) {
    return (
      <main>
        <EstadoVacio icono={Ghost} titulo={error}>Puede que ya se haya vendido.</EstadoVacio>
      </main>
    );
  }

  if (!anuncio) {
    return (
      <main>
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '55%' }} />
          <div className="esqueleto" style={{ width: '90%' }} />
        </div>
      </main>
    );
  }

  return (
    <main>
      <p style={{ marginTop: 0 }}>
        <Link href="/marketplace" className="reaccion" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Volver al marketplace
        </Link>
      </p>

      <article className="tarjeta">
        {anuncio.imagenes.length > 0 && (
          <div className={`galeria n${Math.min(anuncio.imagenes.length, 4)}`} style={{ marginBottom: 16 }}>
            {anuncio.imagenes.map((m) =>
              m.esVideo ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video key={m.url} src={m.url} controls preload="metadata" />
              ) : (
                <button key={m.url} type="button" className="galeria-enlace" onClick={() => setLightbox(m.url)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" loading="lazy" />
                </button>
              ),
            )}
          </div>
        )}

        <div className="pub-cabeza">
          <span className="etiqueta naranja">{CATEGORIAS[anuncio.categoria] ?? anuncio.categoria}</span>
          {anuncio.estadoVenta === 'APARTADO' && <span className="etiqueta oro">Apartado</span>}
          <Compartir url={`/marketplace/${id}`} titulo={anuncio.titulo} />
        </div>

        <h1 style={{ margin: '10px 0 4px' }}>{anuncio.titulo}</h1>
        <p className="tarjeta-producto-precio" style={{ margin: '0 0 12px' }}>
          {anuncio.precioMxn === 0 ? 'Gratis' : `$${anuncio.precioMxn.toLocaleString('es-MX')}`}
        </p>
        <p className="tenue" style={{ margin: '0 0 14px' }}>
          <TiempoRelativo fecha={anuncio.createdAt} />
        </p>

        <p className="pub-texto">
          <TextoConMenciones texto={anuncio.descripcion} />
        </p>

        {anuncio.vendedor && (
          <Link href={`/perfil/${anuncio.vendedor.handle}`} className="persona" style={{ marginTop: 16 }}>
            <Avatar nombre={anuncio.vendedor.nombre} semilla={anuncio.vendedor.handle} fotoUrl={anuncio.vendedor.fotoUrl} />
            <span>
              <span className="persona-nombre">{anuncio.vendedor.nombre}</span>
              <br />
              <span className="tenue">@{anuncio.vendedor.handle}</span>
            </span>
          </Link>
        )}

        <div className="acciones" style={{ marginTop: 18 }}>
          {anuncio.esMio ? (
            <>
              <button type="button" className="reaccion" onClick={() => marcar(anuncio.estadoVenta === 'APARTADO' ? 'DISPONIBLE' : 'APARTADO')}>
                {anuncio.estadoVenta === 'APARTADO' ? 'Liberar' : 'Apartar'}
              </button>
              <button type="button" className="reaccion" onClick={() => marcar('VENDIDO')}>Marcar vendido</button>
            </>
          ) : (
            anuncio.vendedor && (
              <button type="button" onClick={() => escribir(anuncio.vendedor!.handle)}>
                <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" style={{ marginRight: 4, verticalAlign: -2 }} />
                Mensaje al vendedor
              </button>
            )
          )}
        </div>
      </article>

      {lightbox && <Lightbox url={lightbox} onCerrar={() => setLightbox(null)} />}
    </main>
  );
}
