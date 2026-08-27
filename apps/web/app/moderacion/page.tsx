'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { api, ErrorApi } from '@/lib/api';
import { sesion } from '@/lib/sesion';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { TiempoRelativo } from '@/componentes/tiempo';
import { ShieldCheck } from 'lucide-react';

interface Caso {
  reporteId: string;
  numReportes: number;
  motivos: string[];
  detalles: (string | null)[];
  creadoAt: string;
  tipo: 'POST' | 'COMENTARIO';
  contenidoId: string | null;
  postDeComentario: string | null;
  texto: string;
  comunidad: string | null;
  eraAnonimo: boolean;
  autor: { handle: string; nombre: string; suspendido: boolean } | null;
}

const ETIQUETA_MOTIVO: Record<string, string> = {
  INTIMIDAD_SEXUAL: 'Intimidad sexual',
  DATOS_PERSONALES: 'Datos personales',
  AMENAZA_VIOLENCIA: 'Amenaza de violencia',
  ACOSO_DIRIGIDO: 'Acoso dirigido',
  SUPLANTACION: 'Suplantación',
  OTRO: 'Otro',
};

export default function Moderacion() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [permitido, setPermitido] = useState<boolean | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const yo = await sesion();
      if (!yo.puedeModerar) {
        setPermitido(false);
        return;
      }
      setPermitido(true);
      const datos = await api<{ items: Caso[] }>('/moderacion/cola');
      setCasos(datos.items);
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 401) setPermitido(false);
      else setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la cola.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function resolver(reporteId: string, accion: string) {
    const motivo = (motivos[reporteId] ?? '').trim();
    if (motivo.length < 3) {
      setError('Escribe el motivo antes de actuar.');
      return;
    }
    setTrabajando(reporteId);
    setError(null);
    try {
      await api(`/moderacion/reportes/${reporteId}/resolver`, {
        method: 'POST',
        body: JSON.stringify({ accion, motivo }),
      });
      setCasos((previos) => previos.filter((c) => c.reporteId !== reporteId));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo resolver.');
    } finally {
      setTrabajando(null);
    }
  }

  function enlaceContenido(c: Caso) {
    if (c.tipo === 'POST' && c.contenidoId) return `/publicacion/${c.contenidoId}`;
    if (c.tipo === 'COMENTARIO' && c.postDeComentario) return `/publicacion/${c.postDeComentario}`;
    return null;
  }

  if (permitido === false) {
    return (
      <main>
        <EncabezadoPagina titulo="Moderación" entradilla="Solo el equipo de Ágora entra aquí." />
        <p className="error">No tienes permiso para moderar.</p>
      </main>
    );
  }

  return (
    <main>
      <EncabezadoPagina
        titulo="Cola de reportes"
        entradilla="Tú decides qué se queda y qué se va. Todo queda registrado."
      />

      {error && <p className="error">{error}</p>}

      {cargando && (
        <div className="tarjeta" aria-hidden="true">
          <div className="esqueleto" style={{ width: '55%' }} />
          <div className="esqueleto" style={{ width: '80%' }} />
        </div>
      )}

      {!cargando && casos.length === 0 && !error && (
        <EstadoVacio icono={ShieldCheck} titulo="Cola vacía">
          El campus está tranquilo.
        </EstadoVacio>
      )}

      <ul className="lista">
        {casos.map((c) => {
          const enlace = enlaceContenido(c);
          return (
            <li key={c.reporteId} className="tarjeta">
              <div className="pub-meta" style={{ marginBottom: 8 }}>
                <span className="etiqueta naranja">{c.tipo === 'POST' ? 'Publicación' : 'Comentario'}</span>
                <span className="etiqueta">{c.numReportes} reportes</span>
                {c.comunidad && <span className="etiqueta">{c.comunidad}</span>}
                {c.eraAnonimo && <span className="etiqueta aqua">Sin nombre</span>}
                <TiempoRelativo fecha={c.creadoAt} />
                {c.autor && (
                  <Link href={`/perfil/${c.autor.handle}`} className="pub-autor">
                    {c.autor.nombre}
                    {c.autor.suspendido ? ' (suspendido)' : ''}
                  </Link>
                )}
              </div>
              <p className="pub-texto">{c.texto}</p>
              {enlace && (
                <p style={{ margin: '0 0 12px' }}>
                  <Link href={enlace} className="pub-cuentas">
                    Ver en contexto →
                  </Link>
                </p>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {c.motivos.map((m) => (
                  <span key={m} className="etiqueta">
                    {ETIQUETA_MOTIVO[m] ?? m}
                  </span>
                ))}
              </div>
              <label className="campo">
                <span>Motivo (lo verá el autor si retiras)</span>
                <input
                  value={motivos[c.reporteId] ?? ''}
                  onChange={(e) =>
                    setMotivos((previos) => ({ ...previos, [c.reporteId]: e.target.value }))
                  }
                />
              </label>
              <div className="acciones" style={{ marginTop: 12 }}>
                <button
                  type="button"
                  className="secundario"
                  disabled={trabajando === c.reporteId}
                  onClick={() => resolver(c.reporteId, 'SIN_ACCION')}
                >
                  Dejarlo
                </button>
                <button
                  type="button"
                  className="fantasma"
                  disabled={trabajando === c.reporteId}
                  onClick={() => resolver(c.reporteId, 'RETIRAR_CONTENIDO')}
                >
                  Retirar
                </button>
                <button
                  type="button"
                  disabled={trabajando === c.reporteId}
                  onClick={() => resolver(c.reporteId, 'SUSPENDER_USUARIO')}
                >
                  Suspender autor
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
