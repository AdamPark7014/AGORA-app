'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { avisar, confirmar } from '@/lib/avisos';
import { analytics } from '@/lib/analytics';
import { Avatar } from '@/componentes/avatar';
import { Compartir } from '@/componentes/compartir';
import { ArrowLeft, CalendarDays, MapPin } from '@/componentes/iconos';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { Ghost } from 'lucide-react';

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  tipo: string;
  lugar: string;
  inicioAt: string;
  finAt: string | null;
  costoMxn: number | null;
  cupo: number | null;
  estado: string;
  esMio: boolean;
  autor: { handle: string; nombre: string; fotoUrl: string | null } | null;
  comunidad: { slug: string; nombre: string } | null;
  vanAIr: number;
  miRespuesta: string | null;
}

const TIPOS: Record<string, string> = {
  FIESTA: 'Fiesta',
  ACADEMICO: 'Académico',
  DEPORTIVO: 'Deportivo',
  CULTURAL: 'Cultural',
  ORGANIZACION: 'Organización',
  OTRO: 'Otro',
};

export default function EventoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setEvento(await api<Evento>(`/eventos/${id}`));
    } catch (e) {
      setError(e instanceof ErrorApi && e.estado === 404 ? 'Ese evento no existe.' : 'No se pudo cargar.');
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function responder(respuesta: 'VOY' | 'ME_INTERESA' | 'NO_VOY') {
    try {
      const r = await api<{ miRespuesta: string | null }>(`/eventos/${id}/asistencia`, {
        method: 'POST',
        body: JSON.stringify({ respuesta }),
      });
      setEvento((e) => (e ? { ...e, miRespuesta: r.miRespuesta } : e));
      analytics.eventoAsistencia({ eventoId: id, respuesta });
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo responder.');
    }
  }

  if (error && !evento) {
    return (
      <main>
        <EstadoVacio icono={Ghost} titulo={error}>Puede que ya haya pasado o lo hayan borrado.</EstadoVacio>
      </main>
    );
  }

  if (!evento) {
    return (
      <main>
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '50%' }} />
          <div className="esqueleto" style={{ width: '80%' }} />
        </div>
      </main>
    );
  }

  const fecha = new Date(evento.inicioAt);

  return (
    <main>
      <p style={{ marginTop: 0 }}>
        <Link href="/eventos" className="reaccion" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
          Volver a eventos
        </Link>
      </p>

      <article className="tarjeta">
        <div className="pub-cabeza">
          <span className="etiqueta naranja">{TIPOS[evento.tipo] ?? evento.tipo}</span>
          {evento.comunidad && <span className="etiqueta">{evento.comunidad.nombre}</span>}
          <Compartir url={`/eventos/${id}`} titulo={evento.titulo} />
        </div>

        <h1 style={{ margin: '12px 0 8px' }}>{evento.titulo}</h1>

        <p className="pub-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
            {fecha.toLocaleString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <MapPin size={16} strokeWidth={1.75} aria-hidden="true" />
            {evento.lugar}
          </span>
        </p>

        <p className="pub-texto">{evento.descripcion}</p>

        <div className="perfil-cifras" style={{ marginTop: 16 }}>
          <div className="perfil-cifra">
            <strong>{evento.vanAIr}</strong>
            <span className="tenue">van a ir</span>
          </div>
          {evento.cupo != null && (
            <div className="perfil-cifra">
              <strong>{evento.cupo}</strong>
              <span className="tenue">cupo</span>
            </div>
          )}
          <div className="perfil-cifra">
            <strong>{evento.costoMxn === 0 ? 'Gratis' : evento.costoMxn ? `$${evento.costoMxn}` : '—'}</strong>
            <span className="tenue">costo</span>
          </div>
        </div>

        {evento.autor && (
          <Link href={`/perfil/${evento.autor.handle}`} className="persona" style={{ marginTop: 16 }}>
            <Avatar nombre={evento.autor.nombre} semilla={evento.autor.handle} fotoUrl={evento.autor.fotoUrl} />
            <span>
              <span className="persona-nombre">Organiza {evento.autor.nombre}</span>
              <br />
              <span className="tenue">@{evento.autor.handle}</span>
            </span>
          </Link>
        )}

        {!evento.esMio && (
          <div className="acciones" style={{ marginTop: 18 }}>
            <button type="button" className={evento.miRespuesta === 'VOY' ? '' : 'secundario'} onClick={() => responder('VOY')}>
              {evento.miRespuesta === 'VOY' ? '✓ Voy' : 'Voy'}
            </button>
            <button type="button" className="fantasma" onClick={() => responder('ME_INTERESA')}>
              {evento.miRespuesta === 'ME_INTERESA' ? '✓ Me interesa' : 'Me interesa'}
            </button>
          </div>
        )}

        {evento.esMio && (
          <button type="button" className="fantasma" style={{ marginTop: 16 }} onClick={async () => {
            if (!(await confirmar({ titulo: '¿Borrar este evento?', detalle: 'Quienes iban a ir dejan de verlo.', accion: 'Borrar', peligro: true }))) return;
            try {
              await api(`/eventos/${id}`, { method: 'DELETE' });
              router.push('/eventos');
            } catch (e) {
              avisar(e instanceof ErrorApi ? e.message : 'No se pudo borrar el evento.', 'error');
            }
          }}>
            Borrar evento
          </button>
        )}
      </article>
    </main>
  );
}
