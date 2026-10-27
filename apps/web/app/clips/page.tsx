'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Clapperboard, Heart, MessageCircle, Volume2, VolumeX } from 'lucide-react';

import { api } from '@/lib/api';
import { reaccionarOptimista, type Publicacion } from '@/lib/publicaciones';
import { Avatar } from '@/componentes/avatar';
import { Compartir } from '@/componentes/compartir';
import { GuardarPost } from '@/componentes/guardar-post';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { useConsultaMedia } from '@/lib/pantalla';

/**
 * Clips del campus (docs/diseno-d.md §4): videos verticales uno tras otro, a
 * pantalla completa en el telefono. Solo se muestra lo que la API da: sin
 * vistas ni evento ligado mientras no existan.
 */

interface Comunidad {
  slug: string;
  tipo: string;
}

type Pestana = 'campus' | 'carrera';

export default function Clips() {
  return (
    <Suspense fallback={<div className="visor-clips" aria-busy="true" />}>
      <ClipsInterno />
    </Suspense>
  );
}

function ClipsInterno() {
  const parametros = useSearchParams();
  const desde = parametros.get('desde');
  const [pestana, setPestana] = useState<Pestana>('campus');
  const [carrera, setCarrera] = useState<string | null>(null);
  const [clips, setClips] = useState<Publicacion[] | null>(null);
  const [error, setError] = useState(false);
  const [conSonido, setConSonido] = useState(false);
  // En el telefono va a pantalla completa sobre todo lo demas. Se monta en
  // <body>: dentro del marco, la animacion de entrada de la pagina (transform)
  // vuelve `position: fixed` relativo a ella y el visor quedaba en cero.
  const telefono = useConsultaMedia('(max-width: 860px)');

  useEffect(() => {
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then((c) => setCarrera(c.find((x) => x.tipo === 'CARRERA')?.slug ?? null))
      .catch(() => undefined);
  }, []);

  const cargar = useCallback(async () => {
    setError(false);
    setClips(null);
    try {
      const p = new URLSearchParams({ tipo: 'clips' });
      if (pestana === 'carrera' && carrera) p.set('comunidadSlug', carrera);
      const datos = await api<{ publicaciones: Publicacion[] }>(`/feed?${p}`);
      setClips(datos.publicaciones.filter((x) => x.media?.some((m) => m.esVideo)));
    } catch {
      setError(true);
    }
  }, [pestana, carrera]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Al llegar desde la fila del inicio, se abre en el clip que se toco.
  useEffect(() => {
    if (!desde || !clips?.length) return;
    document.getElementById(`clip-${desde}`)?.scrollIntoView({ block: 'start' });
  }, [desde, clips]);

  const actualizar = (id: string) => (cambio: (p: Publicacion) => Publicacion) =>
    setClips((previos) => previos?.map((x) => (x.id === id ? cambio(x) : x)) ?? previos);

  const visor = (
    <main className="visor-clips">
      <header className="visor-clips-cabeza">
        <Link href="/feed" className="visor-clips-boton" aria-label="Volver al inicio">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
        <div className="visor-clips-pestanas" role="tablist" aria-label="Qué clips ver">
          {carrera && (
            <button
              type="button"
              role="tab"
              aria-selected={pestana === 'carrera'}
              onClick={() => setPestana('carrera')}
            >
              Mi carrera
            </button>
          )}
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'campus'}
            onClick={() => setPestana('campus')}
          >
            Campus
          </button>
        </div>
        <button
          type="button"
          className="visor-clips-boton"
          aria-label={conSonido ? 'Quitar sonido' : 'Activar sonido'}
          aria-pressed={conSonido}
          onClick={() => setConSonido((v) => !v)}
        >
          {conSonido ? (
            <Volume2 size={20} strokeWidth={2} aria-hidden="true" />
          ) : (
            <VolumeX size={20} strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </header>

      {error && (
        <div className="visor-clips-estado">
          <EstadoError onReintentar={() => void cargar()}>No se pudieron cargar los clips.</EstadoError>
        </div>
      )}

      {clips && clips.length === 0 && (
        <div className="visor-clips-estado">
          <EstadoVacio
            icono={Clapperboard}
            titulo={pestana === 'carrera' ? 'Tu carrera aún no sube clips' : 'Todavía no hay clips'}
            accion={{ etiqueta: 'Subir el primero', href: '/feed#publicar' }}
          >
            Un video vertical desde el inicio aparece aquí para todo el campus.
          </EstadoVacio>
        </div>
      )}

      {clips && clips.length > 0 && (
        <div className="visor-clips-carril">
          {clips.map((p) => (
            <Clip key={p.id} post={p} conSonido={conSonido} actualizar={actualizar(p.id)} />
          ))}
        </div>
      )}
    </main>
  );
  return telefono ? createPortal(visor, document.body) : visor;
}

function Clip({
  post,
  conSonido,
  actualizar,
}: {
  post: Publicacion;
  conSonido: boolean;
  actualizar: (cambio: (p: Publicacion) => Publicacion) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [progreso, setProgreso] = useState(0);
  const [enPausa, setEnPausa] = useState(false);
  const media = post.media!.find((m) => m.esVideo)!;
  const meLate = post.miReaccion === 'ME_LATE';
  const cuantos = post.reacciones?.ME_LATE ?? 0;

  // Se reproduce solo el que esta a la vista; los demas esperan en pausa.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const obs = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          void v.play().catch(() => undefined);
          setEnPausa(false);
        } else {
          v.pause();
        }
      },
      { threshold: 0.6 },
    );
    obs.observe(v);
    return () => obs.disconnect();
  }, []);

  function alternar() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      void v.play().catch(() => undefined);
      setEnPausa(false);
    } else {
      v.pause();
      setEnPausa(true);
    }
  }

  return (
    <section id={`clip-${post.id}`} className="clip" aria-label={`Clip de ${post.autor?.nombre ?? 'alguien'}`}>
      {/* Los clips los suben estudiantes sin subtitulos; no hay pista que poner. */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={video}
        src={media.url}
        poster={media.thumbUrl ?? undefined}
        loop
        playsInline
        muted={!conSonido}
        preload="metadata"
        onClick={alternar}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration) setProgreso(v.currentTime / v.duration);
        }}
      />
      {enPausa && <span className="clip-pausa" aria-hidden="true" />}

      <div className="clip-acciones">
        <button
          type="button"
          className="clip-accion"
          aria-pressed={meLate}
          aria-label={`Me late${cuantos > 0 ? `, ${cuantos}` : ''}`}
          onClick={() => void reaccionarOptimista(post, 'ME_LATE', actualizar).catch(() => undefined)}
        >
          <span className="clip-accion-icono">
            <Heart size={26} strokeWidth={1.9} fill={meLate ? 'currentColor' : 'none'} aria-hidden="true" />
          </span>
          {cuantos > 0 ? cuantos : 'Me late'}
        </button>
        <Link href={`/publicacion/${post.id}`} className="clip-accion" aria-label="Comentarios">
          <span className="clip-accion-icono">
            <MessageCircle size={24} strokeWidth={1.9} aria-hidden="true" />
          </span>
          {post.numComments ? post.numComments : 'Comentar'}
        </Link>
        <span className="clip-accion">
          <Compartir url={`/publicacion/${post.id}`} titulo="Clip en Ágora" />
          Enviar
        </span>
        {post.miGuardado !== undefined && (
          <span className="clip-accion">
            <GuardarPost postId={post.id} inicial={post.miGuardado} />
            Guardar
          </span>
        )}
      </div>

      <div className="clip-info">
        <span className="clip-comunidad">{post.comunidad.nombre}</span>
        {post.autor && (
          <Link href={`/perfil/${post.autor.handle}`} className="clip-autor">
            <Avatar
              nombre={post.autor.nombre}
              semilla={post.autor.handle}
              fotoUrl={post.autor.fotoUrl}
              verificado={post.autor.verificado}
            />
            <strong>{post.autor.nombre}</strong>
          </Link>
        )}
        {post.texto && <p>{post.texto}</p>}
      </div>

      <div className="clip-progreso" aria-hidden="true">
        <span style={{ width: `${Math.round(progreso * 100)}%` }} />
      </div>
    </section>
  );
}
