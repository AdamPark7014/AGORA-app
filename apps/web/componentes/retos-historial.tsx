'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { RetoHistorial } from '@agora/contracts';

import { Avatar } from '@/componentes/avatar';
import { etiquetaTipoReto, obtenerRetosHistorial } from '@/lib/retos';

const ETIQUETA_RESULTADO: Record<NonNullable<RetoHistorial['resultado']>, string> = {
  ganaste: '🏆 Ganaste',
  perdiste: '😬 Perdiste',
  empate: '🤝 Empate',
  rechazado: '🚫 Rechazado',
};

function rivalDe(reto: RetoHistorial, miHandle: string | null) {
  if (miHandle && reto.retador.handle === miHandle) return reto.retado;
  return reto.retador;
}

function RetoHistorialTarjeta({
  reto,
  miHandle,
}: {
  reto: RetoHistorial;
  miHandle: string | null;
}) {
  const rival = rivalDe(reto, miHandle);
  const resultado = reto.resultado ? ETIQUETA_RESULTADO[reto.resultado] : 'Duelo';

  return (
    <div className="reto-historial-tarjeta" role="listitem">
      <p className="reto-historial-etiqueta">{etiquetaTipoReto(reto.tipo, true)}</p>
      <div className="reto-historial-rival">
        <Avatar nombre={rival.nombre} fotoUrl={null} tamano="chico" />
        <Link href={`/perfil/${rival.handle}`}>@{rival.handle}</Link>
      </div>
      <p className="reto-historial-resultado">{resultado}</p>
      {reto.puntajeRetador != null && reto.puntajeRetado != null && reto.estado === 'ACTIVO' && (
        <p className="tenue reto-historial-marcador">
          Marcador final: {reto.puntajeRetador} — {reto.puntajeRetado}
        </p>
      )}
    </div>
  );
}

export function RetosHistorial() {
  const [items, setItems] = useState<RetoHistorial[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [miHandle, setMiHandle] = useState<string | null>(null);

  const cargar = useCallback(
    (reset = false) => {
      setCargando(true);
      obtenerRetosHistorial(reset ? undefined : cursor ?? undefined)
        .then((r) => {
          setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
          setCursor(r.siguienteCursor);
        })
        .catch(() => undefined)
        .finally(() => setCargando(false));
    },
    [cursor],
  );

  useEffect(() => {
    import('@/lib/sesion')
      .then(({ sesion }) => sesion())
      .then((s) => setMiHandle(s.handle))
      .catch(() => undefined);
    obtenerRetosHistorial()
      .then((r) => {
        setItems(r.items);
        setCursor(r.siguienteCursor);
      })
      .catch(() => undefined);
  }, []);

  if (items.length === 0 && !cargando) return null;

  return (
    <div className="panel retos-historial">
      <p className="panel-titulo retos-historial-titulo">📜 Historial de duelos</p>
      <p className="tenue retos-historial-sub">Retos rechazados y duelos de semanas pasadas.</p>
      <div className="retos-historial-lista" role="list">
        {items.map((reto) => (
          <RetoHistorialTarjeta key={reto.id} reto={reto} miHandle={miHandle} />
        ))}
      </div>
      {cursor && (
        <button
          type="button"
          className="secundario retos-historial-mas"
          disabled={cargando}
          onClick={() => cargar(false)}
        >
          {cargando ? 'Cargando…' : 'Ver más'}
        </button>
      )}
    </div>
  );
}
