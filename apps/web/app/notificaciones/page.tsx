'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Award, Bell, Car, MessageCircle, Scale, Sparkles, AtSign, UserPlus, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { api, ErrorApi } from '@/lib/api';
import { copy } from '@/lib/copy';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { TiempoRelativo } from '@/componentes/tiempo';

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
  AVENTON_APARTADO: Car,
  MODERACION: Scale,
  MENCION: AtSign,
  SEGUIDOR: UserPlus,
  INSIGNIA: Award,
  RETO: Swords,
};

export default function Notificaciones() {
  const [items, setItems] = useState<Notificacion[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async (desde?: string) => {
    if (desde) setCargandoMas(true);
    else {
      setCargando(true);
      setError(null);
    }
    try {
      const p = new URLSearchParams();
      if (desde) p.set('cursor', desde);
      const datos = await api<{ notificaciones: Notificacion[]; siguienteCursor: string | null }>(
        `/notificaciones?${p}`,
      );
      setItems((prev) => (desde ? [...prev, ...datos.notificaciones] : datos.notificaciones));
      setCursor(datos.siguienteCursor);
      if (!desde) await api('/notificaciones/leidas', { method: 'POST' });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.notificaciones.errores.cargar);
    } finally {
      setCargando(false);
      setCargandoMas(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <main>
      <EncabezadoPagina
        titulo={copy.notificaciones.titulo}
        entradilla={copy.notificaciones.entradilla}
      />

      {error && (
        <EstadoError onReintentar={() => void cargar()}>{error}</EstadoError>
      )}

      {cargando && !error && <EsqueletoLista />}

      {!cargando && items.length === 0 && !error && (
        <EstadoVacio
          icono={Bell}
          titulo={copy.notificaciones.vacio.titulo}
          accion={{ etiqueta: copy.notificaciones.vacio.cta, href: '/feed' }}
        >
          {copy.notificaciones.vacio.texto}
        </EstadoVacio>
      )}

      <div className="tarjeta" style={{ display: 'grid', gap: 4 }}>
        {items.map((n) => {
          const Icono = ICONO[n.tipo];
          return (
          <Link key={n.id} href={n.url} className="notificacion">
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
            ) : null}
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block' }}>{n.texto}</span>
              <span className="tenue" style={{ fontSize: '0.78rem' }}>
                <TiempoRelativo fecha={n.createdAt} />
              </span>
            </span>
          </Link>
          );
        })}
      </div>

      {cursor && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button type="button" className="secundario" disabled={cargandoMas} onClick={() => cargar(cursor)}>
            {cargandoMas ? copy.cargando.mas : 'Cargar más'}
          </button>
        </div>
      )}
    </main>
  );
}
