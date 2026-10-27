'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Fragment, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import { SLUG_COMUNIDAD_CAMPUS_UDLAP } from '@/lib/campus';

import { api, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { sesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { useConsultaMedia } from '@/lib/pantalla';
import type { Publicacion } from '@/lib/publicaciones';
import { Avatar } from '@/componentes/avatar';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoFeed } from '@/componentes/esqueleto';
import { TarjetaPost } from '@/componentes/tarjeta-post';
import { TiraTuDia } from '@/componentes/tu-dia-feed';
import { PreguntaDelDia } from '@/componentes/pregunta-del-dia';
import {
  AhoraEnCampus,
  EncabezadoInicio,
  FilaClips,
  MiniEvento,
  SegmentoFeed,
  type Segmento,
} from '@/componentes/inicio-d';
import { pingGamificacionSiNecesario, notificarInsigniasNuevas } from '@/lib/gamificacion';
import type { BadgeCodigo } from '@agora/contracts';
import { BarChart3, Image } from '@/componentes/iconos';
import { Flame } from 'lucide-react';

const PLACEHOLDERS = copy.feed.placeholders;

interface Comunidad {
  slug: string;
  nombre: string;
  tipo: string;
  silenciada?: boolean;
}

export default function Feed() {
  // useSearchParams exige Suspense en el App Router.
  return (
    <Suspense fallback={<EsqueletoFeed />}>
      <FeedInterno />
    </Suspense>
  );
}

function FeedInterno() {
  const router = useRouter();
  const parametros = useSearchParams();
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [comunidadSlug, setComunidadSlug] = useState(parametros.get('comunidad') ?? '');
  const [soloSiguiendo, setSoloSiguiendo] = useState(false);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);

  const [texto, setTexto] = useState('');
  const [destino, setDestino] = useState('');
  const [conEncuesta, setConEncuesta] = useState(false);
  const [pregunta, setPregunta] = useState('');
  const [opciones, setOpciones] = useState(['', '']);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Perfil propio para el avatar del redactor. */
  const [yo, setYo] = useState<{
    handle: string | null;
    nombre: string | null;
    fotoUrl: string | null;
    esStaff: boolean;
    puedeModerar: boolean;
  } | null>(null);
  /** Archivos ya subidos, esperando a que se publique. */
  const [adjuntos, setAdjuntos] = useState<Array<{ id: string; url: string; esVideo: boolean }>>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const compositorId = useId();
  const sentinelFeed = useRef<HTMLDivElement>(null);
  // Sin carril derecho (celular, tablet) la gamificacion va en una tira;
  // con carril, el carril la monta. Mismo corte que `Marco`.
  const conCarrilDerecho = useConsultaMedia('(min-width: 1081px)');

  const cargarFeed = useCallback(async (slug: string, siguiendo: boolean) => {
    setCargando(true);
    setError(null);
    setErrorCarga(null);
    try {
      const p = new URLSearchParams();
      if (siguiendo) p.set('siguiendo', 'true');
      else if (slug) p.set('comunidadSlug', slug);
      const datos = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
        `/feed?${p}`,
      );
      setPublicaciones(datos.publicaciones);
      setCursor(datos.siguienteCursor);
    } catch (e) {
      setErrorCarga(
        e instanceof ErrorApi && e.estado === 401
          ? copy.feed.errores.sesion
          : copy.feed.errores.cargar,
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    sesion()
      .then((u) =>
        setYo({
          handle: u.handle,
          nombre: u.nombre,
          fotoUrl: u.fotoUrl,
          esStaff: u.esStaff,
          puedeModerar: u.puedeModerar,
        }),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then((c) => {
        setComunidades(c);
        const activas = c.filter((x) => !x.silenciada);
        setDestino(
          activas.find((x) => x.slug === SLUG_COMUNIDAD_CAMPUS_UDLAP)?.slug ??
            activas.find((x) => x.tipo === 'CARRERA')?.slug ??
            activas[0]?.slug ??
            '',
        );
      })
      .catch(() => undefined);
  }, []);

  // El carril izquierdo cambia la URL sin remontar la pagina, asi que hay que
  // reaccionar al parametro y no solo leerlo al inicio.
  useEffect(() => {
    setComunidadSlug(parametros.get('comunidad') ?? '');
  }, [parametros]);

  useEffect(() => {
    const t = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 4000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    function irAPublicar() {
      if (typeof window === 'undefined' || window.location.hash !== '#publicar') return;
      if (cargando) return;
      document.getElementById(compositorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.querySelector<HTMLTextAreaElement>(`#${CSS.escape(compositorId)} textarea`)?.focus();
    }
    irAPublicar();
    window.addEventListener('hashchange', irAPublicar);
    window.addEventListener('agora:publicar', irAPublicar);
    return () => {
      window.removeEventListener('hashchange', irAPublicar);
      window.removeEventListener('agora:publicar', irAPublicar);
    };
  }, [compositorId, cargando]);

  useEffect(() => {
    void cargarFeed(comunidadSlug, soloSiguiendo);
  }, [comunidadSlug, soloSiguiendo, cargarFeed]);

  useEffect(() => {
    pingGamificacionSiNecesario();
  }, []);

  /**
   * Sube al elegir, no al publicar. Asi la miniatura aparece mientras el
   * usuario sigue escribiendo y sabe que el archivo si quedo.
   */
  async function adjuntar(archivo: File) {
    if (adjuntos.length >= 4) {
      setError('Maximo 4 archivos por publicacion.');
      return;
    }
    // Mismos topes que la API (src/media/almacen.ts): avisar antes de subir 200 MB para nada.
    const esVideo = archivo.type.startsWith('video/');
    if (archivo.size > (esVideo ? 60 : 8) * 1024 * 1024) {
      setError(esVideo ? 'El video pasa de 60 MB. Recórtalo o grábalo más corto.' : 'La imagen pasa de 8 MB.');
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append('archivo', archivo);
      const respuesta = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: cuerpo,
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) {
        throw new ErrorApi(respuesta.status, datos?.message ?? 'No se pudo subir.');
      }
      setAdjuntos((previos) => [...previos, datos]);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo subir el archivo.');
    } finally {
      setSubiendo(false);
    }
  }

  /**
   * Cargar más, no scroll infinito.
   *
   * NN/g y Baymard coinciden: el scroll infinito encaja en feeds sociales pero
   * rompe el regreso — quien vuelve atrás pierde su sitio. Un botón conserva la
   * orientación y cuesta un toque. Antes el feed simplemente se acababa a las
   * 20 publicaciones sin decir nada, que es peor que cualquiera de las dos.
   */
  const cargarMas = useCallback(async () => {
    if (!cursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const p = new URLSearchParams();
      if (soloSiguiendo) p.set('siguiendo', 'true');
      else if (comunidadSlug) p.set('comunidadSlug', comunidadSlug);
      p.set('cursor', cursor);
      const datos = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
        `/feed?${p}`,
      );
      setPublicaciones((previas) => [...previas, ...datos.publicaciones]);
      setCursor(datos.siguienteCursor);
    } catch {
      setError('No se pudieron cargar más.');
    } finally {
      setCargandoMas(false);
    }
    // En `useCallback` y no como funcion suelta: el observador de abajo la
    // captura, y asi el linter comprueba que las dependencias cuadran en vez
    // de que las mantengamos a mano. Con una funcion suelta, añadir aqui una
    // lectura de estado y olvidar la lista del efecto da un cierre viejo que
    // no falla en ningun sitio visible.
  }, [cursor, cargandoMas, comunidadSlug, soloSiguiendo]);

  useEffect(() => {
    if (!sentinelFeed.current || !cursor) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void cargarMas();
      },
      { rootMargin: '300px' },
    );
    obs.observe(sentinelFeed.current);
    return () => obs.disconnect();
  }, [cursor, cargarMas]);

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      const limpias = opciones.map((o) => o.trim()).filter(Boolean);
      const respuesta = await api<{ aviso: string | null; nuevasInsignias?: BadgeCodigo[] }>('/posts', {
        method: 'POST',
        body: JSON.stringify({
          comunidadSlug: destino,
          texto,
          mediaIds: adjuntos.map((a) => a.id),
          ...(conEncuesta && pregunta.trim() && limpias.length >= 2
            ? { encuesta: { pregunta: pregunta.trim(), opciones: limpias } }
            : {}),
        }),
      });
      notificarInsigniasNuevas(respuesta.nuevasInsignias);
      setTexto('');
      setAdjuntos([]);
      setPregunta('');
      setOpciones(['', '']);
      setConEncuesta(false);
      if (respuesta.aviso) setAviso(respuesta.aviso);
      analytics.publicar({ comunidadSlug: destino });
      await cargarFeed(comunidadSlug, soloSiguiendo);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  const miCarrera = comunidades.find((c) => c.tipo === 'CARRERA' && !c.silenciada);
  // El segmento cubre Campus, Mi carrera y Siguiendo; las demas comunidades
  // (generacion, colegio...) quedan como chips debajo.
  const comunidadesFiltro = comunidades.filter(
    (c) => !c.silenciada && c.slug !== SLUG_COMUNIDAD_CAMPUS_UDLAP && c.slug !== miCarrera?.slug,
  );
  const segmento: Segmento | null = soloSiguiendo
    ? 'siguiendo'
    : !comunidadSlug
      ? 'campus'
      : comunidadSlug === miCarrera?.slug
        ? 'carrera'
        : null;

  function elegirSegmento(s: Segmento) {
    if (s === 'siguiendo') seleccionarSiguiendo();
    else seleccionarComunidad(s === 'carrera' && miCarrera ? miCarrera.slug : '');
  }

  // Clips y mini evento se intercalan entre publicaciones (docs/diseno-d.md §4).
  const clipsTras = Math.min(2, publicaciones.length - 1);
  const eventoTras = Math.min(6, publicaciones.length - 1);

  function seleccionarComunidad(slug: string) {
    setSoloSiguiendo(false);
    setComunidadSlug(slug);
    const params = new URLSearchParams(parametros.toString());
    if (slug) params.set('comunidad', slug);
    else params.delete('comunidad');
    const query = params.toString();
    router.replace(query ? `/feed?${query}` : '/feed');
  }

  function seleccionarSiguiendo() {
    setSoloSiguiendo(true);
    setComunidadSlug('');
    router.replace('/feed?siguiendo=1');
  }

  function irAPublicar() {
    document.getElementById(compositorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelector<HTMLTextAreaElement>(`#${compositorId} textarea`)?.focus();
  }

  return (
    <main>
      <EncabezadoInicio titulo="Inicio" />

      <SegmentoFeed activo={segmento} conCarrera={!!miCarrera} onElegir={elegirSegmento} />

      {comunidadesFiltro.length > 0 && (
        <div className="feed-canales" role="group" aria-label="Tus otras comunidades">
          {comunidadesFiltro.map((c) => (
            <button
              key={c.slug}
              type="button"
              aria-pressed={!soloSiguiendo && comunidadSlug === c.slug}
              className={`feed-canal${!soloSiguiendo && comunidadSlug === c.slug ? ' activo' : ''}`}
              onClick={() => seleccionarComunidad(c.slug)}
            >
              {c.nombre}
            </button>
          ))}
        </div>
      )}

      <AhoraEnCampus />

      {/* Con carril derecho, la pregunta y "Tu dia" viven ahi. */}
      {conCarrilDerecho === false && (
        <>
          <PreguntaDelDia />
          <TiraTuDia />
        </>
      )}

      <form
        className={`tarjeta tarjeta-compositor${
          texto || adjuntos.length > 0 || conEncuesta ? ' compositor-abierto' : ''
        }`}
        id={compositorId}
        onSubmit={publicar}
      >
        {/* Cuadro de chat, no formulario: escribir debe sentirse como mandar
            un mensaje, no como llenar un tramite. */}
        <div className="redactor">
          <Avatar
            nombre={yo?.nombre ?? yo?.handle ?? 'Tú'}
            semilla={yo?.handle ?? 'tu'}
            fotoUrl={yo?.fotoUrl}
            verificado={yo?.esStaff}
          />
          <div className="redactor-cuerpo">
            <textarea
              rows={2}
              maxLength={2000}
              required
              aria-label="Qué estás pensando"
              placeholder={PLACEHOLDERS[placeholderIdx]}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />

        {conEncuesta && (
          <div className="encuesta">
            <label className="campo">
              <span>Pregunta</span>
              <input
                maxLength={200}
                placeholder="¿Qué día nos vemos?"
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
              />
            </label>
            {opciones.map((o, i) => (
              <label className="campo" key={i}>
                <span>Opción {i + 1}</span>
                <input
                  maxLength={100}
                  value={o}
                  onChange={(e) =>
                    setOpciones((previas) =>
                      previas.map((x, j) => (j === i ? e.target.value : x)),
                    )
                  }
                />
              </label>
            ))}
            {opciones.length < 6 && (
              <button
                type="button"
                className="secundario"
                onClick={() => setOpciones((p) => [...p, ''])}
              >
                Añadir opción
              </button>
            )}
          </div>
        )}

            {adjuntos.length > 0 && (
              <div className="miniaturas">
                {adjuntos.map((a) => (
                  <div key={a.id} className="miniatura">
                    {a.esVideo ? (
                       
                      <video src={a.url} muted />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.url} alt="" />
                    )}
                    <button
                      type="button"
                      className="miniatura-quitar"
                      aria-label="Quitar"
                      onClick={() => setAdjuntos(adjuntos.filter((x) => x.id !== a.id))}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="redactor-pie">
              <select
                className="selector-pastilla"
                aria-label="Publicar en"
                value={destino}
                onChange={(e) => setDestino(e.target.value)}
                required
              >
                {comunidades
                  .filter((c) => !c.silenciada)
                  .map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre}
                  </option>
                ))}
              </select>

              <label
                className="adjuntar"
                title="Foto o video"
                aria-label="Adjuntar foto o video"
                style={{ cursor: subiendo || adjuntos.length >= 4 ? 'not-allowed' : 'pointer' }}
              >
                <span aria-hidden="true"><Image size={18} strokeWidth={1.75} /></span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  disabled={subiendo || adjuntos.length >= 4}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void adjuntar(f);
                    e.target.value = '';
                  }}
                />
              </label>

              <button
                type="button"
                className="adjuntar"
                aria-label={conEncuesta ? 'Quitar encuesta' : 'Añadir encuesta'}
                aria-pressed={conEncuesta}
                title={conEncuesta ? 'Quitar encuesta' : 'Añadir encuesta'}
                onClick={() => setConEncuesta((v) => !v)}
              >
                <span aria-hidden="true">
                  {conEncuesta ? <span>✕</span> : <BarChart3 size={18} strokeWidth={1.75} />}
                </span>
              </button>

              {subiendo && <span className="tenue">Subiendo…</span>}

              {texto.length > 1700 && (
                <span className="tenue">{2000 - texto.length}</span>
              )}

              <span style={{ marginLeft: 'auto' }}>
                <button type="submit" disabled={enviando || (!texto.trim() && adjuntos.length === 0)}>
                  {enviando ? 'Publicando…' : 'Publicar'}
                </button>
              </span>
            </div>
          </div>
        </div>

        {aviso && <p className="nota">{aviso}</p>}
        <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
      </form>

      {errorCarga && !cargando && (
        <EstadoError onReintentar={() => void cargarFeed(comunidadSlug, soloSiguiendo)}>
          {errorCarga}
        </EstadoError>
      )}

      {cargando && <EsqueletoFeed />}

      {!cargando && publicaciones.length === 0 && !errorCarga && (
        <EstadoVacio
          icono={Flame}
          titulo={
            soloSiguiendo
              ? copy.feed.vacio.siguiendo.titulo
              : comunidadSlug
                ? copy.feed.vacio.comunidad.titulo
                : copy.feed.vacio.campus.titulo
          }
          accion={
            soloSiguiendo
              ? { etiqueta: copy.feed.vacio.siguiendo.cta, href: '/directorio' }
              : {
                  etiqueta: comunidadSlug
                    ? copy.feed.vacio.comunidad.cta
                    : copy.feed.vacio.campus.cta,
                  onClick: irAPublicar,
                }
          }
        >
          {soloSiguiendo
            ? copy.feed.vacio.siguiendo.texto
            : comunidadSlug
              ? copy.feed.vacio.comunidad.texto
              : copy.feed.vacio.campus.texto}
        </EstadoVacio>
      )}

      <ul className="lista">
        {publicaciones.map((p, i) => (
          <Fragment key={p.id}>
            <TarjetaPost
              post={p}
              yo={yo}
              permitirRetirar
              actualizar={(cambio) =>
                setPublicaciones((previas) => previas.map((x) => (x.id === p.id ? cambio(x) : x)))
              }
              onEliminada={(id) => setPublicaciones((previas) => previas.filter((x) => x.id !== id))}
            />
            {i === clipsTras && <FilaClips />}
            {i === eventoTras && <MiniEvento />}
          </Fragment>
        ))}
      </ul>

      {cursor && (
        <div ref={sentinelFeed} style={{ height: 1 }} aria-hidden="true">
          {cargandoMas && (
            <p className="tenue" style={{ textAlign: 'center', marginTop: 16 }}>
              {copy.cargando.mas}
            </p>
          )}
        </div>
      )}

      {!cursor && publicaciones.length > 0 && (
        <p className="tenue" style={{ textAlign: 'center', marginTop: 20 }}>
          Llegaste al final. Publica algo o vuelve más tarde.
        </p>
      )}
    </main>
  );
}
