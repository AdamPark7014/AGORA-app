'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { sesion } from '@/lib/sesion';
import { MOTIVOS_REPORTE, type AutorPublicacion, type Publicacion } from '@/lib/publicaciones';
import { Avatar } from '@/componentes/avatar';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { TarjetaPost } from '@/componentes/tarjeta-post';
import { TextoConMenciones } from '@/componentes/texto-con-menciones';
import { ArrowLeft } from '@/componentes/iconos';
import { TiempoRelativo } from '@/componentes/tiempo';
import { Flag, Ghost, MessageCircle } from 'lucide-react';

interface Comentario {
  id: string;
  texto: string;
  createdAt: string;
  autor: AutorPublicacion | null;
}

interface PaginaComentarios {
  comentarios: Comentario[];
  /** Cursor de la pagina previa; null = ya estan todos. */
  comentariosAnteriores?: string | null;
}

type Detalle = Publicacion & PaginaComentarios;

export default function PaginaDetallePublicacion({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [post, setPost] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reportandoComentario, setReportandoComentario] = useState<string | null>(null);
  const [yo, setYo] = useState<string | null>(null);
  const [cargandoAnteriores, setCargandoAnteriores] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setPost(await api<Detalle>(`/posts/${id}`));
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 404
          ? 'Esa publicación ya no está.'
          : 'No se pudo cargar la publicación.',
      );
    }
  }, [id]);

  useEffect(() => {
    void cargar();
    sesion()
      .then((u) => setYo(u.handle))
      .catch(() => undefined);
  }, [cargar]);

  async function comentar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api(`/posts/${id}/comentarios`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      });
      setTexto('');
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo comentar.');
    } finally {
      setEnviando(false);
    }
  }

  async function verAnteriores() {
    const cursor = post?.comentariosAnteriores;
    if (!cursor || cargandoAnteriores) return;
    setCargandoAnteriores(true);
    try {
      const pagina = await api<PaginaComentarios>(
        `/posts/${id}/comentarios?antesDe=${encodeURIComponent(cursor)}`,
      );
      setPost((p) =>
        p
          ? {
              ...p,
              comentarios: [...pagina.comentarios, ...p.comentarios],
              comentariosAnteriores: pagina.comentariosAnteriores ?? null,
            }
          : p,
      );
    } catch {
      setError('No se pudieron cargar los comentarios anteriores.');
    } finally {
      setCargandoAnteriores(false);
    }
  }

  async function reportarComentario(commentId: string, motivo: string) {
    setReportandoComentario(null);
    try {
      await api('/reportes', { method: 'POST', body: JSON.stringify({ commentId, motivo }) });
      setAviso('Gracias. Un moderador revisará ese comentario.');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo reportar.');
    }
  }

  if (error && !post) {
    return (
      <main>
        <EstadoVacio icono={Ghost} titulo={error}>
          Puede que su autor la haya borrado.
        </EstadoVacio>
      </main>
    );
  }

  if (!post) {
    return (
      <main>
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '40%' }} />
          <div className="esqueleto" style={{ width: '92%' }} />
          <div className="esqueleto" style={{ width: '65%' }} />
        </div>
      </main>
    );
  }

  return (
    <main>
      <p style={{ marginTop: 0 }}>
        <Link href="/feed" className="reaccion" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Volver al feed
        </Link>
      </p>

      {aviso && <p className="nota">{aviso}</p>}

      {/* Al borrar, `router.push` y no `window.location`: esto ultimo recarga
          la pagina entera y tira el estado del cliente, que se nota como un
          parpadeo largo al volver al feed. */}
      <TarjetaPost
        variante="detalle"
        post={post}
        yo={{ handle: yo }}
        actualizar={(cambio) => setPost((p) => (p ? { ...p, ...cambio(p) } : p))}
        onEliminada={() => router.push('/feed')}
        onError={setError}
        onAviso={setAviso}
      />

      <h2 style={{ marginTop: 28 }}>
        {post.numComments} {post.numComments === 1 ? 'comentario' : 'comentarios'}
      </h2>

      <form className="tarjeta" onSubmit={comentar}>
        <label className="campo">
          <span>Tu comentario</span>
          <textarea
            rows={2}
            maxLength={1000}
            required
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>
        <button type="submit" disabled={enviando || !texto.trim()}>
          {enviando ? 'Enviando…' : 'Comentar'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>

      {post.comentarios.length === 0 ? (
        <EstadoVacio icono={MessageCircle} titulo="Nadie ha comentado">
          Rompe el hielo.
        </EstadoVacio>
      ) : (
        <div className="tarjeta" style={{ marginTop: 16 }}>
          {post.comentariosAnteriores && (
            <button
              type="button"
              className="reaccion"
              style={{ marginBottom: 12 }}
              disabled={cargandoAnteriores}
              onClick={verAnteriores}
            >
              {cargandoAnteriores ? 'Cargando…' : 'Ver comentarios anteriores'}
            </button>
          )}
          {post.comentarios.map((c) => (
            <div key={c.id} className="comentario">
              <Avatar
                nombre={c.autor?.nombre ?? 'Alguien'}
                semilla={c.autor?.handle ?? c.id}
                fotoUrl={c.autor?.fotoUrl}
                tamano="chico"
                verificado={c.autor?.verificado}
              />
              <div className="comentario-cuerpo">
                {c.autor ? (
                  <Link href={`/perfil/${c.autor.handle}`} className="pub-autor">
                    {c.autor.nombre}
                  </Link>
                ) : (
                  <span className="pub-autor">Alguien</span>
                )}{' '}
                <span className="pub-meta">
                  <TiempoRelativo fecha={c.createdAt} />
                </span>
                <p className="comentario-texto">
                  <TextoConMenciones texto={c.texto} />
                </p>
                <button
                  type="button"
                  className="reaccion"
                  style={{ marginTop: 4, fontSize: '0.78rem' }}
                  title="Reportar comentario"
                  aria-label="Reportar comentario"
                  onClick={() =>
                    setReportandoComentario(
                      reportandoComentario === c.id ? null : c.id,
                    )
                  }
                >
                  <Flag size={14} strokeWidth={1.75} aria-hidden="true" />
                </button>
                {reportandoComentario === c.id && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    {MOTIVOS_REPORTE.map((m) => (
                      <button
                        key={m.valor}
                        type="button"
                        className="reaccion"
                        onClick={() => reportarComentario(c.id, m.valor)}
                      >
                        {m.etiqueta}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
