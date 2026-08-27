'use client';

import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';

import {
  obtenerGamificacion,
  EVENTO_REFRESH_GAMIFICACION,
  type RetoSemanal,
} from '@/lib/gamificacion';

const CLAVE_CELEBRADO = 'agora-reto-semanal-celebrado';

export function RetoSemanal() {
  const [reto, setReto] = useState<RetoSemanal | null>(null);
  const [confetti, setConfetti] = useState(false);
  const celebradoRef = useRef(false);

  useEffect(() => {
    const cargar = () => {
      obtenerGamificacion()
        .then((g) => {
          if (!g.retoSemanal) return;
          setReto(g.retoSemanal);

          if (g.retoSemanal.completado && !celebradoRef.current) {
            const clave = `${CLAVE_CELEBRADO}-${g.retoSemanal.progreso}`;
            try {
              if (sessionStorage.getItem(clave)) return;
              sessionStorage.setItem(clave, '1');
            } catch {
              // Modo privado: celebrar igual una vez por montaje.
            }
            celebradoRef.current = true;
            setConfetti(true);
            window.setTimeout(() => setConfetti(false), 700);
          }
        })
        .catch(() => undefined);
    };

    cargar();
    window.addEventListener(EVENTO_REFRESH_GAMIFICACION, cargar);
    return () => window.removeEventListener(EVENTO_REFRESH_GAMIFICACION, cargar);
  }, []);

  if (!reto) return null;

  const porcentaje = Math.min(100, (reto.progreso / reto.meta) * 100);

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

      <div className={`panel reto-semanal${reto.completado ? ' reto-semanal--completado' : ''}`}>
        <p className="panel-titulo" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star size={14} strokeWidth={2} aria-hidden="true" />
          {reto.titulo}
        </p>

        <div className="reto-semanal-progreso">
          <div
            className="reto-semanal-barra"
            role="progressbar"
            aria-valuenow={reto.progreso}
            aria-valuemin={0}
            aria-valuemax={reto.meta}
            aria-label={`${reto.progreso} de ${reto.meta} preguntas esta semana`}
          >
            <span className="reto-semanal-relleno" style={{ width: `${porcentaje}%` }} />
          </div>
          <p className="tenue reto-semanal-etiqueta">
            {reto.completado
              ? '¡Semana perfecta! ⭐ Sigue sumando racha.'
              : `${reto.progreso}/${reto.meta} preguntas — ¡completa 7/7 y sube en el leaderboard!`}
          </p>
        </div>
      </div>
    </>
  );
}
