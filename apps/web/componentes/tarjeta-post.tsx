'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Ban, Flag, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { avisar, confirmar } from '@/lib/avisos';
import { atributosImagen } from '@/lib/imagen';
import {
  borrarPublicacion,
  editarPublicacion,
  mensajeError,
  MOTIVOS_REPORTE,
  reaccionarOptimista,
  REACCIONES,
  reportarPublicacion,
  retirarPublicacion,
  votarEncuesta,
  type ActualizarPublicacion,
  type Adjunto,
  type Publicacion,
} from '@/lib/publicaciones';
import { Avatar } from './avatar';
import { Compartir } from './compartir';
import { GuardarPost } from './guardar-post';
import { Lightbox } from './lightbox';
import { TextoConMenciones } from './texto-con-menciones';
import { TiempoRelativo } from './tiempo';

/**
 * La tarjeta de publicacion, una sola para todas las pantallas.
 *
 * Antes habia seis copias y cada una tenia un subconjunto distinto de
 * funciones (el detalle no abria el visor, hashtag no dejaba reaccionar, el
 * feed era el unico con doble toque...). Aqui las funciones se encienden por
 * lo que **llega** en la publicacion y no por la pantalla: si la ruta manda
 * `miReaccion` se puede reaccionar, si manda `miGuardado` se puede guardar.
 * Asi una ruta que no manda un dato nunca pinta un boton que mienta.
 *
 * - `completa`: listas con cabecera (feed, hashtag, guardados).
 * - `detalle`: la pagina de la publicacion; sin enlace a comentarios porque
 *   los comentarios estan debajo.
 * - `compacta`: resumen de una linea de meta (perfil, buscar); esas rutas
 *   mandan un resumen sin reaccion propia.
 */

export type VarianteTarjeta = 'completa' | 'detalle' | 'compacta';

interface Props {
  post: Publicacion;
  /** Sin esto la tarjeta es de solo lectura (no reacciona, no vota, no edita). */
  actualizar?: ActualizarPublicacion;
  variante?: VarianteTarjeta;
  /** Quien mira: decide editar/borrar propio y retirar como moderador. */
  yo?: { handle: string | null; puedeModerar?: boolean } | null;
  /** Clase de la etiqueta de comunidad (el feed la colorea por tipo). */
  claseComunidad?: string;
  /** Fecha a mostrar en vez de la de publicacion (guardados muestra cuando se guardo). */
  fecha?: string;
  /** Texto tras la fecha, p. ej. " · guardado". */
  sufijoMeta?: string;
  /** Retirar como moderador. Solo el feed lo ofrece hoy. */
  permitirRetirar?: boolean;
  /** Tras borrar o retirar: la pantalla la quita o navega. */
  onEliminada?: (postId: string) => void;
  /** Por defecto, aviso global; el detalle los pinta en linea. */
  onError?: (mensaje: string) => void;
  onAviso?: (mensaje: string) => void;
}

type Panel = null | 'menu' | 'reportar' | 'retirar';

const avisoError = (m: string) => avisar(m, 'error');
const avisoInfo = (m: string) => avisar(m);

