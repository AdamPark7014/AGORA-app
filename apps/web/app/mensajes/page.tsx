'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { copy } from '@/lib/copy';
import { usePolling } from '@/lib/use-polling';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { MessageCircle } from '@/componentes/iconos';
import { TiempoRelativo } from '@/componentes/tiempo';

interface Conversacion {
  id: string;
  con: { handle: string; nombre: string; fotoUrl: string | null } | null;
  ultimoTexto: string | null;
  ultimoAt: string;
  mioElUltimo: boolean;
  noLeidos: number;
}

export default function Mensajes() {
  const [conversaciones, setConversaciones] = useState<Conversacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const d = await api<{ conversaciones: Conversacion[] }>('/mensajes');
      setConversaciones(d.conversaciones);
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 401
          ? copy.mensajes.errores.sesion
          : copy.mensajes.errores.cargar,
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // La lista de conversaciones cambia mucho menos que un chat abierto: si no
  // llega nada, con mirar cada dos minutos sobra.
  usePolling(() => cargar(), 15_000, !cargando, 120_000);

  return (
    <main>
      <EncabezadoPagina
        titulo={copy.mensajes.titulo}
        entradilla={copy.mensajes.entradilla}
      />

      {error && (
        <EstadoError onReintentar={() => void cargar()}>{error}</EstadoError>
      )}

      {cargando && !error && <EsqueletoLista />}

      {!cargando && conversaciones.length === 0 && !error && (
        <EstadoVacio
          icono={MessageCircle}
          titulo={copy.mensajes.vacio.titulo}
          accion={{ etiqueta: copy.mensajes.vacio.cta, href: '/directorio' }}
        >
          {copy.mensajes.vacio.texto}
        </EstadoVacio>
      )}

      <ul className="lista">
        {conversaciones.map((c) => (
          <li key={c.id}>
            <Link href={`/mensajes/${c.id}`} className="persona tarjeta-interactiva">
              <Avatar
                nombre={c.con?.nombre ?? 'Alguien'}
                semilla={c.con?.handle ?? c.id}
                fotoUrl={c.con?.fotoUrl}
                anillo="naranja"
              />
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="persona-nombre">{c.con?.nombre ?? 'Alguien'}</span>
                <br />
                <span
                  className="tenue"
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: c.noLeidos > 0 ? 600 : 400,
                    color: c.noLeidos > 0 ? 'var(--texto)' : undefined,
                  }}
                >
                  {c.mioElUltimo && 'Tú: '}
                  {c.ultimoTexto ?? 'Sin mensajes'}
                </span>
              </span>
              <span style={{ textAlign: 'right', flex: 'none' }}>
                <span className="tenue" style={{ fontSize: '0.8rem' }}>
                  <TiempoRelativo fecha={c.ultimoAt} />
                </span>
                {c.noLeidos > 0 && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 5,
                      background: 'var(--naranja)',
                      color: '#fff',
                      borderRadius: 999,
                      padding: '1px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {c.noLeidos}
                  </span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
