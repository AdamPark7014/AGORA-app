'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from '@agora/contracts';

import { Avatar } from '@/componentes/avatar';
import { obtenerLeaderboard } from '@/lib/gamificacion';
import { sesion } from '@/lib/sesion';

const MEDALLAS = ['🥇', '🥈', '🥉'] as const;
const CLAVE_POSICION = 'agora-leaderboard-posicion';

export function LeaderboardRachas() {
  const [entradas, setEntradas] = useState<LeaderboardEntry[]>([]);
  const [miPosicion, setMiPosicion] = useState<number | null>(null);
  const [subioPuesto, setSubioPuesto] = useState(false);
  const [miHandle, setMiHandle] = useState<string | null>(null);

  useEffect(() => {
    sesion()
      .then((s) => setMiHandle(s?.handle ?? null))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    obtenerLeaderboard(5)
      .then((r) => {
        setEntradas(r.entradas);

        if (r.miPosicion == null) return;

        setMiPosicion(r.miPosicion);

        try {
          const prev = localStorage.getItem(CLAVE_POSICION);
          const prevNum = prev ? Number.parseInt(prev, 10) : null;
          if (prevNum != null && !Number.isNaN(prevNum) && r.miPosicion < prevNum) {
            setSubioPuesto(true);
            window.setTimeout(() => setSubioPuesto(false), 1800);
          }
          localStorage.setItem(CLAVE_POSICION, String(r.miPosicion));
        } catch {
          // Modo privado: mostrar posición sin animación persistente.
        }
      })
      .catch(() => undefined);
  }, []);

  if (entradas.length === 0) return null;

  return (
    <div className="panel leaderboard-rachas">
      <div className="leaderboard-rachas-cabecera">
        <p className="panel-titulo" style={{ margin: 0 }}>
          🔥 Top rachas del campus
        </p>
        {miPosicion != null && (
          <p
            className={`leaderboard-mi-posicion${subioPuesto ? ' leaderboard-mi-posicion--subio' : ''}`}
            aria-live="polite"
          >
            Tu puesto: #{miPosicion}
            {subioPuesto && <span className="leaderboard-mi-posicion-flecha">↑</span>}
          </p>
        )}
      </div>
      <p className="tenue leaderboard-rachas-sub">
        Los más constantes del momento — ¿te sumas mañana?
      </p>

      <div className="leaderboard-rachas-carril" role="list">
        {entradas.map((e, i) => {
          const soyYo = miHandle != null && e.handle === miHandle;

          return (
            <Link
              key={e.handle}
              href={`/perfil/${e.handle}`}
              className={`leaderboard-racha-tarjeta${soyYo ? ' leaderboard-racha-tarjeta--yo' : ''}`}
              role="listitem"
            >
              <span className="leaderboard-racha-medalla" aria-hidden="true">
                {MEDALLAS[i] ?? `#${i + 1}`}
              </span>
              <Avatar
                nombre={e.nombre}
                semilla={e.handle}
                fotoUrl={e.fotoUrl}
                tamano="chico"
              />
              <span className="leaderboard-racha-nombre">
                {soyYo ? 'Tú' : e.nombre.split(' ')[0]}
              </span>
              <span className="leaderboard-racha-dias">
                🔥 {e.rachaActual} {e.rachaActual === 1 ? 'día' : 'días'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
