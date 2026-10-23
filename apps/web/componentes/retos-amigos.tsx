'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { RetoAmigo } from '@agora/contracts';

import {
  EVENTO_REFRESH_RETOS,
  etiquetaTipoReto,
  obtenerRetosActivos,
  refrescarRetosEnFeed,
  responderReto,
} from '@/lib/retos';
import { sesion } from '@/lib/sesion';

function RetoPendiente({
  reto,
  cargando,
  onAceptar,
  onRechazar,
}: {
  reto: RetoAmigo;
  cargando: boolean;
  onAceptar: () => void;
  onRechazar: () => void;
}) {
  return (
    <div className="reto-amigo-tarjeta reto-amigo-tarjeta--pendiente">
      <p className="reto-amigo-etiqueta">Te retaron</p>
      <p className="reto-amigo-texto">
        <Link href={`/perfil/${reto.retador.handle}`}>@{reto.retador.handle}</Link> te desafía a{' '}
        {etiquetaTipoReto(reto.tipo)}
      </p>
      <div className="reto-amigo-acciones">
        <button type="button" disabled={cargando} onClick={onAceptar}>
          ¡Va!
        </button>
        <button type="button" className="secundario" disabled={cargando} onClick={onRechazar}>
          Nel
        </button>
      </div>
    </div>
  );
}

function RetoActivo({ reto, miHandle }: { reto: RetoAmigo; miHandle: string | null }) {
  const soyRetador = miHandle != null && reto.retador.handle === miHandle;
  const rival = soyRetador ? reto.retado : reto.retador;
  const miPuntaje = soyRetador ? reto.puntajeRetador : reto.puntajeRetado;
  const suPuntaje = soyRetador ? reto.puntajeRetado : reto.puntajeRetador;

  const estadoEmoji =
    reto.ganando === 'retador'
      ? soyRetador
        ? '😎'
        : '😬'
      : reto.ganando === 'retado'
        ? soyRetador
          ? '😬'
          : '😎'
        : reto.ganando === 'empate'
          ? '🤝'
          : '⚔️';

  const copyEstado =
    reto.ganando === 'retador'
      ? soyRetador
        ? 'Vas ganando, no te confíes'
        : 'Te están ganando, despierta'
      : reto.ganando === 'retado'
        ? soyRetador
          ? 'Te están ganando, despierta'
          : 'Vas ganando, no te confíes'
        : reto.ganando === 'empate'
          ? 'Empate técnico — drama puro'
          : 'Duelo en curso';

  return (
    <div className="reto-amigo-tarjeta reto-amigo-tarjeta--activo">
      <p className="reto-amigo-etiqueta">
        {etiquetaTipoReto(reto.tipo, true)} {estadoEmoji}
      </p>
      <p className="reto-amigo-duelo">
        Tú {miPuntaje ?? 0} vs{' '}
        <Link href={`/perfil/${rival.handle}`}>@{rival.handle}</Link> {suPuntaje ?? 0}
      </p>
      <p className="tenue reto-amigo-estado">{copyEstado}</p>
    </div>
  );
}

/** Para que la página de retos sepa si hay algo que mostrar o va un vacío. */
export type EstadoCargaRetos = 'datos' | 'vacio' | 'error';

export function RetosAmigos({ alCargar }: { alCargar?: (estado: EstadoCargaRetos) => void } = {}) {
  const [pendientes, setPendientes] = useState<RetoAmigo[]>([]);
  const [activos, setActivos] = useState<RetoAmigo[]>([]);
  const [miHandle, setMiHandle] = useState<string | null>(null);
  const [respondiendo, setRespondiendo] = useState<string | null>(null);

  const cargar = useCallback(() => {
    obtenerRetosActivos()
      .then((r) => {
        setPendientes(r.pendientes);
        setActivos(r.activos);
        alCargar?.(r.pendientes.length + r.activos.length > 0 ? 'datos' : 'vacio');
      })
      .catch(() => alCargar?.('error'));
  }, [alCargar]);

  useEffect(() => {
    sesion()
      .then((s) => setMiHandle(s.handle))
      .catch(() => undefined);
    cargar();
    window.addEventListener(EVENTO_REFRESH_RETOS, cargar);
    return () => window.removeEventListener(EVENTO_REFRESH_RETOS, cargar);
  }, [cargar]);

  async function responder(reto: RetoAmigo, aceptar: boolean) {
    setRespondiendo(reto.id);
    try {
      await responderReto(reto.id, aceptar);
      cargar();
      refrescarRetosEnFeed();
    } catch {
      // Silencioso: el usuario puede reintentar.
    } finally {
      setRespondiendo(null);
    }
  }

  if (pendientes.length === 0 && activos.length === 0) return null;

  return (
    <div className="panel retos-amigos">
      <p className="panel-titulo retos-amigos-titulo">⚔️ Retos con amigos</p>
      <p className="tenue retos-amigos-sub">
        Acepta el reto o quédate viendo cómo te ganan.
      </p>

      <div className="retos-amigos-carril" role="list">
        {pendientes.map((reto) => (
          <RetoPendiente
            key={reto.id}
            reto={reto}
            cargando={respondiendo === reto.id}
            onAceptar={() => void responder(reto, true)}
            onRechazar={() => void responder(reto, false)}
          />
        ))}
        {activos.map((reto) => (
          <RetoActivo key={reto.id} reto={reto} miHandle={miHandle} />
        ))}
      </div>
    </div>
  );
}
