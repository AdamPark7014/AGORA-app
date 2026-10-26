'use client';

import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import {
  notificarInsigniasNuevas,
  obtenerGamificacion,
  EVENTO_REFRESH_GAMIFICACION,
  type SemanaPregunta,
} from '@/lib/gamificacion';
import type { BadgeCodigo } from '@agora/contracts';
import { Zap } from 'lucide-react';

interface Opcion {
  indice: number;
  texto: string;
  votos: number | null;
}

interface Pregunta {
  id: string;
  texto: string;
  yaRespondi: boolean;
  miOpcion: number | null;
  total: number;
  opciones: Opcion[];
  nuevasInsignias?: BadgeCodigo[];
  semanaPregunta?: SemanaPregunta;
  /** Hora sorpresa. Null en preguntas de antes de la mecanica. */
  abreAt?: string | null;
  aTiempoHasta?: string | null;
  abierta?: boolean;
  aTiempo?: boolean | null;
  totalATiempo?: number | null;
  miCarrera?: { nombre: string; total: number; votos: Record<string, number> } | null;
}

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function PreguntaDelDia() {
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [semana, setSemana] = useState<SemanaPregunta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confetti, setConfetti] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());

  const cargarPregunta = useCallback(() => {
    api<Pregunta>('/pregunta/hoy')
      .then((p) => {
        setPregunta(p);
        if (p.semanaPregunta) setSemana(p.semanaPregunta);
      })
      .catch(() => undefined);
  }, []);

  // Antes de la hora sorpresa: se vuelve a pedir justo cuando cae.
  const abreMs = pregunta?.abreAt ? Date.parse(pregunta.abreAt) : null;
  const esperando = pregunta?.abierta === false && abreMs != null;
  useEffect(() => {
    if (!esperando || abreMs == null) return;
    const falta = Math.min(abreMs - Date.now() + 500, 2_000_000_000);
    const t = window.setTimeout(cargarPregunta, Math.max(falta, 0));
    return () => window.clearTimeout(t);
  }, [esperando, abreMs, cargarPregunta]);

  // Mientras corre la ventana "a tiempo", la cuenta regresiva avanza sola.
  const hastaMs = pregunta?.aTiempoHasta ? Date.parse(pregunta.aTiempoHasta) : null;
  const corriendo = !!pregunta && !pregunta.yaRespondi && !esperando && hastaMs != null && ahora < hastaMs;
  useEffect(() => {
    if (!corriendo) return;
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [corriendo]);

  useEffect(() => {
    const cargarSemana = () => {
      obtenerGamificacion()
        .then((g) => {
          if (g.semanaPregunta) setSemana(g.semanaPregunta);
        })
        .catch(() => undefined);
    };

    cargarPregunta();
    cargarSemana();
    window.addEventListener(EVENTO_REFRESH_GAMIFICACION, cargarSemana);
    return () => window.removeEventListener(EVENTO_REFRESH_GAMIFICACION, cargarSemana);
  }, [cargarPregunta]);

  async function responder(indice: number) {
    if (!pregunta || enviando || pregunta.yaRespondi) return;
    setEnviando(true);
    try {
      const resultado = await api<Pregunta>(`/pregunta/${pregunta.id}/responder`, {
        method: 'POST',
        body: JSON.stringify({ opcion: indice }),
      });
      setPregunta(resultado);
      if (resultado.semanaPregunta) setSemana(resultado.semanaPregunta);
      notificarInsigniasNuevas(resultado.nuevasInsignias);
      setConfetti(true);
      window.setTimeout(() => setConfetti(false), 700);
    } catch {
      // Silencioso: una pregunta del día que falla no debe interrumpir nada.
    } finally {
      setEnviando(false);
    }
  }

  if (!pregunta) return null;

  const progresoSemana = semana ?? pregunta.semanaPregunta;

  const cabeza = (pildora: React.ReactNode) => (
    <div className="relampago-cabeza">
      <span className="relampago-etiqueta">
        <Zap size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
        Pregunta relámpago
      </span>
      {pildora}
    </div>
  );

  if (esperando) {
    return (
      <section className="relampago" aria-label="Pregunta relámpago">
        {cabeza(null)}
        <p className="relampago-texto">Hoy cae a una hora sorpresa.</p>
        <p className="relampago-nota">
          Te avisamos en cuanto salga. Contesta en los primeros 2 minutos y sales a tiempo;
          antes de contestar no ves lo que dijeron los demás.
        </p>
      </section>
    );
  }

  const carrera = pregunta.yaRespondi ? pregunta.miCarrera : null;
  const pct = (votos: number, total: number) => (total > 0 ? Math.round((votos / total) * 100) : 0);

  // "<Tu carrera> votó X % <opción> · el campus Y %" (docs/diseno-d.md §3):
  // la opcion que mas eligio tu carrera, comparada con todo el campus.
  let comparacion: string | null = null;
  if (carrera && carrera.total > 0) {
    const favorita = pregunta.opciones.reduce((mejor, o) =>
      (carrera.votos[o.indice] ?? 0) > (carrera.votos[mejor.indice] ?? 0) ? o : mejor,
    );
    comparacion = `${carrera.nombre} votó ${pct(carrera.votos[favorita.indice] ?? 0, carrera.total)} % ${favorita.texto} · el campus ${pct(favorita.votos ?? 0, pregunta.total)} %`;
  } else if (pregunta.yaRespondi && pregunta.totalATiempo != null && pregunta.abreAt) {
    comparacion = `${pregunta.totalATiempo} contestaron a tiempo`;
  }

  let pildora: React.ReactNode = null;
  if (corriendo && hastaMs != null) {
    pildora = (
      <span className="relampago-pildora" role="timer" aria-live="off">
        cierra en {mmss(hastaMs - ahora)}
      </span>
    );
  } else if (pregunta.yaRespondi && pregunta.aTiempo != null && pregunta.abreAt) {
    pildora = (
      <span className={`relampago-pildora${pregunta.aTiempo ? ' a-tiempo' : ''}`}>
        {pregunta.aTiempo ? 'Contestaste a tiempo' : 'Contestaste tarde'}
      </span>
    );
  } else if (progresoSemana) {
    pildora = (
      <span className="relampago-pildora">
        {progresoSemana.respondidas}/{progresoSemana.meta} esta semana
      </span>
    );
  }

  return (
    <section className="relampago" aria-label="Pregunta relámpago">
      {confetti && (
        <div className="pregunta-confetti" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="confetti-pieza"
              style={{
                left: `${20 + i * 10}%`,
                top: '30%',
                background: i % 2 ? 'var(--aqua)' : 'var(--naranja)',
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </div>
      )}

      {cabeza(pildora)}

      <p className="relampago-texto">{pregunta.texto}</p>

      <div className="relampago-opciones">
        {pregunta.opciones.map((o) => {
          const mia = pregunta.miOpcion === o.indice;
          const porcentaje = pregunta.yaRespondi ? pct(o.votos ?? 0, pregunta.total) : 0;
          return (
            <button
              key={o.indice}
              type="button"
              className="relampago-opcion"
              aria-pressed={mia}
              disabled={enviando || pregunta.yaRespondi}
              onClick={() => responder(o.indice)}
            >
              {pregunta.yaRespondi && (
                <span
                  className={`relampago-barra${mia ? ' mia' : ''}`}
                  style={{ width: `${porcentaje}%` }}
                  aria-hidden="true"
                />
              )}
              <span className="relampago-opcion-texto">
                {o.texto}
                {mia && ' · tu respuesta'}
              </span>
              {pregunta.yaRespondi && <span className="relampago-pct">{porcentaje} %</span>}
            </button>
          );
        })}
      </div>

      <div className="relampago-pie">
        <span>{pregunta.yaRespondi ? comparacion : 'Contesta para ver qué dijeron los demás.'}</span>
        {pregunta.yaRespondi && (
          <span className="relampago-total">
            {pregunta.total} {pregunta.total === 1 ? 'respuesta' : 'respuestas'}
          </span>
        )}
      </div>
    </section>
  );
}
