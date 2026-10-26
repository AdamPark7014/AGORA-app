'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api } from '@/lib/api';
import { sesion } from '@/lib/sesion';
import { NOMBRE_COMUNIDAD_CAMPUS_UDLAP, SLUG_COMUNIDAD_CAMPUS_UDLAP } from '@/lib/campus';
import { Avatar } from './avatar';
import { IconoNav } from './iconos';
import { PreguntaDelDia } from './pregunta-del-dia';
import { WidgetsTuDia } from './tu-dia-feed';
import { Cake } from 'lucide-react';

/**
 * Carriles laterales del layout de tres columnas.
 *
 * El izquierdo es navegación y tus comunidades; el derecho, lo que pasa pronto.
 * Ambos son opcionales por diseño: en pantallas chicas desaparecen y la app
 * sigue completa, porque toda su información también está en sus páginas.
 */

interface Comunidad {
  slug: string;
  nombre: string;
  tipo: string;
}

const SECCIONES = [
  { href: '/feed', icono: 'feed' as const, texto: 'Inicio' },
  { href: '/clips', icono: 'clips' as const, texto: 'Clips' },
  { href: '/eventos', icono: 'eventos' as const, texto: 'Eventos' },
  { href: '/aventones', icono: 'aventones' as const, texto: 'Aventones' },
  { href: '/marketplace', icono: 'marketplace' as const, texto: 'Mercado' },
  { href: '/anonimo', icono: 'anonimo' as const, texto: 'Sin nombre' },
  { href: '/mensajes', icono: 'mensajes' as const, texto: 'Mensajes' },
  { href: '/guardados', icono: 'guardados' as const, texto: 'Guardados' },
  { href: '/directorio', icono: 'directorio' as const, texto: 'Directorio' },
  { href: '/ajustes', icono: 'ajustes' as const, texto: 'Ajustes' },
] as const;

const SECCION_STAFF = { href: '/moderacion', icono: 'ajustes' as const, texto: 'Moderar' };

