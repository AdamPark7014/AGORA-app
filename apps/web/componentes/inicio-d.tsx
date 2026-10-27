'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EventoEnVivo } from '@agora/contracts';
import { Check, Play } from 'lucide-react';

import { api } from '@/lib/api';
import type { Publicacion } from '@/lib/publicaciones';
import { obtenerEventosEnVivo } from '@/lib/retos';

/*
 * Piezas del inicio del diseno D (docs/diseno-d.md §3): encabezado con la
 * fecha, segmento, "Ahora en el campus", fila de clips y mini evento. Cada una
 * se esconde sola si la API no tiene que mostrar: la D no inventa datos.
 */

/**
 * Lunes de la primera semana de clases del semestre en curso (AAAA-MM-DD).
 * Sin fecha oficial confirmada queda en null y el encabezado muestra solo el
 * dia. Se cambia cada semestre.
 */
const INICIO_SEMESTRE: string | null = null;

function textoDeHoy(ahora: Date): string {
  const dia = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Mexico_City',
  })
    .format(ahora)
    .replace(',', '');
  const base = dia.charAt(0).toUpperCase() + dia.slice(1);
  if (!INICIO_SEMESTRE) return base;
  const semana = Math.floor((ahora.getTime() - Date.parse(`${INICIO_SEMESTRE}T00:00:00-06:00`)) / 604_800_000) + 1;
  return semana >= 1 && semana <= 20 ? `${base} · semana ${semana}` : base;
}

export function EncabezadoInicio({ titulo }: { titulo: string }) {
  // La fecha se calcula en el cliente: en el servidor la hora puede ser otra
  // y React avisaria de un HTML distinto al hidratar.
  const [hoy, setHoy] = useState('');
  useEffect(() => setHoy(textoDeHoy(new Date())), []);
  return (
    <header className="inicio-cabeza">
      <h1>{titulo}</h1>
      <p aria-live="off">{hoy || ' '}</p>
    </header>
  );
}

export type Segmento = 'campus' | 'carrera' | 'siguiendo';

export function SegmentoFeed({
  activo,
  conCarrera,
  onElegir,
}: {
  activo: Segmento | null;
  conCarrera: boolean;
  onElegir: (s: Segmento) => void;
}) {
  const opciones: Array<[Segmento, string]> = [
    ['campus', 'Campus'],
    ...(conCarrera ? ([['carrera', 'Mi carrera']] as Array<[Segmento, string]>) : []),
    ['siguiendo', 'Siguiendo'],
  ];
  return (
    <div className="segmento" role="tablist" aria-label="Qué ver">
      {opciones.map(([id, texto]) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activo === id}
          className="segmento-opcion"
          onClick={() => onElegir(id)}
        >
          {texto}
        </button>
      ))}
    </div>
  );
}

function cuandoEmpieza(e: EventoEnVivo): string {
  if (e.enCurso) return 'en curso';
  if (e.empiezaEnMinutos <= 0) return 'ya empieza';
  if (e.empiezaEnMinutos < 60) return `en ${e.empiezaEnMinutos} min`;
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Mexico_City',
  }).format(new Date(e.inicioAt));
}

