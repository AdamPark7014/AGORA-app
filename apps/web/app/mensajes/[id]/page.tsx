'use client';

import Link from 'next/link';
import { use, useCallback, useEffect, useRef, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { usePolling } from '@/lib/use-polling';
import { sesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { Avatar } from '@/componentes/avatar';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { ArrowLeft } from '@/componentes/iconos';

interface Mensaje {
  id: string;
  texto: string;
  createdAt: string;
  mio: boolean;
  autor: { handle: string; nombre: string; fotoUrl: string | null } | null;
}

/** Lo que manda `GET /mensajes/:id/stream` por cada mensaje nuevo. */
interface EventoChat {
  tipo?: string;
  mensaje?: Omit<Mensaje, 'mio'> & { autorId: string };
}

/**
 * Ritmo del sondeo, que ahora es solo la red de seguridad.
 *
 * Los mensajes llegan por el flujo SSE al instante. Si el flujo no abre (red
 * que corta conexiones largas, sesion caducada), se vuelve al sondeo: rapido
 * mientras la conversacion esta viva y hasta un minuto cuando lleva rato
 * callada. Con el flujo abierto basta un sondeo por minuto para reconciliar.
 */
const CADA_MS = 4_000;
const CADA_MS_MAXIMO = 60_000;

export default function Conversacion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [con, setCon] = useState<{
    handle: string;
    nombre: string;
    fotoUrl: string | null;
    verificado?: boolean;
  } | null>(null);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [siguienteCursor, setSiguienteCursor] = useState<string | null>(null);
  const [cargandoAntiguos, setCargandoAntiguos] = useState(false);
  const [enVivo, setEnVivo] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const cargaInicialHecha = useRef(false);
  const miHandle = useRef<string | null>(null);
  const marcarLeido = useRef<number | undefined>(undefined);

  useEffect(() => {
    sesion()
      .then((s) => {
        miHandle.current = s.handle ?? null;
      })
      .catch(() => undefined);
  }, []);

  /** Devuelve `true` si llegaron mensajes nuevos, para no frenar el sondeo. */
  const cargarRecientes = useCallback(async (irAlFinal: boolean): Promise<boolean> => {
    try {
      const datos = await api<{
        mensajes: Mensaje[];
        con: { handle: string; nombre: string; fotoUrl: string | null; verificado?: boolean } | null;
        siguienteCursor: string | null;
      }>(`/mensajes/${id}`);
      setCon(datos.con);
      setSiguienteCursor(datos.siguienteCursor);
      setErrorCarga(null);
      let huboNuevos = false;
      setMensajes((previos) => {
        if (previos.length === 0) {
          huboNuevos = datos.mensajes.length > 0;
          return datos.mensajes;
        }
        const ids = new Set(previos.map((m) => m.id));
        const nuevos = datos.mensajes.filter((m) => !ids.has(m.id));
        if (nuevos.length === 0) return previos;
        huboNuevos = true;
        return [...previos, ...nuevos];
      });
      if (irAlFinal) {
        setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      return huboNuevos;
    } catch (e) {
      const mensaje =
        e instanceof ErrorApi && e.estado === 404
          ? 'Esa conversación no existe.'
          : 'No se pudo cargar.';
      if (!cargaInicialHecha.current) setErrorCarga(mensaje);
      else setError(mensaje);
      return false;
    } finally {
      setCargando(false);
      cargaInicialHecha.current = true;
    }
  }, [id]);

  useEffect(() => {
    setCargando(true);
    cargaInicialHecha.current = false;
    setMensajes([]);
    setCon(null);
    setErrorCarga(null);
    void cargarRecientes(true);
  }, [id, cargarRecientes]);

  useEffect(() => {
    if (cargando || errorCarga || typeof EventSource === 'undefined') return;

    const fuente = new EventSource(`/api/mensajes/${id}/stream`, { withCredentials: true });
    fuente.onopen = () => setEnVivo(true);
    fuente.onmessage = (evento) => {
      let datos: EventoChat;
      try {
        datos = JSON.parse(evento.data) as EventoChat;
      } catch {
        return;
      }
      if (datos.tipo !== 'mensaje' || !datos.mensaje) return;

      const yo = miHandle.current;
      const { autorId: _autorId, ...m } = datos.mensaje;
      const mio = yo != null && m.autor?.handle === yo;
      // Sin saber quien soy no se puede decidir de que lado va la burbuja:
      // mejor pedir la conversacion, que ya trae `mio`.
      if (yo == null) {
        void cargarRecientes(true);
        return;
      }
      setMensajes((previos) =>
        previos.some((p) => p.id === m.id) ? previos : [...previos, { ...m, mio }],
      );
      setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      // Lo que escribe el otro con el chat abierto ya esta leido. Se agrupa
      // una rafaga de mensajes en una sola consulta.
      if (!mio) {
        window.clearTimeout(marcarLeido.current);
        marcarLeido.current = window.setTimeout(() => void cargarRecientes(false), 1_500);
      }
    };
    // Igual que la campana: `EventSource` reintenta para siempre y no
    // distingue una red caida de una sesion vencida. Se cierra y queda el
    // sondeo rapido.
    fuente.onerror = () => {
      setEnVivo(false);
      fuente.close();
    };

    return () => {
      window.clearTimeout(marcarLeido.current);
      fuente.close();
      setEnVivo(false);
    };
  }, [id, cargando, errorCarga, cargarRecientes]);

  const { reiniciar: reanudarSondeo } = usePolling(
    () => cargarRecientes(false),
    enVivo ? CADA_MS_MAXIMO : CADA_MS,
    !cargando && !errorCarga,
    CADA_MS_MAXIMO,
  );

  async function cargarAntiguos() {
    if (!siguienteCursor || cargandoAntiguos) return;
    setCargandoAntiguos(true);
    try {
      const datos = await api<{ mensajes: Mensaje[]; siguienteCursor: string | null }>(
        `/mensajes/${id}?cursor=${siguienteCursor}`,
      );
      setSiguienteCursor(datos.siguienteCursor);
      setMensajes((prev) => [...datos.mensajes, ...prev]);
    } catch {
      // Silencioso.
    } finally {
      setCargandoAntiguos(false);
    }
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api(`/mensajes/${id}`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      });
      analytics.dmEnviado({ conversacionId: id });
      setTexto('');
      await cargarRecientes(true);
      reanudarSondeo();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo enviar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main>
      <div className="chat-cabeza">
        <Link href="/mensajes" className="enlace-nav" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>
        {con ? (
          <Link href={`/perfil/${con.handle}`} className="persona" style={{ flex: 1, margin: 0 }}>
            <Avatar nombre={con.nombre} semilla={con.handle} fotoUrl={con.fotoUrl} verificado={con.verificado} />
            <span>
              <span className="persona-nombre">{con.nombre}</span>
              <br />
              <span className="tenue">@{con.handle}</span>
            </span>
          </Link>
        ) : cargando ? (
          <div className="esqueleto-cabeza" style={{ flex: 1 }} aria-hidden="true">
            <div className="esqueleto esqueleto-avatar" />
            <div className="esqueleto-identidad">
              <div className="esqueleto" style={{ width: '45%', height: 13 }} />
              <div className="esqueleto" style={{ width: '30%', height: 11 }} />
            </div>
          </div>
        ) : null}
      </div>

      {errorCarga && (
        <EstadoError onReintentar={() => void cargarRecientes(true)}>{errorCarga}</EstadoError>
      )}

      {!errorCarga && (
        <>
          <div className="tarjeta">
            <div className="chat-hilo">
              {cargando && <EsqueletoLista cantidad={2} />}

              {!cargando && siguienteCursor && (
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <button
                    type="button"
                    className="fantasma"
                    disabled={cargandoAntiguos}
                    onClick={() => void cargarAntiguos()}
                  >
                    {cargandoAntiguos ? copy.cargando.general : 'Cargar mensajes anteriores'}
                  </button>
                </div>
              )}

              {!cargando && mensajes.length === 0 && (
                <p className="tenue vacio-texto" style={{ margin: 0, textAlign: 'center' }}>
                  {copy.mensajes.chatVacio}
                </p>
              )}

              {!cargando &&
                mensajes.map((m) => (
                  <div key={m.id} className={m.mio ? 'chat-burbuja chat-burbuja-mia' : 'chat-burbuja'}>
                    {m.texto}
                  </div>
                ))}
              <div ref={finRef} />
            </div>
          </div>

          <form className="tarjeta chat-composer" onSubmit={enviar}>
            <textarea
              rows={2}
              maxLength={4000}
              required
              aria-label="Tu mensaje"
              placeholder={copy.mensajes.placeholder}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && texto.trim()) {
                  e.preventDefault();
                  void enviar(e as unknown as React.FormEvent);
                }
              }}
            />
            <button type="submit" disabled={enviando || !texto.trim()}>
              {enviando ? '…' : 'Enviar'}
            </button>
            <div aria-live="polite" style={{ flexBasis: '100%' }}>
              {error && <p className="error" style={{ margin: '8px 0 0' }}>{error}</p>}
            </div>
          </form>
        </>
      )}
    </main>
  );
}
