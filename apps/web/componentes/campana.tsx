'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bell, CalendarDays, Car, MessageCircle, Scale, Sparkles, AtSign, UserPlus, Award, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { api } from '@/lib/api';
import { useSinNavegacion } from '@/lib/navegacion';
import { usePolling } from '@/lib/use-polling';
import { Avatar } from './avatar';
import { TiempoRelativo } from './tiempo';

interface Notificacion {
  id: string;
  tipo: string;
  texto: string;
  url: string;
  leida: boolean;
  createdAt: string;
  actor: { handle: string; nombre: string; fotoUrl: string | null } | null;
}

const ICONO: Record<string, LucideIcon> = {
  COMENTARIO: MessageCircle,
  REACCION: Sparkles,
  MENSAJE: MessageCircle,
  EVENTO_NUEVO: Sparkles,
  EVENTO_RECORDATORIO: CalendarDays,
  AVENTON_APARTADO: Car,
  AVENTON_CANCELADO: Car,
  AVENTON_RECORDATORIO: Car,
  MODERACION: Scale,
  MENCION: AtSign,
  SEGUIDOR: UserPlus,
  INSIGNIA: Award,
  RETO: Swords,
};

export function Campana() {
  const publica = useSinNavegacion();
  const [abierta, setAbierta] = useState(false);
  const [sinLeer, setSinLeer] = useState(0);
  // `null` mientras carga: "Nada por ahora" solo si de verdad no hay nada.
  const [lista, setLista] = useState<Notificacion[] | null>(null);
  const [errorLista, setErrorLista] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  // Una vez al montar, no en cada navegacion: el flujo SSE de abajo ya avisa
  // de los cambios, asi que repetir la cuenta en cada clic era una peticion
  // por pantalla que no aportaba nada.
  useEffect(() => {
    if (publica) return;
    api<{ total: number }>('/notificaciones/sin-leer')
      .then((d) => setSinLeer(d.total))
      .catch(() => undefined);
  }, [publica]);

  useEffect(() => {
    if (publica || typeof EventSource === 'undefined') return;

    const fuente = new EventSource('/api/notificaciones/stream', { withCredentials: true });

    fuente.onmessage = (evento) => {
      try {
        const datos = JSON.parse(evento.data) as { tipo?: string; total?: number };
        if (datos.tipo === 'actualizacion' && typeof datos.total === 'number') {
          setSinLeer(datos.total);
        }
      } catch {
        // Ping u otro evento: se ignora.
      }
    };

    // `EventSource` reconecta solo, para siempre, y no distingue "se cayo la
    // red" de "no tienes sesion". Sin esto, una sesion caducada dejaba al
    // navegador pidiendo el flujo cada pocos segundos sin parar: 401 tras 401
    // en el servidor y una pestaña que nunca se rinde.
    //
    // El sondeo de 60 s de abajo queda como red de seguridad, asi que cerrar
    // aqui no deja al usuario sin avisos.
    fuente.onerror = () => {
      if (fuente.readyState === EventSource.CLOSED) return;
      fuente.close();
    };

    return () => fuente.close();
  }, [publica]);

  usePolling(
    () => {
      api<{ total: number }>('/notificaciones/sin-leer')
        .then((d) => setSinLeer(d.total))
        .catch(() => undefined);
    },
    60_000,
    !publica,
  );

  useEffect(() => {
    if (!abierta) return;
    const alTocar = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) {
        setAbierta(false);
      }
    };
    document.addEventListener('mousedown', alTocar);
    return () => document.removeEventListener('mousedown', alTocar);
  }, [abierta]);

  async function alternar() {
    const nueva = !abierta;
    setAbierta(nueva);
    if (!nueva) return;
    await cargarLista();
  }

  async function cargarLista() {
    setErrorLista(false);
    let d: { notificaciones: Notificacion[] };
    try {
      d = await api<{ notificaciones: Notificacion[] }>('/notificaciones');
    } catch {
      setErrorLista(true);
      return;
    }
    setLista(d.notificaciones);
    if (sinLeer > 0) {
      try {
        await api('/notificaciones/leidas', { method: 'POST' });
        setSinLeer(0);
      } catch {
        // Silencioso: la cuenta se corrige en el siguiente sondeo.
      }
    }
  }

  // Una campana sin sesion no puede mostrar nada; ofrecerla es prometer algo
  // que al tocarlo da 401.
  if (publica) return null;

  return (
    <div ref={contenedor} style={{ position: 'relative' }}>
      <button
        type="button"
        className="fantasma campana-boton"
        aria-label={sinLeer > 0 ? `${sinLeer} notificaciones sin leer` : 'Notificaciones'}
        aria-expanded={abierta}
        onClick={alternar}
      >
        <Bell size={20} strokeWidth={1.75} />
        {sinLeer > 0 && <span className="campana-globo">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>

      {abierta && (
        <div className="campana-panel">
          <p className="panel-titulo" style={{ margin: '0 0 8px' }}>
            Notificaciones
          </p>

          {errorLista && lista === null ? (
            <p className="tenue" style={{ margin: 0 }}>
              No se pudieron cargar.{' '}
              <button type="button" className="enlace-texto" onClick={() => void cargarLista()}>
                Reintentar
              </button>
            </p>
          ) : lista === null ? (
            <div style={{ display: 'grid', gap: 10 }} aria-busy="true" aria-label="Cargando notificaciones">
              {[0, 1, 2].map((i) => (
                <div key={i} className="esqueleto-cabeza" aria-hidden="true">
                  <div className="esqueleto esqueleto-avatar" style={{ width: 30, height: 30 }} />
                  <div className="esqueleto-identidad">
                    <div className="esqueleto" style={{ width: '80%', height: 12 }} />
                    <div className="esqueleto" style={{ width: '35%', height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : lista.length === 0 ? (
            <p className="tenue" style={{ margin: 0 }}>
              Nada por ahora. Te avisamos cuando alguien te escriba o comente.
            </p>
          ) : (
            <div style={{ display: 'grid', gap: 2 }}>
              {lista.map((n) => {
                const Icono = ICONO[n.tipo];
                return (
                  <Link
                    key={n.id}
                    href={n.url}
                    className="notificacion"
                    onClick={() => setAbierta(false)}
                  >
                    {n.actor ? (
                      <Avatar
                        nombre={n.actor.nombre}
                        semilla={n.actor.handle}
                        fotoUrl={n.actor.fotoUrl}
                        tamano="chico"
                      />
                    ) : Icono ? (
                      <span className="ventaja-icono" aria-hidden="true">
                        <Icono size={16} strokeWidth={1.75} />
                      </span>
                    ) : (
                      <span className="menu-icono" aria-hidden="true">
                        •
                      </span>
                    )}
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '0.9rem' }}>{n.texto}</span>
                      <span className="tenue" style={{ fontSize: '0.78rem' }}>
                        <TiempoRelativo fecha={n.createdAt} />
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
          <p style={{ margin: '10px 0 0' }}>
            <Link href="/notificaciones" className="pub-cuentas" onClick={() => setAbierta(false)}>
              Ver todas →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
