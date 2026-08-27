'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { CalendarDays, MapPin, Plus, X } from '@/componentes/iconos';

interface Comunidad {
  slug: string;
  nombre: string;
}

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
  autor: { handle: string; nombre: string; fotoUrl: string | null } | null;
  comunidad: { slug: string; nombre: string } | null;
  vanAIr: number;
  miRespuesta: string | null;
}

const TIPOS = [
  { valor: 'FIESTA', etiqueta: 'Fiesta' },
  { valor: 'ACADEMICO', etiqueta: 'Académico' },
  { valor: 'DEPORTIVO', etiqueta: 'Deportivo' },
  { valor: 'CULTURAL', etiqueta: 'Cultural' },
  { valor: 'ORGANIZACION', etiqueta: 'Organización' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Valor inicial del campo datetime-local: mañana a las 9 de la noche. */
function mananaEnLaNoche(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(21, 0, 0, 0);
  // datetime-local quiere hora local sin zona, no ISO en UTC.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Eventos() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [comunidades, setComunidades] = useState<Comunidad[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [nuevo, setNuevo] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'FIESTA',
    lugar: '',
    inicioAt: mananaEnLaNoche(),
    costoMxn: '',
    cupo: '',
    comunidadSlug: '',
  });

  const cargar = useCallback(async (tipo: string) => {
    setCargando(true);
    setError(null);
    try {
      const q = tipo ? `?tipo=${tipo}` : '';
      const datos = await api<{ eventos: Evento[] }>(`/eventos${q}`);
      setEventos(datos.eventos);
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 401
          ? 'Necesitas iniciar sesión.'
          : 'No se pudieron cargar los eventos.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(filtroTipo);
  }, [filtroTipo, cargar]);

  useEffect(() => {
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then(setComunidades)
      .catch(() => undefined);
  }, []);

  function actualizar(campo: keyof typeof nuevo, valor: string) {
    setNuevo((previo) => ({ ...previo, [campo]: valor }));
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api('/eventos', {
        method: 'POST',
        body: JSON.stringify({
          titulo: nuevo.titulo,
          descripcion: nuevo.descripcion,
          tipo: nuevo.tipo,
          lugar: nuevo.lugar,
          inicioAt: new Date(nuevo.inicioAt).toISOString(),
          ...(nuevo.costoMxn ? { costoMxn: Number(nuevo.costoMxn) } : {}),
          ...(nuevo.cupo ? { cupo: Number(nuevo.cupo) } : {}),
          ...(nuevo.comunidadSlug ? { comunidadSlug: nuevo.comunidadSlug } : {}),
        }),
      });
      setNuevo({
        titulo: '',
        descripcion: '',
        tipo: 'FIESTA',
        lugar: '',
        inicioAt: mananaEnLaNoche(),
        costoMxn: '',
        cupo: '',
        comunidadSlug: '',
      });
      setAbierto(false);
      await cargar(filtroTipo);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo crear el evento.');
    } finally {
      setEnviando(false);
    }
  }

  async function responder(id: string, respuesta: 'VOY' | 'ME_INTERESA') {
    try {
      const { miRespuesta } = await api<{ miRespuesta: string | null }>(
        `/eventos/${id}/asistencia`,
        { method: 'POST', body: JSON.stringify({ respuesta }) },
      );
      setEventos((previos) =>
        previos.map((e) =>
          e.id === id
            ? {
                ...e,
                miRespuesta,
                vanAIr:
                  e.vanAIr +
                  (miRespuesta === 'VOY' && e.miRespuesta !== 'VOY' ? 1 : 0) +
                  (miRespuesta !== 'VOY' && e.miRespuesta === 'VOY' ? -1 : 0),
              }
            : e,
        ),
      );
      analytics.eventoAsistencia({ eventoId: id, respuesta });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo responder.');
    }
  }

  return (
    <main>
      <EncabezadoPagina
        titulo="Qué hay esta semana"
        entradilla="Fiestas, torneos, juntas y todo lo que se arma en el campus."
        acciones={
          <>
            <button type="button" onClick={() => setAbierto((v) => !v)}>
              {abierto ? (
                <>
                  <X size={18} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -3 }} />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus size={18} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -3 }} />
                  Organizar algo
                </>
              )}
            </button>
            <select
              className="selector-pastilla"
              aria-label="Filtrar por tipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.etiqueta}
                </option>
              ))}
            </select>
          </>
        }
      />

      {abierto && (
        <form className="tarjeta" style={{ marginBottom: 20 }} onSubmit={crear}>
          <label className="campo">
            <span>¿Qué se arma?</span>
            <input
              required
              maxLength={120}
              placeholder="Fiesta de fin de parciales"
              value={nuevo.titulo}
              onChange={(e) => actualizar('titulo', e.target.value)}
            />
          </label>

          <label className="campo">
            <span>Cuenta de qué va</span>
            <textarea
              required
              rows={3}
              maxLength={2000}
              placeholder="Traigan lo que quieran tomar. Hay bocinas y alberca."
              value={nuevo.descripcion}
              onChange={(e) => actualizar('descripcion', e.target.value)}
            />
          </label>

          <div className="filtros">
            <label className="campo">
              <span>Tipo</span>
              <select value={nuevo.tipo} onChange={(e) => actualizar('tipo', e.target.value)}>
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </label>

            <label className="campo">
              <span>Cuándo</span>
              <input
                type="datetime-local"
                required
                value={nuevo.inicioAt}
                onChange={(e) => actualizar('inicioAt', e.target.value)}
              />
            </label>
          </div>

          <label className="campo">
            <span>Dónde</span>
            <input
              required
              maxLength={200}
              placeholder="Casa de Regina, Lomas de Angelópolis"
              value={nuevo.lugar}
              onChange={(e) => actualizar('lugar', e.target.value)}
            />
          </label>

          <div className="filtros">
            <label className="campo">
              <span>Cooperación en pesos (opcional)</span>
              <input
                type="number"
                min={0}
                placeholder="150"
                value={nuevo.costoMxn}
                onChange={(e) => actualizar('costoMxn', e.target.value)}
              />
            </label>

            <label className="campo">
              <span>Cupo (opcional)</span>
              <input
                type="number"
                min={1}
                placeholder="40"
                value={nuevo.cupo}
                onChange={(e) => actualizar('cupo', e.target.value)}
              />
            </label>
          </div>

          <label className="campo">
            <span>¿Para quién?</span>
            <select
              value={nuevo.comunidadSlug}
              onChange={(e) => actualizar('comunidadSlug', e.target.value)}
            >
              <option value="">Toda la UDLAP</option>
              {comunidades.map((c) => (
                <option key={c.slug} value={c.slug}>
                  Solo {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="grande" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Publicar evento'}
          </button>

          {error && <p className="error">{error}</p>}
        </form>
      )}

      {error && !abierto && <p className="error">{error}</p>}

      {cargando && (
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '50%' }} />
          <div className="esqueleto" style={{ width: '80%' }} />
        </div>
      )}

      {!cargando && eventos.length === 0 && !error && (
        <EstadoVacio icono={CalendarDays} titulo="No hay nada agendado">
          Sé quien arma el plan. Alguien tiene que empezar.
        </EstadoVacio>
      )}

      <ul className="lista">
        {eventos.map((e) => {
          const fecha = new Date(e.inicioAt);
          const tipo = TIPOS.find((t) => t.valor === e.tipo);
          const diasPara = Math.ceil((fecha.getTime() - Date.now()) / 86400000);
          const pronto = diasPara >= 0 && diasPara <= 3;
          return (
            <li key={e.id} className="tarjeta tarjeta-evento tarjeta-interactiva">
              <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                <div className="evento-fecha" style={{ width: 58 }}>
                  <span className="evento-dia">{fecha.getDate()}</span>
                  <span className="evento-mes">{MESES[fecha.getMonth()]}</span>
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  {pronto && (
                    <span className="evento-urgente">
                      {diasPara === 0 ? 'Hoy' : diasPara === 1 ? 'Mañana' : `En ${diasPara} días`}
                    </span>
                  )}
                  <span className={`tipo-evento tipo-${e.tipo}`}>
                    {tipo?.etiqueta ?? e.tipo}
                  </span>
                  <Link href={`/eventos/${e.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h2 style={{ margin: '8px 0 4px', fontSize: '1.15rem' }}>{e.titulo}</h2>
                  </Link>
                  <p className="tenue" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
                    {e.lugar} ·{' '}
                    {fecha.toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {e.costoMxn !== null && ` · ${e.costoMxn === 0 ? 'Gratis' : `$${e.costoMxn}`}`}
                    {e.cupo !== null && ` · cupo ${e.cupo}`}
                  </p>
                </div>
              </div>

              <p style={{ whiteSpace: 'pre-wrap', marginBottom: 14 }}>{e.descripcion}</p>

              <div className="pub-pie">
                <button
                  type="button"
                  className="reaccion"
                  aria-pressed={e.miRespuesta === 'VOY'}
                  onClick={() => responder(e.id, 'VOY')}
                >
                  Voy
                </button>
                <button
                  type="button"
                  className="reaccion"
                  aria-pressed={e.miRespuesta === 'ME_INTERESA'}
                  onClick={() => responder(e.id, 'ME_INTERESA')}
                >
                  Me interesa
                </button>

                <span className="pub-cuentas">
                  {e.vanAIr} {e.vanAIr === 1 ? 'va' : 'van'}
                </span>
              </div>

              {e.autor && (
                <p
                  className="tenue"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '12px 0 0' }}
                >
                  <Avatar
                    nombre={e.autor.nombre}
                    semilla={e.autor.handle}
                    fotoUrl={e.autor.fotoUrl}
                    tamano="chico"
                  />
                  Organiza <Link href={`/perfil/${e.autor.handle}`}>{e.autor.nombre}</Link>
                  {e.comunidad && ` · ${e.comunidad.nombre}`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