/** Eventos en curso o en las proximas 3 horas. */
export function AhoraEnCampus() {
  const [eventos, setEventos] = useState<EventoEnVivo[]>([]);

  useEffect(() => {
    obtenerEventosEnVivo(3)
      .then((r) => setEventos(r.eventos))
      .catch(() => undefined);
  }, []);

  if (eventos.length === 0) return null;

  return (
    <section className="ahora" aria-label="Ahora en el campus">
      <p className="ahora-titulo">
        <span className="ahora-punto" aria-hidden="true" />
        Ahora en el campus
      </p>
      <ul className="ahora-carril">
        {eventos.map((e) => (
          <li key={e.id}>
            <Link href={`/eventos/${e.id}`} className="ahora-tarjeta">
              <strong>{e.titulo}</strong>
              <span>
                {[e.lugar, cuandoEmpieza(e), e.vanAIr > 0 ? `${e.vanAIr} van` : null]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Fila de clips del campus dentro de la lista del feed. Sin videos, no sale. */
export function FilaClips() {
  const [clips, setClips] = useState<Publicacion[]>([]);

  useEffect(() => {
    api<{ publicaciones: Publicacion[] }>('/feed?tipo=clips')
      .then((d) => setClips(d.publicaciones.filter((p) => p.media?.some((m) => m.esVideo))))
      .catch(() => undefined);
  }, []);

  if (clips.length === 0) return null;

  return (
    <li className="fila-clips" aria-label="Clips del campus">
      <div className="fila-clips-cabeza">
        <h2>Clips del campus</h2>
        <Link href="/clips">Ver todos</Link>
      </div>
      <div className="fila-clips-carril">
        {clips.slice(0, 8).map((p) => {
          const video = p.media!.find((m) => m.esVideo)!;
          return (
            <Link
              key={p.id}
              href={`/clips?desde=${p.id}`}
              className="clip-tarjeta"
              aria-label={`Clip de ${p.autor?.nombre ?? p.alias ?? 'alguien'} en ${p.comunidad.nombre}`}
            >
              {video.thumbUrl ? (
                // Portada que guarda la API al re-codificar el video.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.thumbUrl} alt="" loading="lazy" aria-hidden="true" />
              ) : (
                // Videos de antes de las portadas: el primer cuadro, sin precargar el video entero.
                <video src={`${video.url}#t=0.1`} muted playsInline preload="metadata" aria-hidden="true" />
              )}
              <span className="clip-chip">{p.comunidad.nombre}</span>
              <span className="clip-play" aria-hidden="true">
                <Play size={14} fill="currentColor" strokeWidth={0} />
              </span>
              {p.texto && <span className="clip-texto">{p.texto}</span>}
            </Link>
          );
        })}
      </div>
    </li>
  );
}

interface EventoLista {
  id: string;
  titulo: string;
  lugar: string;
  inicioAt: string;
  vanAIr: number;
  miRespuesta: 'VOY' | 'ME_INTERESA' | null;
  comunidad: { slug: string; nombre: string } | null;
  asistentes?: Array<{ handle: string; nombre: string }>;
}

function etiquetaEvento(e: EventoLista): string {
  // La lista solo trae eventos abiertos o de mis comunidades: si es de una
  // generacion, es la mia.
  if (e.comunidad?.slug.startsWith('generacion:') && e.vanAIr > 0) {
    return `Tu generación va · ${e.vanAIr}`;
  }
  const primero = e.asistentes?.[0];
  if (primero && e.vanAIr > 1) return `Van ${primero.nombre.split(' ')[0]} y ${e.vanAIr - 1} más`;
  if (primero) return `Va ${primero.nombre.split(' ')[0]}`;
  if (e.vanAIr > 0) return `Van ${e.vanAIr}`;
  return e.comunidad?.nombre ?? 'Próximo evento';
}

/** El siguiente evento al que todavia no dices que vas, con "Voy" a un toque. */
export function MiniEvento() {
  const [evento, setEvento] = useState<EventoLista | null>(null);
  const [voy, setVoy] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api<{ eventos: EventoLista[] }>('/eventos?limite=10')
      .then((d) => {
        const ahora = Date.now();
        setEvento(
          d.eventos.find((e) => e.miRespuesta !== 'VOY' && Date.parse(e.inicioAt) > ahora) ?? null,
        );
      })
      .catch(() => undefined);
  }, []);

  if (!evento) return null;

  const inicio = new Date(evento.inicioAt);
  const fmt = (o: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('es-MX', { ...o, timeZone: 'America/Mexico_City' }).format(inicio);

  async function marcarVoy() {
    if (!evento || enviando) return;
    setEnviando(true);
    try {
      await api(`/eventos/${evento.id}/asistencia`, {
        method: 'POST',
        body: JSON.stringify({ respuesta: 'VOY' }),
      });
      setVoy(true);
    } catch {
      // Sin ruido: desde el detalle del evento se puede volver a intentar.
    } finally {
      setEnviando(false);
    }
  }

  return (
    <li className="mini-evento">
      <div className="mini-evento-fecha" aria-hidden="true">
        <span>{fmt({ weekday: 'short' }).replace('.', '')}</span>
        <strong>{fmt({ day: 'numeric' })}</strong>
      </div>
      <Link href={`/eventos/${evento.id}`} className="mini-evento-cuerpo">
        <span className="mini-evento-etiqueta">{etiquetaEvento(evento)}</span>
        <strong>{evento.titulo}</strong>
        <span className="mini-evento-meta">
          {fmt({ weekday: 'long', day: 'numeric', month: 'short' })} · {fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })} ·{' '}
          {evento.lugar}
        </span>
      </Link>
      <button
        type="button"
        className="boton-tinta"
        onClick={() => void marcarVoy()}
        disabled={enviando || voy}
        aria-label={voy ? `Vas a ${evento.titulo}` : `Voy a ${evento.titulo}`}
      >
        {voy ? (
          <>
            <Check size={16} strokeWidth={2.4} aria-hidden="true" /> Vas
          </>
        ) : (
          'Voy'
        )}
      </button>
    </li>
  );
}
