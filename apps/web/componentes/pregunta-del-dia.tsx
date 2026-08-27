'use client';

import { useEffect, useState } from 'react';

import { api } from '@/lib/api';
import {
  notificarInsigniasNuevas,
  obtenerGamificacion,
  EVENTO_REFRESH_GAMIFICACION,
  type SemanaPregunta,
} from '@/lib/gamificacion';
import type { BadgeCodigo } from '@agora/contracts';
import { Sparkles } from '@/componentes/iconos';

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
}

export function PreguntaDelDia() {
  const [pregunta, setPregunta] = useState<Pregunta | null>(null);
  const [semana, setSemana] = useState<SemanaPregunta | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    const cargarSemana = () => {
      obtenerGamificacion()
        .then((g) => {
          if (g.semanaPregunta) setSemana(g.semanaPregunta);
        })
        .catch(() => undefined);
    };

    api<Pregunta>('/pregunta/hoy')
      .then((p) => {
        setPregunta(p);
        if (p.semanaPregunta) setSemana(p.semanaPregunta);
      })
      .catch(() => undefined);

    cargarSemana();
    window.addEventListener(EVENTO_REFRESH_GAMIFICACION, cargarSemana);
    return () => window.removeEventListener(EVENTO_REFRESH_GAMIFICACION, cargarSemana);
  }, []);

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

  return (
    <>
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

      <div className="panel pregunta pregunta-destacada">
        <p className="panel-titulo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={14} strokeWidth={2} />
          Pregunta del día
          {pregunta.yaRespondi && ` · ${pregunta.total} respuestas`}
        </p>

        {progresoSemana && (
          <div className="pregunta-semana">
            <p className="tenue pregunta-semana-etiqueta">
              Esta semana: {progresoSemana.respondidas}/{progresoSemana.meta} días
            </p>
            <div
              className="pregunta-semana-barra"
              role="progressbar"
              aria-valuenow={progresoSemana.respondidas}
              aria-valuemin={0}
              aria-valuemax={progresoSemana.meta}
              aria-label={`${progresoSemana.respondidas} de ${progresoSemana.meta} días esta semana`}
            >
              <span
                className="pregunta-semana-relleno"
                style={{
                  width: `${Math.min(100, (progresoSemana.respondidas / progresoSemana.meta) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        <p className="pregunta-texto">{pregunta.texto}</p>

        <div style={{ display: 'grid', gap: 7, position: 'relative', zIndex: 1 }}>
          {pregunta.opciones.map((o) => {
            const porcentaje =
              pregunta.yaRespondi && pregunta.total > 0
                ? Math.round(((o.votos ?? 0) / pregunta.total) * 100)
                : 0;

            return (
              <button
                key={o.indice}
                type="button"
                className="opcion"
                aria-pressed={pregunta.miOpcion === o.indice}
                disabled={enviando || pregunta.yaRespondi}
                onClick={() => responder(o.indice)}
              >
                {pregunta.yaRespondi && (
                  <span className="opcion-barra" style={{ width: `${porcentaje}%` }} />
                )}
                <span className="opcion-contenido">
                  <span>{o.texto}</span>
                  {pregunta.yaRespondi && (
                    <span className="tenue">
                      {o.votos} · {porcentaje}%
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {!pregunta.yaRespondi ? (
          <p className="tenue" style={{ margin: '10px 0 0', position: 'relative', zIndex: 1 }}>
            Contesta para ver qué dijeron los demás.
          </p>
        ) : (
          <p className="tenue" style={{ margin: '10px 0 0', position: 'relative', zIndex: 1 }}>
            {pregunta.total} de tu comunidad ya contestaron hoy.
          </p>
        )}
      </div>
    </>
  );
}
