'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useId, useRef, useState } from 'react';
import { NOMBRE_COMUNIDAD_CAMPUS_UDLAP, SLUG_COMUNIDAD_CAMPUS_UDLAP } from '@/lib/campus';

import { api, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { sesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoFeed } from '@/componentes/esqueleto';
import { Compartir } from '@/componentes/compartir';
import { GuardarPost } from '@/componentes/guardar-post';
import { Lightbox } from '@/componentes/lightbox';
import { PreguntaDelDia } from '@/componentes/pregunta-del-dia';
import { RachaBadges } from '@/componentes/racha-badges';
import { RetoSemanal } from '@/componentes/reto-semanal';
import { EventosEnVivo } from '@/componentes/eventos-en-vivo';
import { RetosAmigos } from '@/componentes/retos-amigos';
import { RetosRankingSemanal } from '@/componentes/retos-ranking-semanal';
import { LeaderboardRachas } from '@/componentes/leaderboard-rachas';
import { CampusTip } from '@/componentes/campus-tip';
import { TuDia } from '@/componentes/tu-dia';
import { avisar, confirmar } from '@/lib/avisos';
import { pingGamificacionSiNecesario, notificarInsigniasNuevas } from '@/lib/gamificacion';
import type { BadgeCodigo } from '@agora/contracts';
import { TextoConMenciones } from '@/componentes/texto-con-menciones';
import { BarChart3, Flag, Image } from '@/componentes/iconos';
import { TiempoRelativo } from '@/componentes/tiempo';
import { Flame } from 'lucide-react';
import { atributosImagen } from '@/lib/imagen';

const PLACEHOLDERS = copy.feed.placeholders;

interface Comunidad {
  slug: string;
  nombre: string;
  tipo: string;
  silenciada?: boolean;
}

interface OpcionEncuesta {
  id: string;
  texto: string;
  votos: number;
}

interface Adjunto {
  url: string;
  thumbUrl?: string | null;
  ancho?: number | null;
  mime: string;
  esVideo: boolean;
}

interface Publicacion {
  id: string;
  texto: string;
  media: Adjunto[];
  estado: string;
  createdAt: string;
  autor: { handle: string; nombre: string; fotoUrl: string | null; verificado?: boolean } | null;
  comunidad: { slug: string; nombre: string };
  encuesta: { pregunta: string; opciones: OpcionEncuesta[] } | null;
  numComments: number;
  numReactions: number;
  miReaccion: string | null;
  miGuardado?: boolean;
}

const REACCIONES = [
  { tipo: 'ME_LATE', etiqueta: 'Me late', emoji: '🔥' },
  { tipo: 'ME_RIO', etiqueta: 'Me río', emoji: '😂' },
  { tipo: 'APOYO', etiqueta: 'Apoyo', emoji: '🤝' },
  { tipo: 'NO_MAMES', etiqueta: 'No mames', emoji: '😱' },
] as const;

/**
 * Motivos de reporte, en el mismo orden que la politica de contenido: las
 * cinco lineas rojas primero y "otro" al final.
 */
const MOTIVOS_REPORTE = [
  { valor: 'INTIMIDAD_SEXUAL', etiqueta: 'Contenido íntimo sin permiso' },
  { valor: 'DATOS_PERSONALES', etiqueta: 'Datos personales' },
  { valor: 'AMENAZA_VIOLENCIA', etiqueta: 'Amenaza de violencia' },
  { valor: 'ACOSO_DIRIGIDO', etiqueta: 'Acoso dirigido' },
  { valor: 'SUPLANTACION', etiqueta: 'Suplantación' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

/** Color de la etiqueta segun el tipo de comunidad: orienta de un vistazo. */
const CLASE_COMUNIDAD: Record<string, string> = {
  UNIVERSIDAD: 'etiqueta oro',
  CARRERA: 'etiqueta naranja',
  GENERACION: 'etiqueta aqua',
  COLEGIO: 'etiqueta oro',
};

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
  const [lightbox, setLightbox] = useState<{ url: string; esVideo: boolean } | null>(null);
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
  /** Id de la publicacion cuyo menu de reporte esta abierto. */
  const [reportando, setReportando] = useState<string | null>(null);
  /** Id de la publicacion que el staff esta retirando. */
  const [retirando, setRetirando] = useState<string | null>(null);
  const [motivoRetiro, setMotivoRetiro] = useState('');
  const [editando, setEditando] = useState<string | null>(null);
  const [textoEditar, setTextoEditar] = useState('');
  /** Archivos ya subidos, esperando a que se publique. */
  const [adjuntos, setAdjuntos] = useState<Array<{ id: string; url: string; esVideo: boolean }>>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const compositorId = useId();
  const sentinelFeed = useRef<HTMLDivElement>(null);
  /** Corazones flotantes al doble toque en imágenes del feed. */
  const [corazonesFlotantes, setCorazonesFlotantes] = useState<
    Array<{ id: string; postId: string; url: string; x: number; y: number }>
  >([]);
  const ultimoToqueImagen = useRef<{ postId: string; t: number } | null>(null);

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

  /**
   * Reaccionar es optimista: la interfaz cambia al instante y el servidor
   * confirma después.
   *
   * Es la acción correcta para esto — reversible, sin consecuencia y de éxito
   * casi seguro. Esperar los ~150 ms del viaje de ida y vuelta hace que la app
   * se sienta lenta sin ganar nada. Publicar y enviar mensaje **no** son
   * optimistas: ahí el usuario necesita saber que de verdad quedó.
   *
   * Si el servidor rechaza, se revierte al estado exacto de antes.
   */
  function animarCorazonFlotante(
    postId: string,
    url: string,
    evento: React.MouseEvent<HTMLElement>,
  ) {
    const rect = evento.currentTarget.getBoundingClientRect();
    const id = `corazon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const x = evento.clientX - rect.left;
    const y = evento.clientY - rect.top;
    setCorazonesFlotantes((previos) => [...previos, { id, postId, url, x, y }]);
    window.setTimeout(() => {
      setCorazonesFlotantes((previos) => previos.filter((c) => c.id !== id));
    }, 750);
  }

  function tocarImagenPost(
    postId: string,
    url: string,
    evento: React.MouseEvent<HTMLButtonElement>,
  ) {
    const ahora = Date.now();
    const previo = ultimoToqueImagen.current;

    if (previo?.postId === postId && ahora - previo.t < 350) {
      ultimoToqueImagen.current = null;
      evento.preventDefault();
      animarCorazonFlotante(postId, url, evento);
      void reaccionar(postId, 'ME_LATE');
      return;
    }

    ultimoToqueImagen.current = { postId, t: ahora };
    window.setTimeout(() => {
      if (ultimoToqueImagen.current?.postId === postId && ultimoToqueImagen.current.t === ahora) {
        ultimoToqueImagen.current = null;
        setLightbox({ url, esVideo: false });
      }
    }, 350);
  }

  async function reaccionar(postId: string, tipo: string) {
    const antes = publicaciones.find((p) => p.id === postId);
    if (!antes) return;

    const quita = antes.miReaccion === tipo;
    const nueva = quita ? null : tipo;
    const delta = quita ? -1 : antes.miReaccion ? 0 : 1;

    setPublicaciones((previas) =>
      previas.map((p) =>
        p.id === postId ? { ...p, miReaccion: nueva, numReactions: p.numReactions + delta } : p,
      ),
    );

    try {
      const { miReaccion } = await api<{ miReaccion: string | null }>(
        `/posts/${postId}/reacciones`,
        { method: 'POST', body: JSON.stringify({ tipo }) },
      );
      // El servidor manda: si su respuesta difiere de lo que pintamos, gana él.
      if (miReaccion !== nueva) {
        setPublicaciones((previas) =>
          previas.map((p) => (p.id === postId ? { ...p, miReaccion } : p)),
        );
      }
    } catch {
      setPublicaciones((previas) =>
        previas.map((p) =>
          p.id === postId
            ? { ...p, miReaccion: antes.miReaccion, numReactions: antes.numReactions }
            : p,
        ),
      );
      avisar('No se pudo reaccionar.', 'error');
    }
  }

  async function votar(postId: string, opcionId: string) {
    try {
      const { opciones: nuevas } = await api<{ opciones: OpcionEncuesta[] }>(
        `/posts/${postId}/votos`,
        { method: 'POST', body: JSON.stringify({ opcionId }) },
      );
      setPublicaciones((previas) =>
        previas.map((p) =>
          p.id === postId && p.encuesta
            ? { ...p, encuesta: { ...p.encuesta, opciones: nuevas } }
            : p,
        ),
      );
    } catch {
      avisar('No se pudo votar.', 'error');
    }
  }

  const tipoDe = (slug: string) => comunidades.find((c) => c.slug === slug)?.tipo ?? '';
  const comunidadActiva = comunidades.find((c) => c.slug === comunidadSlug);
  const comunidadesFiltro = comunidades.filter((c) => !c.silenciada && c.slug !== SLUG_COMUNIDAD_CAMPUS_UDLAP);

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

  async function borrarPost(postId: string) {
    if (!(await confirmar({ titulo: '¿Borrar esta publicación?', detalle: 'No se puede deshacer.', accion: 'Borrar', peligro: true }))) return;
    try {
      await api(`/posts/${postId}`, { method: 'DELETE' });
      setPublicaciones((previas) => previas.filter((p) => p.id !== postId));
    } catch (e) {
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo borrar.', 'error');
    }
  }

  async function guardarEdicion(postId: string) {
    try {
      const r = await api<{ aviso: string | null }>(`/posts/${postId}`, {
        method: 'PATCH',
        body: JSON.stringify({ texto: textoEditar }),
      });
      setEditando(null);
      setPublicaciones((previas) =>
        previas.map((p) => (p.id === postId ? { ...p, texto: textoEditar } : p)),
      );
      if (r.aviso) avisar(r.aviso);
    } catch (e) {
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo editar.', 'error');
    }
  }

  /**
   * Reportar. Sin este boton la cola de moderacion solo recibe lo que marca la
   * IA, y el acoso dirigido —que un clasificador no detecta— no llega nunca.
   */
  async function reportar(postId: string, motivo: string) {
    setReportando(null);
    setError(null);
    try {
      const r = await api<{ yaExistia: boolean }>('/reportes', {
        method: 'POST',
        body: JSON.stringify({ postId, motivo }),
      });
      avisar(
        r.yaExistia
          ? 'Ya habías reportado esto. Un moderador lo va a ver.'
          : 'Gracias. Un moderador lo va a revisar.',
      );
    } catch (e) {
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo reportar.', 'error');
    }
  }

  async function retirarPost(postId: string) {
    const motivo = motivoRetiro.trim();
    if (motivo.length < 3) {
      avisar('Escribe el motivo del retiro.', 'error');
      return;
    }
    setError(null);
    try {
      await api(`/moderacion/posts/${postId}/retirar`, {
        method: 'POST',
        body: JSON.stringify({ motivo }),
      });
      setPublicaciones((previas) => previas.filter((p) => p.id !== postId));
      setRetirando(null);
      setMotivoRetiro('');
      avisar('Publicación retirada.');
    } catch (e) {
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo retirar.', 'error');
    }
  }

  function irAPublicar() {
    document.getElementById(compositorId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.querySelector<HTMLTextAreaElement>(`#${compositorId} textarea`)?.focus();
  }

  return (
    <main>
      <EncabezadoPagina
        titulo={copy.feed.titulo}
        entradilla={
          soloSiguiendo
            ? copy.feed.entradilla.siguiendo
            : comunidadSlug
              ? copy.feed.entradilla.comunidad(comunidadActiva?.nombre ?? 'esta comunidad')
              : copy.feed.entradilla.campus
        }
      />

      <div style={{ marginBottom: 12 }}>
        <EventosEnVivo />
      </div>

      <form className="tarjeta tarjeta-compositor" id={compositorId} onSubmit={publicar}>
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

      <TuDia>
        <div className="solo-movil">
          <PreguntaDelDia />
        </div>
        <RachaBadges />
        <RetoSemanal />
        <RetosAmigos />
        <RetosRankingSemanal />
        <LeaderboardRachas />
        <CampusTip />
      </TuDia>

      {errorCarga && !cargando && (
        <EstadoError onReintentar={() => void cargarFeed(comunidadSlug, soloSiguiendo)}>
          {errorCarga}
        </EstadoError>
      )}

      <div className="feed-canales feed-canales--animado" role="tablist" aria-label="Filtrar feed">
        <button
          type="button"
          role="tab"
          aria-selected={!soloSiguiendo && !comunidadSlug}
          className={`feed-canal${!soloSiguiendo && !comunidadSlug ? ' activo' : ''}`}
          onClick={() => seleccionarComunidad('')}
        >
          {NOMBRE_COMUNIDAD_CAMPUS_UDLAP}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={soloSiguiendo}
          className={`feed-canal${soloSiguiendo ? ' activo' : ''}`}
          onClick={seleccionarSiguiendo}
        >
          Siguiendo
        </button>
        {comunidadesFiltro.map((c) => (
          <button
            key={c.slug}
            type="button"
            role="tab"
            aria-selected={!soloSiguiendo && comunidadSlug === c.slug}
            className={`feed-canal${!soloSiguiendo && comunidadSlug === c.slug ? ' activo' : ''}`}
            onClick={() => seleccionarComunidad(c.slug)}
          >
            {c.nombre}
          </button>
        ))}
      </div>

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
        {publicaciones.map((p) => {
          const totalVotos =
            p.encuesta?.opciones.reduce((suma, o) => suma + o.votos, 0) ?? 0;

          return (
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
                    {p.estado === 'EN_REVISION' && ' · en revisión'}
                  </div>
                </div>
                <span
                  className={`${CLASE_COMUNIDAD[tipoDe(p.comunidad.slug)] ?? 'etiqueta'} pub-comunidad`}
                >
                  {p.comunidad.nombre}
                </span>
              </div>

              {editando === p.id ? (
                <div style={{ marginTop: 8 }}>
                  <textarea
                    rows={3}
                    maxLength={2000}
                    value={textoEditar}
                    onChange={(e) => setTextoEditar(e.target.value)}
                    style={{ width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button type="button" onClick={() => guardarEdicion(p.id)}>
                      Guardar
                    </button>
                    <button type="button" className="fantasma" onClick={() => setEditando(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                p.texto && (
                  <p className="pub-texto">
                    <TextoConMenciones texto={p.texto} />
                  </p>
                )
              )}

              {p.media.length > 0 && (
                <div className={`galeria n${Math.min(p.media.length, 4)}`}>
                  {p.media.map((m) =>
                    m.esVideo ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video key={m.url} src={m.url} controls preload="metadata" />
                    ) : (
                      <button
                        key={m.url}
                        type="button"
                        className="galeria-enlace galeria-doble-toque"
                        onClick={(e) => tocarImagenPost(p.id, m.url, e)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          ultimoToqueImagen.current = null;
                          animarCorazonFlotante(p.id, m.url, e);
                          void reaccionar(p.id, 'ME_LATE');
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img {...atributosImagen(m, p.media.length)} alt="" loading="lazy" />
                        {corazonesFlotantes
                          .filter((c) => c.postId === p.id && c.url === m.url)
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

              {p.encuesta && (
                <div className="encuesta">
                  <p className="encuesta-pregunta">{p.encuesta.pregunta}</p>
                  {p.encuesta.opciones.map((o) => {
                    const porcentaje = totalVotos ? Math.round((o.votos / totalVotos) * 100) : 0;
                    return (
                      <button
                        key={o.id}
                        type="button"
                        className="opcion"
                        onClick={() => votar(p.id, o.id)}
                      >
                        <span
                          className="opcion-barra"
                          style={{ width: `${porcentaje}%` }}
                        />
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
                    aria-pressed={p.miReaccion === r.tipo}
                    onClick={() => reaccionar(p.id, r.tipo)}
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
                  aria-expanded={reportando === p.id}
                  onClick={() => setReportando(reportando === p.id ? null : p.id)}
                >
                  <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
                </button>

                <Compartir url={`/publicacion/${p.id}`} titulo="Publicación en Ágora" />

                <GuardarPost postId={p.id} inicial={p.miGuardado} />

                {yo?.handle && p.autor?.handle === yo.handle && (
                  <>
                    <button
                      type="button"
                      className="reaccion"
                      title="Editar"
                      aria-label="Editar publicación"
                      onClick={() => {
                        setEditando(p.id);
                        setTextoEditar(p.texto);
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="reaccion"
                      title="Borrar"
                      aria-label="Borrar publicación"
                      onClick={() => borrarPost(p.id)}
                    >
                      🗑
                    </button>
                  </>
                )}

                {yo?.puedeModerar && (
                  <button
                    type="button"
                    className="reaccion"
                    title="Retirar como moderador"
                    aria-label="Retirar publicación"
                    aria-expanded={retirando === p.id}
                    onClick={() => {
                      setRetirando(retirando === p.id ? null : p.id);
                      setMotivoRetiro('');
                    }}
                  >
                    🚫
                  </button>
                )}

                {p.numReactions > 0 && (
                  <span className="pub-cuentas" style={{ marginLeft: 4 }}>
                    {p.numReactions} {p.numReactions === 1 ? 'reacción' : 'reacciones'}
                  </span>
                )}

                <Link href={`/publicacion/${p.id}`} className="pub-cuentas" style={{ marginLeft: 'auto' }}>
                  {p.numComments === 0
                    ? 'Comentar'
                    : `${p.numComments} ${p.numComments === 1 ? 'comentario' : 'comentarios'}`}
                </Link>
              </div>

              {reportando === p.id && (
                <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
                  <p className="encuesta-pregunta">¿Por qué lo reportas?</p>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {MOTIVOS_REPORTE.map((m) => (
                      <button
                        key={m.valor}
                        type="button"
                        className="reaccion"
                        onClick={() => reportar(p.id, m.valor)}
                      >
                        {m.etiqueta}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="fantasma"
                      onClick={() => setReportando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {retirando === p.id && (
                <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
                  <p className="encuesta-pregunta">Motivo del retiro (lo verá el autor)</p>
                  <input
                    value={motivoRetiro}
                    onChange={(e) => setMotivoRetiro(e.target.value)}
                    placeholder="Ej. datos personales de un tercero"
                    maxLength={500}
                  />
                  <div className="acciones" style={{ marginTop: 10 }}>
                    <button type="button" onClick={() => retirarPost(p.id)}>
                      Retirar publicación
                    </button>
                    <button
                      type="button"
                      className="fantasma"
                      onClick={() => setRetirando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
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

      {lightbox && (
        <Lightbox url={lightbox.url} esVideo={lightbox.esVideo} onCerrar={() => setLightbox(null)} />
      )}
    </main>
  );
}
