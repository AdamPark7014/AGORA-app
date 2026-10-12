'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { Search } from '@/componentes/iconos';
import { TarjetaPost } from '@/componentes/tarjeta-post';
import { normalizarPublicacion, type PublicacionApi } from '@/lib/publicaciones';
import { TiempoRelativo } from '@/componentes/tiempo';

interface Persona {
  handle: string;
  nombre: string;
  fotoUrl: string | null;
  carrera: string | null;
  verificado?: boolean;
}

interface Evento {
  id: string;
  titulo: string;
  lugar: string;
  inicioAt: string;
}

interface Anuncio {
  id: string;
  titulo: string;
  precioMxn: number;
  vendedor: { handle: string; nombre: string } | null;
}

const TIPOS = [
  { valor: 'todo', etiqueta: 'Todo' },
  { valor: 'personas', etiqueta: 'Personas' },
  { valor: 'publicaciones', etiqueta: 'Publicaciones' },
  { valor: 'eventos', etiqueta: 'Eventos' },
  { valor: 'marketplace', etiqueta: 'Marketplace' },
] as const;

export default function Buscar() {
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]['valor']>('todo');
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [publicaciones, setPublicaciones] = useState<PublicacionApi[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setPersonas([]);
      setPublicaciones([]);
      setEventos([]);
      setAnuncios([]);
      return;
    }

    const t = setTimeout(async () => {
      setCargando(true);
      setError(null);
      try {
        const p = new URLSearchParams({ q: q.trim(), tipo });
        const datos = await api<{
          personas: Persona[];
          publicaciones: PublicacionApi[];
          eventos: Evento[];
          anuncios: Anuncio[];
        }>(`/buscar?${p}`);
        setPersonas(datos.personas);
        setPublicaciones(datos.publicaciones);
        setEventos(datos.eventos);
        setAnuncios(datos.anuncios);
      } catch (e) {
        setError(e instanceof ErrorApi ? e.message : 'No se pudo buscar.');
      } finally {
        setCargando(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [q, tipo]);

  const vacio =
    q.trim().length >= 2 &&
    !cargando &&
    !error &&
    personas.length === 0 &&
    publicaciones.length === 0 &&
    eventos.length === 0 &&
    anuncios.length === 0;

  return (
    <main>
      <EncabezadoPagina titulo="Buscar" entradilla="Personas, publicaciones, eventos y marketplace." />

      <div className="tarjeta">
        <label className="campo">
          <span>¿Qué buscas?</span>
          <input
            autoFocus
            placeholder="Nombre, publicación, evento, artículo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <div className="feed-canales" role="tablist" aria-label="Tipo de búsqueda">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="tab"
              aria-selected={tipo === t.valor}
              className={`feed-canal${tipo === t.valor ? ' activo' : ''}`}
              onClick={() => setTipo(t.valor)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {cargando && <p className="tenue">Buscando…</p>}

      {personas.length > 0 && (
        <>
          <h2>Personas</h2>
          <ul className="lista">
            {personas.map((p) => (
              <li key={p.handle}>
                <Link href={`/perfil/${p.handle}`} className="persona tarjeta-interactiva">
                  <Avatar nombre={p.nombre} semilla={p.handle} fotoUrl={p.fotoUrl} verificado={p.verificado} />
                  <span>
                    <span className="persona-nombre">{p.nombre}</span>
                    <br />
                    <span className="tenue">@{p.handle}{p.carrera ? ` · ${p.carrera}` : ''}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {publicaciones.length > 0 && (
        <>
          <h2>Publicaciones</h2>
          <ul className="lista">
            {publicaciones.map((p) => (
              <TarjetaPost key={p.id} post={normalizarPublicacion(p)} variante="compacta" />
            ))}
          </ul>
        </>
      )}

      {eventos.length > 0 && (
        <>
          <h2>Eventos</h2>
          <ul className="lista">
            {eventos.map((e) => (
              <li key={e.id} className="tarjeta">
                <strong>{e.titulo}</strong>
                <p className="tenue" style={{ margin: '4px 0 0' }}>
                  {e.lugar} · <TiempoRelativo fecha={e.inicioAt} />
                </p>
                <Link href={`/eventos/${e.id}`} className="pub-cuentas">Ver detalle →</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {anuncios.length > 0 && (
        <>
          <h2>Marketplace</h2>
          <ul className="lista">
            {anuncios.map((a) => (
              <li key={a.id} className="tarjeta">
                <strong>{a.titulo}</strong>
                <p className="tenue" style={{ margin: '4px 0 0' }}>
                  {a.precioMxn === 0 ? 'Gratis' : `$${a.precioMxn.toLocaleString('es-MX')}`}
                  {a.vendedor && (
                    <>
                      {' · '}
                      <Link href={`/perfil/${a.vendedor.handle}`}>{a.vendedor.nombre}</Link>
                    </>
                  )}
                </p>
                <Link href={`/marketplace/${a.id}`} className="pub-cuentas">Ver anuncio →</Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {vacio && (
        <EstadoVacio icono={Search} titulo="Sin resultados">
          Prueba con otras palabras o menos filtros.
        </EstadoVacio>
      )}
    </main>
  );
}