export function TarjetaPost({
  post,
  actualizar,
  variante = 'completa',
  yo,
  claseComunidad = 'etiqueta naranja',
  fecha,
  sufijoMeta,
  permitirRetirar = false,
  onEliminada,
  onError = avisoError,
  onAviso = avisoInfo,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [editando, setEditando] = useState(false);
  const [textoEditar, setTextoEditar] = useState('');
  const [motivoRetiro, setMotivoRetiro] = useState('');

  const compacta = variante === 'compacta';
  const puedeReaccionar = !compacta && !!actualizar && post.miReaccion !== undefined;
  const esMio = !!yo?.handle && post.autor?.handle === yo.handle;
  const puedeEditar = esMio && !!actualizar && !compacta;
  const puedeRetirar = permitirRetirar && !!yo?.puedeModerar && !compacta;
  const numReactions = post.numReactions ?? 0;
  const numComments = post.numComments ?? 0;
  const media = (post.media ?? []).slice(0, 4);

  async function reaccionar(tipo: string) {
    if (!actualizar) return;
    try {
      await reaccionarOptimista(post, tipo, actualizar);
    } catch {
      onError('No se pudo reaccionar.');
    }
  }

  async function votar(opcionId: string) {
    if (!actualizar) return;
    try {
      const opciones = await votarEncuesta(post.id, opcionId);
      actualizar((p) => (p.encuesta ? { ...p, encuesta: { ...p.encuesta, opciones } } : p));
    } catch (e) {
      onError(mensajeError(e, 'No se pudo votar.'));
    }
  }

  async function guardarEdicion() {
    if (!actualizar) return;
    try {
      const aviso = await editarPublicacion(post.id, textoEditar);
      setEditando(false);
      actualizar((p) => ({ ...p, texto: textoEditar }));
      if (aviso) onAviso(aviso);
    } catch (e) {
      onError(mensajeError(e, 'No se pudo editar.'));
    }
  }

  async function borrar() {
    setPanel(null);
    const si = await confirmar({
      titulo: '¿Borrar esta publicación?',
      detalle: 'No se puede deshacer.',
      accion: 'Borrar',
      peligro: true,
    });
    if (!si) return;
    try {
      await borrarPublicacion(post.id);
      onEliminada?.(post.id);
    } catch (e) {
      onError(mensajeError(e, 'No se pudo borrar.'));
    }
  }

  async function reportar(motivo: string) {
    setPanel(null);
    try {
      onAviso(await reportarPublicacion(post.id, motivo));
    } catch (e) {
      onError(mensajeError(e, 'No se pudo reportar.'));
    }
  }

  async function retirar() {
    const motivo = motivoRetiro.trim();
    if (motivo.length < 3) {
      onError('Escribe el motivo del retiro.');
      return;
    }
    try {
      await retirarPublicacion(post.id, motivo);
      setPanel(null);
      setMotivoRetiro('');
      onEliminada?.(post.id);
      onAviso('Publicación retirada.');
    } catch (e) {
      onError(mensajeError(e, 'No se pudo retirar.'));
    }
  }

  const Envoltura = variante === 'detalle' ? 'article' : 'li';
  const claseEnvoltura =
    variante === 'completa' ? 'tarjeta tarjeta-interactiva' : 'tarjeta';

  if (compacta) {
    return (
      <Envoltura className={claseEnvoltura}>
        <p className="pub-meta" style={{ margin: '0 0 8px' }}>
          {post.autor && (
            <>
              <Link href={`/perfil/${post.autor.handle}`} className="pub-autor">
                {post.autor.nombre}
              </Link>
              {' · '}
            </>
          )}
          <TiempoRelativo fecha={fecha ?? post.createdAt} /> · {post.comunidad.nombre}
        </p>
        {media.length > 0 && <Galeria media={media} />}
        {post.texto && (
          <p className="pub-texto" style={{ marginBottom: 10 }}>
            <TextoConMenciones texto={post.texto} />
          </p>
        )}
        <Link href={`/publicacion/${post.id}`} className="pub-cuentas">
          {post.numReactions !== undefined
            ? `${numReactions} reacciones · ${numComments} comentarios`
            : 'Ver publicación'}
        </Link>
      </Envoltura>
    );
  }

  const totalVotos = post.encuesta?.opciones.reduce((s, o) => s + o.votos, 0) ?? 0;
  const anonimo = post.anonimo === true || (!post.autor && !!post.alias);
  const nombreVisible = post.autor?.nombre ?? post.alias ?? 'Alguien';

  return (
    <Envoltura className={claseEnvoltura}>
      <div className="pub-cabeza">
        {anonimo ? (
          // Sin avatar de persona: en una anonima no hay cara, y una generica
          // sugeriria una identidad que no existe.
          <span className="alias-marca" aria-hidden="true">
            {nombreVisible.charAt(0)}
          </span>
        ) : (
          <Avatar
            nombre={nombreVisible}
            semilla={post.autor?.handle ?? post.id}
            fotoUrl={post.autor?.fotoUrl}
            verificado={post.autor?.verificado}
          />
        )}
        <div className="pub-identidad">
          {post.autor ? (
            <Link href={`/perfil/${post.autor.handle}`} className="pub-autor">
              {post.autor.nombre}
            </Link>
          ) : (
            <span className="pub-autor">{nombreVisible}</span>
          )}
          <div className="pub-meta">
            <TiempoRelativo fecha={fecha ?? post.createdAt} />
            {sufijoMeta}
            {post.estado === 'EN_REVISION' && ' · en revisión'}
          </div>
        </div>
        <span className={`${claseComunidad} pub-comunidad`}>{post.comunidad.nombre}</span>
      </div>

      {editando ? (
        <div style={{ marginTop: 8 }}>
          <textarea
            rows={variante === 'detalle' ? 4 : 3}
            maxLength={2000}
            aria-label="Editar texto de la publicación"
            value={textoEditar}
            onChange={(e) => setTextoEditar(e.target.value)}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={() => void guardarEdicion()}>
              Guardar
            </button>
            <button type="button" className="fantasma" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        post.texto && (
          <p className="pub-texto">
            <TextoConMenciones texto={post.texto} />
          </p>
        )
      )}

      {media.length > 0 && (
        <Galeria media={media} onMeLate={puedeReaccionar ? () => void reaccionar('ME_LATE') : undefined} />
      )}

      {post.encuesta && (
        <div className="encuesta">
          <p className="encuesta-pregunta">{post.encuesta.pregunta}</p>
          {post.encuesta.opciones.map((o) => {
            const porcentaje = totalVotos ? Math.round((o.votos / totalVotos) * 100) : 0;
            return (
              <button
                key={o.id}
                type="button"
                className="opcion"
                disabled={!actualizar}
                onClick={() => void votar(o.id)}
              >
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
        {puedeReaccionar &&
          REACCIONES.map((r) => (
            <button
              key={r.tipo}
              type="button"
              className="reaccion"
              aria-pressed={post.miReaccion === r.tipo}
              onClick={() => void reaccionar(r.tipo)}
            >
              <span className="reaccion-emoji" aria-hidden="true">{r.emoji}</span>
              {r.etiqueta}
            </button>
          ))}

        <Compartir url={`/publicacion/${post.id}`} titulo="Publicación en Ágora" />

        {post.miGuardado !== undefined && <GuardarPost postId={post.id} inicial={post.miGuardado} />}

        <button
          type="button"
          className="reaccion"
          title="Más opciones"
          aria-label="Más opciones de la publicación"
          aria-expanded={panel !== null}
          onClick={() => setPanel(panel === null ? 'menu' : null)}
        >
          <MoreHorizontal size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        {numReactions > 0 && (
          <span className="pub-cuentas" style={{ marginLeft: 4 }}>
            {numReactions} {numReactions === 1 ? 'reacción' : 'reacciones'}
          </span>
        )}

        {variante !== 'detalle' && (
          <Link
            href={`/publicacion/${post.id}`}
            className="pub-cuentas"
            style={{ marginLeft: 'auto' }}
          >
            {numComments === 0
              ? 'Comentar'
              : `${numComments} ${numComments === 1 ? 'comentario' : 'comentarios'}`}
          </Link>
        )}
      </div>

      {/* Menu "mas" como fila desplegable y no como popover flotante: en el
          celular un popover se sale de la pantalla y tapa la tarjeta de abajo;
          una fila dentro de la tarjeta siempre cabe y se lee en orden. */}
      {panel === 'menu' && (
        <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="reaccion"
              aria-label="Reportar publicación"
              onClick={() => setPanel('reportar')}
            >
              <Flag size={16} strokeWidth={1.75} aria-hidden="true" /> Reportar
            </button>
            {puedeEditar && (
              <>
                <button
                  type="button"
                  className="reaccion"
                  aria-label="Editar publicación"
                  onClick={() => {
                    setPanel(null);
                    setEditando(true);
                    setTextoEditar(post.texto);
                  }}
                >
                  <Pencil size={16} strokeWidth={1.75} aria-hidden="true" /> Editar
                </button>
                <button
                  type="button"
                  className="reaccion"
                  aria-label="Borrar publicación"
                  onClick={() => void borrar()}
                >
                  <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /> Borrar
                </button>
              </>
            )}
            {puedeRetirar && (
              <button
                type="button"
                className="reaccion"
                aria-label="Retirar publicación"
                title="Retirar como moderador"
                onClick={() => {
                  setPanel('retirar');
                  setMotivoRetiro('');
                }}
              >
                <Ban size={16} strokeWidth={1.75} aria-hidden="true" /> Retirar
              </button>
            )}
          </div>
        </div>
      )}

      {panel === 'reportar' && (
        <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
          <p className="encuesta-pregunta">¿Por qué lo reportas?</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {MOTIVOS_REPORTE.map((m) => (
              <button
                key={m.valor}
                type="button"
                className="reaccion"
                onClick={() => void reportar(m.valor)}
              >
                {m.etiqueta}
              </button>
            ))}
            <button type="button" className="fantasma" onClick={() => setPanel(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {panel === 'retirar' && (
        <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
          <p className="encuesta-pregunta">Motivo del retiro (lo verá el autor)</p>
          <input
            aria-label="Motivo del retiro"
            value={motivoRetiro}
            onChange={(e) => setMotivoRetiro(e.target.value)}
            placeholder="Ej. datos personales de un tercero"
            maxLength={500}
          />
          <div className="acciones" style={{ marginTop: 10 }}>
            <button type="button" onClick={() => void retirar()}>
              Retirar publicación
            </button>
            <button type="button" className="fantasma" onClick={() => setPanel(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </Envoltura>
  );
}

/**
 * Galeria de adjuntos. Un toque abre el visor; con `onMeLate`, el doble toque
 * da "Me late" con un corazon flotante (lo que la gente ya espera de una red
 * social). El toque simple espera 350 ms para no abrir el visor en medio de
 * un doble toque.
 */
function Galeria({ media, onMeLate }: { media: Adjunto[]; onMeLate?: () => void }) {
  const [visor, setVisor] = useState<string | null>(null);
  const [corazones, setCorazones] = useState<Array<{ id: string; url: string; x: number; y: number }>>(
    [],
  );
  const ultimoToque = useRef<{ url: string; t: number } | null>(null);

  function corazon(url: string, evento: React.MouseEvent<HTMLElement>) {
    const rect = evento.currentTarget.getBoundingClientRect();
    const id = `corazon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const x = evento.clientX - rect.left;
    const y = evento.clientY - rect.top;
    setCorazones((previos) => [...previos, { id, url, x, y }]);
    window.setTimeout(() => {
      setCorazones((previos) => previos.filter((c) => c.id !== id));
    }, 750);
  }

  function meLate(url: string, evento: React.MouseEvent<HTMLElement>) {
    ultimoToque.current = null;
    evento.preventDefault();
    corazon(url, evento);
    onMeLate?.();
  }

  function tocar(url: string, evento: React.MouseEvent<HTMLButtonElement>) {
    if (!onMeLate) {
      setVisor(url);
      return;
    }
    const ahora = Date.now();
    const previo = ultimoToque.current;
    if (previo?.url === url && ahora - previo.t < 350) {
      meLate(url, evento);
      return;
    }
    ultimoToque.current = { url, t: ahora };
    window.setTimeout(() => {
      if (ultimoToque.current?.url === url && ultimoToque.current.t === ahora) {
        ultimoToque.current = null;
        setVisor(url);
      }
    }, 350);
  }

  return (
    <>
      <div className={`galeria n${media.length}`}>
        {media.map((m) =>
          m.esVideo ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video key={m.url} src={m.url} controls preload="metadata" />
          ) : (
            <button
              key={m.url}
              type="button"
              className={onMeLate ? 'galeria-enlace galeria-doble-toque' : 'galeria-enlace'}
              aria-label="Ver imagen"
              onClick={(e) => tocar(m.url, e)}
              onDoubleClick={onMeLate ? (e) => meLate(m.url, e) : undefined}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img {...atributosImagen(m, media.length)} alt="" loading="lazy" />
              {corazones
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
      {visor && <Lightbox url={visor} onCerrar={() => setVisor(null)} />}
    </>
  );
}
