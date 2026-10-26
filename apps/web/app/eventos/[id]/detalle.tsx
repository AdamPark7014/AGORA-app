'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { avisar, confirmar } from '@/lib/avisos';
import { analytics } from '@/lib/analytics';
import { Avatar } from '@/componentes/avatar';
import { Compartir } from '@/componentes/compartir';
import { EstadoVacio } from '@/componentes/estado-vacio';
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Car,
  Check,
  Ghost,
  GraduationCap,
  MapPin,
  Palette,
  PartyPopper,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';

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
  /** Hasta 5, primero gente que sigues. */
  asistentes?: Array<{ handle: string; nombre: string; fotoUrl: string | null }>;
}

const TIPOS: Record<string, string> = {
  FIESTA: 'Fiesta',
  ACADEMICO: 'Académico',
  DEPORTIVO: 'Deportivo',
  CULTURAL: 'Cultural',
  ORGANIZACION: 'Organización',
  OTRO: 'Otro',
};

/** La portada es del tipo de evento: la API no guarda imagen de portada. */
const ICONO_TIPO: Record<string, LucideIcon> = {
  FIESTA: PartyPopper,
  ACADEMICO: GraduationCap,
  DEPORTIVO: Trophy,
  CULTURAL: Palette,
  ORGANIZACION: Users,
};

function formato(fecha: Date, opciones: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('es-MX', { ...opciones, timeZone: 'America/Mexico_City' })
    .format(fecha)
    .replace('.', '');
}

