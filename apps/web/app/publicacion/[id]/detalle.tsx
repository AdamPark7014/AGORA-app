'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useRef, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { confirmar } from '@/lib/avisos';
import { sesion } from '@/lib/sesion';
import { Avatar } from '@/componentes/avatar';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { Compartir } from '@/componentes/compartir';
import { GuardarPost } from '@/componentes/guardar-post';
import { TextoConMenciones } from '@/componentes/texto-con-menciones';
import { ArrowLeft } from '@/componentes/iconos';
import { TiempoRelativo } from '@/componentes/tiempo';
import { Flag, Ghost, MessageCircle } from 'lucide-react';

interface Autor {
  handle: string;
  nombre: string;
  fotoUrl: string | null;
  verificado?: boolean;
}

interface Adjunto {
  url: string;
  mime: string;
  esVideo: boolean;
}

interface OpcionEncuesta {
  id: string;
  texto: string;
  votos: number;
}

interface Comentario {
  id: string;
  texto: string;
  createdAt: string;
  autor: Autor | null;
}

interface Detalle {
  id: string;
  texto: string;
  estado: string;
  createdAt: string;
  autor: Autor | null;
  comunidad: { slug: string; nombre: string };
  media: Adjunto[];
  encuesta: { pregunta: string; opciones: OpcionEncuesta[] } | null;
  numComments: number;
  numReactions: number;
  miReaccion: string | null;
  miGuardado?: boolean;
  comentarios: Comentario[];
}

const REACCIONES = [
  { tipo: 'ME_LATE', etiqueta: 'Me late', emoji: '🔥' },
  { tipo: 'ME_RIO', etiqueta: 'Me río', emoji: '😂' },
  { tipo: 'APOYO', etiqueta: 'Apoyo', emoji: '🤝' },
  { tipo: 'NO_MAMES', etiqueta: 'No mames', emoji: '😱' },
] as const;

