'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { RetosRankingSemanalEntrada } from '@agora/contracts';

import { Avatar } from '@/componentes/avatar';
import { EVENTO_REFRESH_RETOS, rankingSemanal } from '@/lib/retos';
import { sesion } from '@/lib/sesion';
import type { EstadoCargaRetos } from './retos-amigos';

const MEDALLAS = ['🥇', '🥈', '🥉'] as const;

export function RetosRankingSemanal({
  alCargar,
}: { alCargar?: (estado: EstadoCargaRetos) => void } = {}) {
  const [entradas, setEntradas] = useState<RetosRankingSemanalEntrada[]>([]);
  const [miHandle, setMiHandle] = useState<string | null>(null);

  const cargar = useCallback(() => {
    rankingSemanal(5)
      .then((r) => {
        setEntradas(r.entradas);
        alCargar?.(r.entradas.length > 0 ? 'datos' : 'vacio');
      })
      .catch(() => alCargar?.('error'));
  }, [alCargar]);

  useEffect(() => {
    sesion()
      .then((s) => setMiHandle(s?.handle ?? null))
      .catch(() => undefined);
    cargar();
    window.addEventListener(EVENTO_REFRESH_RETOS, cargar);
    return () => window.removeEventListener(EVENTO_REFRESH_RETOS, cargar);
  }, [cargar]);

  if (entradas.length === 0) return null;

  return (
    <div className="panel retos-ranking-semanal">
      <p className="panel-titulo retos-ranking-semanal-titulo">⚔️ Duelistas de la semana</p>
      <p className="tenue retos-ranking-semanal-sub">
        Quienes van ganando sus retos — reta a alguien y sube tú.
      </p>

      <div className="retos-ranking-semanal-carril" role="list">
        {entradas.map((e, i) => {
          const soyYo = miHandle != null && e.handle === miHandle;

          return (
            <Link
              key={e.handle}
              href={`/perfil/${e.handle}`}
              className={`retos-ranking-semanal-tarjeta${soyYo ? ' retos-ranking-semanal-tarjeta--yo' : ''}`}
              role="listitem"
            >
              <span className="retos-ranking-semanal-medalla" aria-hidden="true">
                {MEDALLAS[i] ?? `#${i + 1}`}
              </span>
              <Avatar
                nombre={e.nombre}
                semilla={e.handle}
                fotoUrl={e.fotoUrl}
                tamano="chico"
              />
              <span className="retos-ranking-semanal-nombre">
                {soyYo ? 'Tú' : e.nombre.split(' ')[0]}
              </span>
              <span className="retos-ranking-semanal-victorias">
                ⚔️ {e.victorias} {e.victorias === 1 ? 'victoria' : 'victorias'}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
