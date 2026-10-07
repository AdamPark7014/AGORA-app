'use client';

import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { usePolling } from '@/lib/use-polling';
import { Guardia } from '@/componentes/guardia';

interface Caso {
  reporteId: string;
  numReportes: number;
  motivos: string[];
  detalles: (string | null)[];
  creadoAt: string;
  tipo: 'POST' | 'COMENTARIO';
  contenidoId: string | null;
  texto: string;
  estadoContenido: string | null;
  comunidad: string | null;
  eraAnonimo: boolean;
  autor: { id: string; handle: string; nombre: string; suspendido: boolean } | null;
}

/** Motivos que la política marca como línea roja: van primero y en rojo. */
const LINEAS_ROJAS = new Set([
  'INTIMIDAD_SEXUAL',
  'AMENAZA_VIOLENCIA',
  'DATOS_PERSONALES',
  'SUPLANTACION',
]);

const ETIQUETA_MOTIVO: Record<string, string> = {
  INTIMIDAD_SEXUAL: 'Intimidad sexual',
  DATOS_PERSONALES: 'Datos personales',
  AMENAZA_VIOLENCIA: 'Amenaza de violencia',
  ACOSO_DIRIGIDO: 'Acoso dirigido',
  SUPLANTACION: 'Suplantación',
  OTRO: 'Otro',
};

export default function Cola() {
  return (
    <Guardia>
      <ColaInterna />
    </Guardia>
  );
}

function ColaInterna() {
  const [casos, setCasos] = useState<Caso[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [puedeSuspender, setPuedeSuspender] = useState(false);

  useEffect(() => {
    api<{ puedeSuspender?: boolean }>('/auth/yo')
      .then((yo) => setPuedeSuspender(Boolean(yo.puedeSuspender)))
      .catch(() => setPuedeSuspender(false));
  }, []);

  const cargar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCargando(true);
    setError(null);
    try {
      const datos = await api<{ items: Caso[] }>('/moderacion/cola');
      setCasos(datos.items);
    } catch (e) {
      if (!silencioso) {
        setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar la cola.');
      }
    } finally {
      if (!silencioso) setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  usePolling(() => cargar(true), 20_000);

  async function resolver(reporteId: string, accion: string) {
    const motivo = (motivos[reporteId] ?? '').trim();
    if (motivo.length < 3) {
      setError('Escribe el motivo antes de actuar. El usuario tiene derecho a saber por qué.');
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

  return (
    <main>
      <h1>Cola de reportes</h1>
      <p className="entradilla">
        Lo más denunciado primero. Todo lo que hagas queda registrado con tu
        nombre y el motivo que escribas.
      </p>

      {error && <p className="error">{error}</p>}

      {cargando && <p className="tenue">Cargando…</p>}

      {!cargando && casos.length === 0 && !error && (
        <div className="vacio">
          <strong>Cola vacía</strong>
          No hay nada pendiente de revisar. Buen momento para dejar el panel.
        </div>
      )}

      {casos.map((c) => {
        const grave = c.motivos.some((m) => LINEAS_ROJAS.has(m));
        return (
          <article key={c.reporteId} className={grave ? 'caso grave' : 'caso'}>
            <div className="caso-cabeza">
              <span className="chapa">{c.tipo === 'POST' ? 'Publicación' : 'Comentario'}</span>
              <span className={c.numReportes > 2 ? 'chapa roja' : 'chapa'}>
                {c.numReportes} {c.numReportes === 1 ? 'reporte' : 'reportes'}
              </span>
              {c.eraAnonimo && <span className="chapa ambar">Sin nombre</span>}
              {c.autor && (
                <span className="tenue">
                  de <strong>{c.autor.nombre}</strong> @{c.autor.handle}
                  {c.autor.suspendido && ' · ya suspendido'}
                </span>
              )}
              <span className="tenue" style={{ marginLeft: 'auto' }}>
                {new Date(c.creadoAt).toLocaleString('es-MX')}
              </span>
            </div>

            <div className="motivos">
              {c.motivos.map((m) => (
                <span key={m} className={LINEAS_ROJAS.has(m) ? 'chapa roja' : 'chapa ambar'}>
                  {ETIQUETA_MOTIVO[m] ?? m}
                </span>
              ))}
              {c.comunidad && <span className="chapa">{c.comunidad}</span>}
            </div>

            <div className="contenido">{c.texto}</div>

            {c.eraAnonimo && (
              <p className="tenue" style={{ margin: '0 0 4px' }}>
                Se publicó sin nombre. Quien lo escribió no lo sabe, pero tú sí:
                úsalo para decidir, no para señalar a nadie fuera de aquí.
              </p>
            )}

            {c.detalles.filter(Boolean).length > 0 && (
              <div className="tenue">
                <strong>Lo que dijo quien reportó:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {c.detalles.filter(Boolean).map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="acciones">
              <input
                className="motivo-campo"
                placeholder="Motivo (lo verá el autor)"
                value={motivos[c.reporteId] ?? ''}
                onChange={(e) =>
                  setMotivos((previos) => ({ ...previos, [c.reporteId]: e.target.value }))
                }
              />

              <button
                type="button"
                className="dejar"
                disabled={trabajando === c.reporteId}
                onClick={() => resolver(c.reporteId, 'SIN_ACCION')}
              >
                Dejarlo
              </button>
              <button
                type="button"
                className="retirar"
                disabled={trabajando === c.reporteId}
                onClick={() => resolver(c.reporteId, 'RETIRAR_CONTENIDO')}
              >
                Retirar
              </button>
              {puedeSuspender && (
                <button
                  type="button"
                  className="suspender"
                  disabled={trabajando === c.reporteId}
                  onClick={() => resolver(c.reporteId, 'SUSPENDER_USUARIO')}
                >
                  Suspender autor
                </button>
              )}
            </div>
          </article>
        );
      })}
    </main>
  );
}