export default function EventoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

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
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo responder.', 'error');
    }
  }

  async function escribir(handle: string) {
    setOcupado(true);
    try {
      const { id: conversacion } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle }),
      });
      router.push(`/mensajes/${conversacion}`);
    } catch (e) {
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.', 'error');
      setOcupado(false);
    }
  }

  async function borrar() {
    const si = await confirmar({
      titulo: '¿Borrar este evento?',
      detalle: 'Quienes iban a ir dejan de verlo.',
      accion: 'Borrar',
      peligro: true,
    });
    if (!si) return;
    try {
      await api(`/eventos/${id}`, { method: 'DELETE' });
      router.push('/eventos');
    } catch (e) {
      avisar(e instanceof ErrorApi ? e.message : 'No se pudo borrar el evento.', 'error');
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

  const inicio = new Date(evento.inicioAt);
  const hora = formato(inicio, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const horaFin = evento.finAt
    ? formato(new Date(evento.finAt), { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    : null;
  const detalles = [
    formato(inicio, { weekday: 'long', day: 'numeric', month: 'long' }),
    horaFin ? `${hora} a ${horaFin}` : hora,
    evento.costoMxn === 0 ? 'Gratis' : evento.costoMxn ? `$${evento.costoMxn}` : null,
    evento.cupo != null ? `cupo ${evento.cupo}` : null,
  ].filter(Boolean);
  const quedan = evento.cupo != null ? Math.max(0, evento.cupo - evento.vanAIr) : null;
  const asistentes = evento.asistentes ?? [];
  const nombres = asistentes.slice(0, 2).map((a) => a.nombre.split(' ')[0]);
  const resto = evento.vanAIr - nombres.length;
  const IconoTipo = ICONO_TIPO[evento.tipo] ?? CalendarDays;
  const voy = evento.miRespuesta === 'VOY';
  const meInteresa = evento.miRespuesta === 'ME_INTERESA';

  return (
    <main className="evento-d">
      <div className="evento-portada">
        <IconoTipo className="evento-portada-icono" size={96} strokeWidth={1.25} aria-hidden="true" />
        <Link href="/eventos" className="evento-portada-boton" aria-label="Volver a eventos">
          <ArrowLeft size={20} strokeWidth={2} aria-hidden="true" />
        </Link>
        <span className="evento-portada-compartir">
          <Compartir url={`/eventos/${id}`} titulo={evento.titulo} />
        </span>
        <span className="evento-fecha-bloque" aria-hidden="true">
          <span>{formato(inicio, { weekday: 'short' })}</span>
          <strong>{formato(inicio, { day: 'numeric' })}</strong>
          <span>{formato(inicio, { month: 'short' })}</span>
        </span>
      </div>

      <div className="evento-cuerpo">
        <span className="evento-etiqueta">
          {[TIPOS[evento.tipo] ?? evento.tipo, evento.comunidad?.nombre].filter(Boolean).join(' · ')}
        </span>
        <h1>{evento.titulo}</h1>
        <p className="evento-meta">{detalles.join(' · ')}</p>

        <div className="evento-quien-va">
          {asistentes.length > 0 && (
            <span className="evento-avatares" aria-hidden="true">
              {asistentes.slice(0, 3).map((a) => (
                <Avatar
                  key={a.handle}
                  nombre={a.nombre}
                  semilla={a.handle}
                  fotoUrl={a.fotoUrl}
                  tamano="chico"
                />
              ))}
            </span>
          )}
          <span>
            {evento.vanAIr === 0 ? (
              'Nadie ha dicho que va todavía'
            ) : nombres.length > 0 ? (
              <>
                <strong>{nombres.join(', ')}</strong>
                {resto > 0 ? ` y ${resto} más van` : nombres.length === 1 ? ' va' : ' van'}
              </>
            ) : (
              `${evento.vanAIr} van`
            )}
          </span>
          {quedan != null && (
            <span className="evento-lugares">{quedan === 0 ? 'Lleno' : `${quedan} lugares`}</span>
          )}
        </div>

        <div className="evento-atajos">
          <a
            className="evento-atajo"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${evento.lugar}, San Andrés Cholula, Puebla`)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MapPin size={20} strokeWidth={1.9} aria-hidden="true" />
            <strong>{evento.lugar}</strong>
            <span>Cómo llegar</span>
          </a>
          <Link className="evento-atajo" href="/aventones">
            <Car size={20} strokeWidth={1.9} aria-hidden="true" />
            <strong>Aventones</strong>
            <span>Pide o comparte uno</span>
          </Link>
        </div>

        {evento.descripcion && <p className="evento-descripcion">{evento.descripcion}</p>}

        {evento.autor && (
          <div className="evento-organiza">
            <Avatar
              nombre={evento.autor.nombre}
              semilla={evento.autor.handle}
              fotoUrl={evento.autor.fotoUrl}
            />
            <span>
              Organiza{' '}
              <Link href={`/perfil/${evento.autor.handle}`}>
                <strong>{evento.autor.nombre}</strong>
              </Link>
            </span>
            {!evento.esMio && (
              <button
                type="button"
                className="secundario"
                disabled={ocupado}
                onClick={() => void escribir(evento.autor!.handle)}
              >
                Mensaje
              </button>
            )}
          </div>
        )}

        {evento.esMio && (
          <button type="button" className="fantasma evento-borrar" onClick={() => void borrar()}>
            Borrar evento
          </button>
        )}
      </div>

      <div className="evento-barra">
        {/* Mismo origen: la cookie de sesión va sola y el navegador lo abre
            con Calendario o Google Calendar. */}
        <a
          href={`/api/eventos/${id}/calendario.ics`}
          download
          className="evento-barra-icono"
          aria-label="Agregar a mi calendario"
          title="Agregar a mi calendario"
        >
          <CalendarPlus size={22} strokeWidth={1.9} aria-hidden="true" />
        </a>
        {evento.esMio ? (
          <span className="evento-barra-nota">Tú organizas este evento</span>
        ) : (
          <>
            <button
              type="button"
              className="evento-barra-secundario"
              aria-pressed={meInteresa}
              onClick={() => void responder('ME_INTERESA')}
            >
              {meInteresa && <Check size={16} strokeWidth={2.4} aria-hidden="true" />}
              Me interesa
            </button>
            <button
              type="button"
              className="evento-barra-voy"
              aria-pressed={voy}
              onClick={() => void responder('VOY')}
            >
              {voy ? (
                <>
                  <Check size={18} strokeWidth={2.4} aria-hidden="true" /> Vas
                </>
              ) : (
                'Voy'
              )}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
