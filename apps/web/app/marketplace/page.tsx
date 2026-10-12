'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { LayoutGrid, MessageCircle, Plus, X } from '@/componentes/iconos';

interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  precioMxn: number;
  estadoVenta: string;
  createdAt: string;
  imagenes: string[];
  vendedor: { handle: string; nombre: string; fotoUrl: string | null } | null;
  esMio: boolean;
}

const CATEGORIAS = [
  { valor: 'LIBROS', etiqueta: 'Libros' },
  { valor: 'ELECTRONICA', etiqueta: 'Electrónica' },
  { valor: 'MUEBLES', etiqueta: 'Muebles' },
  { valor: 'ROPA', etiqueta: 'Ropa' },
  { valor: 'CUARTO', etiqueta: 'Cuarto' },
  { valor: 'SERVICIOS', etiqueta: 'Servicios' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

export default function Marketplace() {
  const router = useRouter();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [categoria, setCategoria] = useState('');
  const [q, setQ] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const [nuevo, setNuevo] = useState({
    titulo: '',
    descripcion: '',
    categoria: 'LIBROS',
    precioMxn: '',
  });
  const [imagenes, setImagenes] = useState<Array<{ id: string; url: string }>>([]);

  const cargar = useCallback(async (cat: string, texto: string, desde?: string) => {
    if (desde) setCargandoMas(true);
    else {
      setCargando(true);
      setError(null);
    }
    const p = new URLSearchParams();
    if (cat) p.set('categoria', cat);
    if (texto.trim()) p.set('q', texto.trim());
    if (desde) p.set('cursor', desde);
    try {
      const datos = await api<{ anuncios: Anuncio[]; siguienteCursor: string | null }>(
        `/anuncios?${p}`,
      );
      setAnuncios((prev) => (desde ? [...prev, ...datos.anuncios] : datos.anuncios));
      setCursor(datos.siguienteCursor ?? null);
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 401
          ? 'Necesitas iniciar sesión.'
          : 'No se pudo cargar el marketplace.',
      );
    } finally {
      setCargando(false);
      setCargandoMas(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void cargar(categoria, q), 250);
    return () => clearTimeout(t);
  }, [categoria, q, cargar]);

  /**
   * La imagen se sube al elegirla, no al enviar el formulario. Así el usuario
   * ve la miniatura mientras escribe y sabe que sí quedó.
   */
  async function subirImagen(archivo: File) {
    if (imagenes.length >= 6) {
      setError('Máximo 6 imágenes.');
      return;
    }
    setSubiendo(true);
    setError(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append('archivo', archivo);
      const respuesta = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: cuerpo,
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos?.message ?? 'Falló la subida.');
      setImagenes((previas) => [...previas, datos]);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await api('/anuncios', {
        method: 'POST',
        body: JSON.stringify({
          titulo: nuevo.titulo,
          descripcion: nuevo.descripcion,
          categoria: nuevo.categoria,
          precioMxn: Number(nuevo.precioMxn || 0),
          imagenIds: imagenes.map((i) => i.id),
        }),
      });
      setNuevo({ titulo: '', descripcion: '', categoria: 'LIBROS', precioMxn: '' });
      setImagenes([]);
      setAbierto(false);
      await cargar(categoria, q);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  async function escribir(handle: string) {
    try {
      const { id } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle }),
      });
      router.push(`/mensajes/${id}`);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.');
    }
  }

  async function marcar(id: string, estadoVenta: string) {
    try {
      await api(`/anuncios/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estadoVenta }),
      });
      await cargar(categoria, q);
    } catch {
      setError('No se pudo actualizar.');
    }
  }

  return (
    <main>
      <EncabezadoPagina
        titulo="Marketplace"
        entradilla="Compra y vende dentro de la UDLAP. Todos con nombre y cara."
        acciones={
          <button type="button" onClick={() => setAbierto((v) => !v)}>
            {abierto ? (
              <>
                <X size={18} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -3 }} />
                Cancelar
              </>
            ) : (
              <>
                <Plus size={18} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -3 }} />
                Vender algo
              </>
            )}
          </button>
        }
      />

      <p className="tenue" style={{ margin: '0 0 12px', fontSize: '0.8rem' }}>
        Entrega y paga en persona dentro del campus; no adelantes dinero.{' '}
        <Link href="/reglas">Consejos de seguridad</Link>
      </p>

      <div className="acciones" style={{ marginBottom: 16 }}>
        <select
          className="selector-pastilla"
          aria-label="Categoría"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Todo</option>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.etiqueta}
            </option>
          ))}
        </select>
      </div>

      <div className="tarjeta" style={{ marginBottom: 18 }}>
        <label className="campo" style={{ marginBottom: 0 }}>
          <span>Buscar</span>
          <input
            placeholder="Libro de cálculo, monitor, bici…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      {abierto && (
        <form className="tarjeta" style={{ marginBottom: 20 }} onSubmit={publicar}>
          <label className="campo">
            <span>¿Qué vendes?</span>
            <input
              required
              maxLength={120}
              placeholder="Cálculo de Stewart 8va edición"
              value={nuevo.titulo}
              onChange={(e) => setNuevo((p) => ({ ...p, titulo: e.target.value }))}
            />
          </label>

          <label className="campo">
            <span>Descripción</span>
            <textarea
              required
              rows={3}
              maxLength={2000}
              placeholder="Casi nuevo, subrayado a lápiz. Lo entrego en el campus."
              value={nuevo.descripcion}
              onChange={(e) => setNuevo((p) => ({ ...p, descripcion: e.target.value }))}
            />
          </label>

          <div className="filtros">
            <label className="campo">
              <span>Categoría</span>
              <select
                value={nuevo.categoria}
                onChange={(e) => setNuevo((p) => ({ ...p, categoria: e.target.value }))}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>
                    {c.etiqueta}
                  </option>
                ))}
              </select>
            </label>
            <label className="campo">
              <span>Precio en pesos</span>
              <input
                type="number"
                min={0}
                required
                placeholder="350"
                value={nuevo.precioMxn}
                onChange={(e) => setNuevo((p) => ({ ...p, precioMxn: e.target.value }))}
              />
            </label>
          </div>

          <label className="campo">
            <span>Fotos (hasta 6)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={subiendo || imagenes.length >= 6}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subirImagen(f);
                e.target.value = '';
              }}
            />
          </label>

          {imagenes.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {imagenes.map((img) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img.id}
                  src={img.url}
                  alt=""
                  style={{
                    width: 74,
                    height: 74,
                    objectFit: 'cover',
                    borderRadius: 'var(--radio-chico)',
                    border: '1px solid var(--borde)',
                  }}
                />
              ))}
            </div>
          )}

          {subiendo && <p className="tenue">Subiendo imagen…</p>}

          <button type="submit" className="grande" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Publicar anuncio'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}

      {error && !abierto && <p className="error">{error}</p>}

      {!cargando && anuncios.length === 0 && !error && (
        <EstadoVacio icono={LayoutGrid} titulo="Nadie vende nada todavía">
          ¿Tienes libros del semestre pasado? Sé el primero en publicar.
        </EstadoVacio>
      )}

      <ul className="grid-marketplace">
        {anuncios.map((a) => (
          <li key={a.id} className="tarjeta tarjeta-producto tarjeta-interactiva">
            <Link href={`/marketplace/${a.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              {a.imagenes[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="tarjeta-producto-imagen" src={a.imagenes[0]} alt="" loading="lazy" />
              ) : (
                <div className="tarjeta-producto-imagen" aria-hidden="true" style={{ display: 'grid', placeItems: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--texto-tenue)' }}>
                  {CATEGORIAS.find((c) => c.valor === a.categoria)?.etiqueta ?? 'Otro'}
                </div>
              )}

              <div className="tarjeta-producto-cuerpo">
                <strong style={{ fontSize: '0.95rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {a.titulo}
                </strong>
                <span className="tarjeta-producto-precio">
                  {a.precioMxn === 0 ? 'Gratis' : `$${a.precioMxn.toLocaleString('es-MX')}`}
                </span>
              </div>
            </Link>

            <div className="tarjeta-producto-cuerpo" style={{ paddingTop: 0 }}>
              {a.estadoVenta === 'APARTADO' && (
                <span className="etiqueta oro">Apartado</span>
              )}
              {a.vendedor && (
                <span className="tenue" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
                  <Avatar
                    nombre={a.vendedor.nombre}
                    semilla={a.vendedor.handle}
                    fotoUrl={a.vendedor.fotoUrl}
                    tamano="chico"
                  />
                  <Link href={`/perfil/${a.vendedor.handle}`}>{a.vendedor.nombre}</Link>
                </span>
              )}
              <div className="pub-pie" style={{ marginTop: 'auto', paddingTop: 8, borderTop: 'none' }}>
                {a.esMio ? (
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="reaccion"
                      onClick={() =>
                        marcar(a.id, a.estadoVenta === 'APARTADO' ? 'DISPONIBLE' : 'APARTADO')
                      }
                    >
                      {a.estadoVenta === 'APARTADO' ? 'Liberar' : 'Apartar'}
                    </button>
                    <button type="button" className="reaccion" onClick={() => marcar(a.id, 'VENDIDO')}>
                      Vendido
                    </button>
                  </span>
                ) : (
                  a.vendedor && (
                    <button
                      type="button"
                      className="reaccion"
                      style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => escribir(a.vendedor!.handle)}
                    >
                      <MessageCircle size={14} strokeWidth={1.75} aria-hidden="true" />
                      Mensaje al vendedor
                    </button>
                  )
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {cursor && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button
            type="button"
            className="secundario"
            disabled={cargandoMas}
            onClick={() => void cargar(categoria, q, cursor)}
          >
            {cargandoMas ? 'Cargando…' : 'Cargar más'}
          </button>
        </div>
      )}
    </main>
  );
}
