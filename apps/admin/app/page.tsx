'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Guardia } from '@/componentes/guardia';

interface Resumen {
  pendientes: number;
  resueltos24h: number;
  enRevision: number;
  suspendidos: number;
  automaticas24h: number;
}

export default function Panel() {
  return (
    <Guardia>
      <PanelInterno />
    </Guardia>
  );
}

function PanelInterno() {
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Resumen>('/moderacion/resumen')
      .then(setR)
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar.'));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!r) return <p className="tenue">Cargando…</p>;

  return (
    <main>
      <h1>Resumen</h1>
      <p className="entradilla">Estado de la moderación en las últimas 24 horas.</p>

      <div className="metricas">
        <div className={r.pendientes > 0 ? 'metrica urgente' : 'metrica bien'}>
          <div className="metrica-valor">{r.pendientes}</div>
          <div className="metrica-etiqueta">Reportes pendientes</div>
        </div>
        <div className={r.enRevision > 0 ? 'metrica urgente' : 'metrica bien'}>
          <div className="metrica-valor">{r.enRevision}</div>
          <div className="metrica-etiqueta">Marcado por IA sin revisar</div>
        </div>
        <div className="metrica">
          <div className="metrica-valor">{r.resueltos24h}</div>
          <div className="metrica-etiqueta">Resueltos en 24 h</div>
        </div>
        <div className="metrica">
          <div className="metrica-valor">{r.automaticas24h}</div>
          <div className="metrica-etiqueta">Acciones automáticas 24 h</div>
        </div>
        <div className="metrica">
          <div className="metrica-valor">{r.suspendidos}</div>
          <div className="metrica-etiqueta">Cuentas suspendidas</div>
        </div>
      </div>

      {r.pendientes === 0 && r.enRevision === 0 ? (
        <div className="vacio">
          <strong>Todo al día</strong>
          No hay nada esperando decisión humana.
        </div>
      ) : (
        <p>
          Hay trabajo: <Link href="/cola">ver la cola</Link>
          {r.enRevision > 0 && (
            <>
              {' '}
              o <Link href="/marcado">lo que marcó la IA</Link>
            </>
          )}
          .
        </p>
      )}
    </main>
  );
}