const MOTIVOS_REPORTE = [
  { valor: 'INTIMIDAD_SEXUAL', etiqueta: 'Contenido íntimo sin permiso' },
  { valor: 'DATOS_PERSONALES', etiqueta: 'Datos personales' },
  { valor: 'AMENAZA_VIOLENCIA', etiqueta: 'Amenaza de violencia' },
  { valor: 'ACOSO_DIRIGIDO', etiqueta: 'Acoso dirigido' },
  { valor: 'SUPLANTACION', etiqueta: 'Suplantación' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

export default function Publicacion({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [post, setPost] = useState<Detalle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [reportando, setReportando] = useState(false);
  const [reportandoComentario, setReportandoComentario] = useState<string | null>(null);
  const [yo, setYo] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [textoEditar, setTextoEditar] = useState('');
  /** Corazones flotantes al doble toque en imágenes. */
  const [corazonesFlotantes, setCorazonesFlotantes] = useState<
    Array<{ id: string; url: string; x: number; y: number }>
  >([]);
  const ultimoToqueImagen = useRef<{ url: string; t: number } | null>(null);

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

  async function reaccionar(tipo: string) {
    if (!post) return;
    const quita = post.miReaccion === tipo;
    const nueva = quita ? null : tipo;
    const delta = quita ? -1 : post.miReaccion ? 0 : 1;

    setPost({ ...post, miReaccion: nueva, numReactions: post.numReactions + delta });

    try {
      const { miReaccion } = await api<{ miReaccion: string | null }>(
        `/posts/${id}/reacciones`,
        { method: 'POST', body: JSON.stringify({ tipo }) },
      );
      if (miReaccion !== nueva) {
        setPost((p) => (p ? { ...p, miReaccion } : p));
      }
    } catch {
      await cargar();
      setError('No se pudo reaccionar.');
    }
  }

  function animarCorazonFlotante(url: string, evento: React.MouseEvent<HTMLElement>) {
    const rect = evento.currentTarget.getBoundingClientRect();
    const corazonId = `corazon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const x = evento.clientX - rect.left;
    const y = evento.clientY - rect.top;
    setCorazonesFlotantes((previos) => [...previos, { id: corazonId, url, x, y }]);
    window.setTimeout(() => {
      setCorazonesFlotantes((previos) => previos.filter((c) => c.id !== corazonId));
    }, 750);
  }

  function tocarImagen(url: string, evento: React.MouseEvent<HTMLButtonElement>) {
    const ahora = Date.now();
    const previo = ultimoToqueImagen.current;

    if (previo?.url === url && ahora - previo.t < 350) {
      ultimoToqueImagen.current = null;
      evento.preventDefault();
      animarCorazonFlotante(url, evento);
      void reaccionar('ME_LATE');
      return;
    }

    ultimoToqueImagen.current = { url, t: ahora };
    window.setTimeout(() => {
      if (ultimoToqueImagen.current?.url === url && ultimoToqueImagen.current.t === ahora) {
        ultimoToqueImagen.current = null;
      }
    }, 350);
  }

  async function votar(opcionId: string) {
    if (!post?.encuesta) return;
    try {
      const { opciones: nuevas } = await api<{ opciones: OpcionEncuesta[] }>(
        `/posts/${id}/votos`,
        { method: 'POST', body: JSON.stringify({ opcionId }) },
      );
      setPost({ ...post, encuesta: { ...post.encuesta, opciones: nuevas } });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo votar.');
    }
  }

  async function reportar(motivo: string) {
    setReportando(false);
    setError(null);
    try {
      const r = await api<{ yaExistia: boolean }>('/reportes', {
        method: 'POST',
        body: JSON.stringify({ postId: id, motivo }),
      });
      setAviso(
        r.yaExistia
          ? 'Ya habías reportado esto. Un moderador lo va a ver.'
          : 'Gracias. Un moderador lo va a revisar.',
      );
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo reportar.');
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

  async function guardarEdicion() {
    try {
      const r = await api<{ aviso: string | null }>(`/posts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ texto: textoEditar }),
      });
      setEditando(false);
      if (r.aviso) setAviso(r.aviso);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo editar.');
    }
  }

  async function borrarPost() {
    if (!(await confirmar({ titulo: '¿Borrar esta publicación?', detalle: 'No se puede deshacer.', accion: 'Borrar', peligro: true }))) return;
    try {
      await api(`/posts/${id}`, { method: 'DELETE' });
      // `router.push` y no `window.location`: esto ultimo recarga la pagina
      // entera y tira el estado del cliente, que se nota como un parpadeo
      // largo al volver al feed.
      router.push('/feed');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo borrar.');
    }
  }

  const esMio = yo && post?.autor?.handle === yo;

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

  const totalVotos = post.encuesta?.opciones.reduce((s, o) => s + o.votos, 0) ?? 0;

  return (
    <main>
      <p style={{ marginTop: 0 }}>
        <Link href="/feed" className="reaccion" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Volver al feed
        </Link>
      </p>

      {aviso && <p className="nota">{aviso}</p>}

      <article className="tarjeta">
        <div className="pub-cabeza">
          <Avatar
            nombre={post.autor?.nombre ?? 'Alguien'}
            semilla={post.autor?.handle ?? post.id}
            fotoUrl={post.autor?.fotoUrl}
            verificado={post.autor?.verificado}
          />
          <div className="pub-identidad">
            {post.autor ? (
              <Link href={`/perfil/${post.autor.handle}`} className="pub-autor">
                {post.autor.nombre}
              </Link>
            ) : (
              <span className="pub-autor">Alguien</span>
            )}
            <div className="pub-meta">
              <TiempoRelativo fecha={post.createdAt} />
              {post.estado === 'EN_REVISION' && ' · en revisión'}
            </div>
          </div>
          <span className="etiqueta naranja pub-comunidad">{post.comunidad.nombre}</span>
        </div>

        {post.texto && !editando && (
          <p className="pub-texto">
            <TextoConMenciones texto={post.texto} />
          </p>
        )}

        {editando && (
          <div style={{ marginTop: 8 }}>
            <textarea
              rows={4}
              maxLength={2000}
              value={textoEditar}
              onChange={(e) => setTextoEditar(e.target.value)}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button type="button" onClick={guardarEdicion}>
                Guardar
              </button>
              <button type="button" className="fantasma" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {post.media.length > 0 && (
          <div className={`galeria n${Math.min(post.media.length, 4)}`}>
            {post.media.map((m) =>
              m.esVideo ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video key={m.url} src={m.url} controls preload="metadata" />
              ) : (
                <button
                  key={m.url}
                  type="button"
                  className="galeria-enlace galeria-doble-toque"
                  onClick={(e) => tocarImagen(m.url, e)}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    ultimoToqueImagen.current = null;
                    animarCorazonFlotante(m.url, e);
                    void reaccionar('ME_LATE');
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.url} alt="" loading="lazy" />
                  {corazonesFlotantes
                    .filter((c) => c.url === m.url)
                    .map((c) => (
                      <span
                        key={c.id}
                        className="reaccion-flotante"
                        style={{ left: c.x, top: c.y }}
                        aria-hidden="true"
                      >
                        🧡
                      </span>
                    ))}
                </button>
              ),
            )}
          </div>
        )}

        {post.encuesta && (
          <div className="encuesta">
            <p className="encuesta-pregunta">{post.encuesta.pregunta}</p>
            {post.encuesta.opciones.map((o) => {
              const porcentaje = totalVotos ? Math.round((o.votos / totalVotos) * 100) : 0;
              return (
                <button key={o.id} type="button" className="opcion" onClick={() => votar(o.id)}>
                  <span className="opcion-barra" style={{ width: `${porcentaje}%` }} />
                  <span className="opcion-contenido">
                    <span>{o.texto}</span>
                    <span className="tenue">
                      {o.votos} · {porcentaje}%
                    </span>
                  </span>
                </button>
              );
            })}
            <p className="tenue" style={{ margin: '4px 0 0' }}>
              {totalVotos} {totalVotos === 1 ? 'voto' : 'votos'}
            </p>
          </div>
        )}

        <div className="pub-pie">
          {REACCIONES.map((r) => (
            <button
              key={r.tipo}
              type="button"
              className="reaccion"
              aria-pressed={post.miReaccion === r.tipo}
              onClick={() => reaccionar(r.tipo)}
            >
              <span className="reaccion-emoji" aria-hidden="true">{r.emoji}</span>
              {r.etiqueta}
            </button>
          ))}
          <button
            type="button"
            className="reaccion"
            title="Reportar"
            aria-label="Reportar publicación"
            aria-expanded={reportando}
            onClick={() => setReportando(!reportando)}
          >
            <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <Compartir url={`/publicacion/${post.id}`} titulo="Publicación en Ágora" />
          <GuardarPost postId={post.id} inicial={post.miGuardado} />
          {esMio && (
            <>
              <button
                type="button"
                className="reaccion"
                title="Editar"
                aria-label="Editar publicación"
                onClick={() => {
                  setEditando(true);
                  setTextoEditar(post.texto);
                }}
              >
                ✏️
              </button>
              <button
                type="button"
                className="reaccion"
                title="Borrar"
                aria-label="Borrar publicación"
                onClick={borrarPost}
              >
                🗑
              </button>
            </>
          )}
          {post.numReactions > 0 && (
            <span className="pub-cuentas">
              {post.numReactions} {post.numReactions === 1 ? 'reacción' : 'reacciones'}
            </span>
          )}
        </div>

        {reportando && (
          <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
            <p className="encuesta-pregunta">¿Por qué lo reportas?</p>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {MOTIVOS_REPORTE.map((m) => (
                <button key={m.valor} type="button" className="reaccion" onClick={() => reportar(m.valor)}>
                  {m.etiqueta}
                </button>
              ))}
              <button type="button" className="fantasma" onClick={() => setReportando(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </article>

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