export function CarrilIzquierdo() {
  const ruta = usePathname();
  const parametros = useSearchParams();
  const filtroComunidad = parametros.get('comunidad') ?? '';
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [noLeidos, setNoLeidos] = useState(0);
  const [puedeModerar, setPuedeModerar] = useState(false);

  useEffect(() => {
    sesion()
      .then((yo) => setPuedeModerar(yo.puedeModerar))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then(setComunidades)
      .catch(() => undefined);
  }, []);

  // Se recalcula al cambiar de pagina en vez de sondear: navegar ya es la
  // senal de que el usuario esta activo, y ahorra una peticion cada pocos
  // segundos por cada pestana abierta.
  useEffect(() => {
    api<{ total: number }>('/mensajes/no-leidos')
      .then((d) => setNoLeidos(d.total))
      .catch(() => undefined);
  }, [ruta]);

  return (
    <aside className="carril carril-izquierdo">
      <nav className="panel">
        <ul className="menu">
          {SECCIONES.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={
                  ruta === s.href || (s.href !== '/feed' && ruta.startsWith(`${s.href}/`))
                    ? 'page'
                    : undefined
                }
              >
                <span className="menu-icono" aria-hidden="true">
                  <IconoNav nombre={s.icono} size={20} />
                </span>
                {s.texto}
                {s.href === '/mensajes' && noLeidos > 0 && (
                  <span className="globo">{noLeidos}</span>
                )}
              </Link>
            </li>
          ))}
          {puedeModerar && (
            <li>
              <Link href={SECCION_STAFF.href} aria-current={ruta === SECCION_STAFF.href ? 'page' : undefined}>
                <span className="menu-icono" aria-hidden="true">
                  <IconoNav nombre={SECCION_STAFF.icono} size={20} />
                </span>
                {SECCION_STAFF.texto}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {comunidades.length > 0 && (
        <div className="panel">
          <p className="panel-titulo">Comunidades</p>
          <ul className="comunidades">
            <li>
              <Link
                href="/feed"
                className="comunidad-enlace"
                aria-current={ruta === '/feed' && !filtroComunidad ? 'page' : undefined}
              >
                {NOMBRE_COMUNIDAD_CAMPUS_UDLAP}
              </Link>
            </li>
            {comunidades
              .filter((c) => c.slug !== SLUG_COMUNIDAD_CAMPUS_UDLAP)
              .map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/feed?comunidad=${encodeURIComponent(c.slug)}`}
                  className="comunidad-enlace"
                  title={c.nombre}
                >
                  {c.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}

interface EventoBreve {
  id: string;
  titulo: string;
  tipo: string;
  lugar: string;
  inicioAt: string;
  vanAIr: number;
}

interface Persona {
  handle: string;
  nombre: string;
  apellidos: string;
  carrera: string | null;
  fotoUrl: string | null;
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function tiempoHasta(fecha: Date): string {
  const diff = fecha.getTime() - Date.now();
  if (diff < 0) return 'Ya pasó';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `En ${mins} min`;
  const horas = Math.floor(mins / 60);
  if (horas < 24) return `En ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

interface Cumple {
  handle: string;
  nombre: string;
  fotoUrl: string | null;
}

export function CarrilDerecho() {
  const ruta = usePathname();
  // `null` mientras carga: "Nada agendado" solo cuando de verdad no hay.
  const [eventos, setEventos] = useState<EventoBreve[] | null>(null);
  const [errorEventos, setErrorEventos] = useState(false);
  const [gente, setGente] = useState<Persona[]>([]);
  const [cumples, setCumples] = useState<Cumple[]>([]);
  const [trending, setTrending] = useState<Array<{ tag: string; usos: number }>>([]);

  useEffect(() => {
    api<{ cumples: Cumple[] }>('/notificaciones/cumples')
      .then((d) => setCumples(d.cumples))
      .catch(() => undefined);
  }, []);

  const cargarEventos = useCallback(() => {
    setErrorEventos(false);
    setEventos(null);
    api<{ eventos: EventoBreve[] }>('/eventos?limite=4')
      .then((d) => setEventos(d.eventos))
      .catch(() => setErrorEventos(true));
  }, []);

  useEffect(() => {
    cargarEventos();
  }, [cargarEventos]);

  useEffect(() => {
    api<{ resultados: Persona[] }>('/directorio?limite=4')
      .then((d) => setGente(d.resultados))
      .catch(() => undefined);

    api<{ hashtags: Array<{ tag: string; usos: number }> }>('/hashtags/trending')
      .then((d) => setTrending(d.hashtags))
      .catch(() => undefined);
  }, []);

  return (
    <aside className="carril carril-derecho">
      <PreguntaDelDia />

      {/* En el feed, la gamificacion vive aqui y no encima de las
          publicaciones (ver componentes/tu-dia-feed.tsx). */}
      {ruta === '/feed' && <WidgetsTuDia />}

      {trending.length > 0 && (
        <div className="panel">
          <p className="panel-titulo">Trending hoy</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {trending.map((h) => (
              <Link
                key={h.tag}
                href={`/hashtag/${encodeURIComponent(h.tag)}`}
                className="etiqueta naranja"
                style={{ textDecoration: 'none' }}
              >
                #{h.tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {cumples.length > 0 && (
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div className="avatares-apilados" aria-hidden="true">
              {cumples.slice(0, 4).map((c) => (
                <Avatar
                  key={c.handle}
                  nombre={c.nombre}
                  semilla={c.handle}
                  fotoUrl={c.fotoUrl}
                  tamano="chico"
                />
              ))}
            </div>
            <p className="panel-titulo" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cake size={16} strokeWidth={1.75} aria-hidden="true" />
              Cumplen hoy
            </p>
          </div>
          {cumples.map((c) => (
            <Link key={c.handle} href={`/perfil/${c.handle}`} className="cumple">
              <Avatar nombre={c.nombre} semilla={c.handle} fotoUrl={c.fotoUrl} tamano="chico" />
              <span className="cumple-nombre">{c.nombre}</span>
            </Link>
          ))}
          <p className="tenue" style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>
            Mándale un mensaje, cuesta nada.
          </p>
        </div>
      )}

      <div className="panel">
        <p className="panel-titulo">Próximos eventos</p>
        {errorEventos ? (
          <p className="tenue" style={{ margin: 0 }}>
            No se pudieron cargar.{' '}
            <button type="button" className="enlace-texto" onClick={cargarEventos}>
              Reintentar
            </button>
          </p>
        ) : eventos === null ? (
          <div className="esqueleto-lista" aria-busy="true" aria-label="Cargando eventos">
            {[0, 1].map((i) => (
              <div key={i} className="evento" aria-hidden="true">
                <div className="esqueleto" style={{ width: 44, height: 44, borderRadius: 10 }} />
                <div className="evento-cuerpo" style={{ display: 'grid', gap: 6 }}>
                  <div className="esqueleto" style={{ width: '40%', height: 11 }} />
                  <div className="esqueleto" style={{ width: '85%', height: 13 }} />
                  <div className="esqueleto" style={{ width: '60%', height: 11 }} />
                </div>
              </div>
            ))}
          </div>
        ) : eventos.length === 0 ? (
          <p className="tenue" style={{ margin: 0 }}>
            Nada agendado.{' '}
            <Link href="/eventos">Organiza algo.</Link>
          </p>
        ) : (
          <>
            {eventos.map((e) => {
              const fecha = new Date(e.inicioAt);
              return (
                <div key={e.id} className="evento">
                  <div className="evento-fecha">
                    <span className="evento-dia">{fecha.getDate()}</span>
                    <span className="evento-mes">{MESES[fecha.getMonth()]}</span>
                  </div>
                  <div className="evento-cuerpo">
                    <span className="evento-urgente">{tiempoHasta(fecha)}</span>
                    <Link href={`/eventos/${e.id}`} className="evento-titulo">
                      {e.titulo}
                    </Link>
                    <div className="evento-meta">
                      {e.lugar}
                      {e.vanAIr > 0 && ` · ${e.vanAIr} van`}
                    </div>
                  </div>
                </div>
              );
            })}
            <p style={{ margin: '14px 0 0' }}>
              <Link href="/eventos" style={{ fontSize: '0.88rem' }}>
                Ver todos →
              </Link>
            </p>
          </>
        )}
      </div>

      {gente.length > 0 && (
        <div className="panel">
          <p className="panel-titulo">Gente de tu carrera</p>
          <div style={{ display: 'grid', gap: 11 }}>
            {gente.map((p) => (
              <Link
                key={p.handle}
                href={`/perfil/${p.handle}`}
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  textDecoration: 'none',
                  color: 'inherit',
                  minWidth: 0,
                }}
              >
                <Avatar
                  nombre={`${p.nombre} ${p.apellidos}`}
                  semilla={p.handle}
                  fotoUrl={p.fotoUrl}
                  tamano="chico"
                />
                <span style={{ minWidth: 0, overflow: 'hidden' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '0.89rem',
                      display: 'block',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.nombre} {p.apellidos}
                  </span>
                  <span className="tenue" style={{ fontSize: '0.78rem' }}>
                    @{p.handle}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
