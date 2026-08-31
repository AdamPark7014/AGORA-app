'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { Search } from '@/componentes/iconos';

interface Persona {
  handle: string;
  nombre: string;
  apellidos: string;
  generacion: number | null;
  carrera: string | null;
  escuela: string | null;
  colegio: string | null;
  fotoUrl: string | null;
  verificado?: boolean;
}

interface Catalogo {
  escuelas: Array<{ slug: string; nombre: string; carreras: Array<{ slug: string; nombre: string }> }>;
  colegios: Array<{ slug: string; nombre: string }>;
}

const ANO_ACTUAL = new Date().getFullYear();
const GENERACIONES = Array.from({ length: 10 }, (_, i) => ANO_ACTUAL + 1 - i);

export default function Directorio() {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [q, setQ] = useState('');
  const [escuela, setEscuela] = useState('');
  const [carrera, setCarrera] = useState('');
  const [colegio, setColegio] = useState('');
  const [generacion, setGeneracion] = useState('');
  const [resultados, setResultados] = useState<Persona[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);

  useEffect(() => {
    api<Catalogo>('/catalogo').then(setCatalogo).catch(() => undefined);
  }, []);

  const carrerasDisponibles =
    catalogo?.escuelas.find((e) => e.slug === escuela)?.carreras ?? [];

  const buscar = useCallback(async (cursorParam?: string) => {
    const mas = Boolean(cursorParam);
    if (mas) setCargandoMas(true);
    else setCargando(true);
    setError(null);

    const parametros = new URLSearchParams();
    if (q.trim()) parametros.set('q', q.trim());
    if (escuela) parametros.set('escuela', escuela);
    if (carrera) parametros.set('carrera', carrera);
    if (colegio) parametros.set('colegio', colegio);
    if (generacion) parametros.set('generacion', generacion);
    if (cursorParam) parametros.set('cursor', cursorParam);

    try {
      const datos = await api<{ resultados: Persona[]; siguienteCursor: string | null }>(
        `/directorio?${parametros}`,
      );
      setResultados((previos) => (mas ? [...previos, ...datos.resultados] : datos.resultados));
      setCursor(datos.siguienteCursor);
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 401
          ? 'Necesitas iniciar sesión.'
          : 'No se pudo buscar.',
      );
    } finally {
      setCargando(false);
      setCargandoMas(false);
    }
  }, [q, escuela, carrera, colegio, generacion]);

  useEffect(() => {
    const temporizador = setTimeout(() => {
      void buscar();
    }, 250);
    return () => clearTimeout(temporizador);
  }, [buscar]);

  const hayFiltros = Boolean(q.trim() || escuela || carrera || colegio || generacion);

  return (
    <main>
      <EncabezadoPagina
        titulo="¿A quién buscas?"
        entradilla="Toda la comunidad UDLAP, filtrable por carrera, generación y colegio."
      />

      <div className="tarjeta">
        <label className="campo">
          <span>Buscar</span>
          <input
            placeholder="Nombre, apellido o usuario"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>

        <div className="filtros">
          <label className="campo">
            <span>Escuela</span>
            <select
              value={escuela}
              onChange={(e) => {
                setEscuela(e.target.value);
                setCarrera('');
              }}
            >
              <option value="">Todas</option>
              {catalogo?.escuelas.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Carrera</span>
            <select
              value={carrera}
              disabled={!escuela}
              onChange={(e) => setCarrera(e.target.value)}
            >
              <option value="">Todas</option>
              {carrerasDisponibles.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Colegio</span>
            <select value={colegio} onChange={(e) => setColegio(e.target.value)}>
              <option value="">Todos</option>
              {catalogo?.colegios.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Generación</span>
            <select value={generacion} onChange={(e) => setGeneracion(e.target.value)}>
              <option value="">Todas</option>
              {GENERACIONES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hayFiltros && (
          <button
            type="button"
            className="fantasma"
            onClick={() => {
              setQ('');
              setEscuela('');
              setCarrera('');
              setColegio('');
              setGeneracion('');
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <EstadoError onReintentar={() => void buscar()}>{error}</EstadoError>
      )}

      {!error && !cargando && (
        <p className="tenue" style={{ margin: '18px 0 0' }}>
          {resultados.length} {resultados.length === 1 ? 'persona' : 'personas'}
          {cursor ? '+' : ''}
        </p>
      )}

      {cargando && !error && <EsqueletoLista cantidad={4} />}

      {!error && !cargando && (
        <ul className="lista">
          {resultados.map((p) => (
            <li key={p.handle}>
              <Link href={`/perfil/${p.handle}`} className="persona tarjeta-interactiva">
                <Avatar
                  nombre={`${p.nombre} ${p.apellidos}`}
                  semilla={p.handle}
                  fotoUrl={p.fotoUrl}
                  anillo="aqua"
                  verificado={p.verificado}
                />
                <span style={{ minWidth: 0 }}>
                  <span className="persona-nombre">
                    {p.nombre} {p.apellidos}
                  </span>
                  <br />
                  <span className="tenue">@{p.handle}</span>
                </span>
                <span className="persona-meta">
                  {p.carrera ?? '—'}
                  {p.generacion ? <br /> : null}
                  {p.generacion ? `Generación ${p.generacion}` : ''}
                  {p.colegio ? <br /> : null}
                  {p.colegio ? `Colegio ${p.colegio}` : ''}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {cursor && !error && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            className="secundario"
            disabled={cargandoMas}
            onClick={() => buscar(cursor)}
          >
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}

      {!error && !cargando && resultados.length === 0 && (
        <EstadoVacio icono={Search} titulo="Nadie coincide">
          Prueba con menos filtros o busca por apellido.
        </EstadoVacio>
      )}
    </main>
  );
}
