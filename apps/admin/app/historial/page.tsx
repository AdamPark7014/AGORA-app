'use client';

import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Guardia } from '@/componentes/guardia';

interface Accion {
  id: string;
  accion: string;
  motivo: string;
  automatica: boolean;
  createdAt: string;
  moderador: string | null;
}

export default function PaginaHistorial() {
  return (
    <Guardia>
      <HistorialInterno />
    </Guardia>
  );
}

function HistorialInterno() {
  const [acciones, setAcciones] = useState<Accion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ acciones: Accion[] }>('/moderacion/historial')
      .then((d) => setAcciones(d.acciones))
      .catch((e) => setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar.'));
  }, []);

  const esDura = (accion: string) =>
    accion.includes('RETIRAR') || accion.includes('SUSPENDER');

  return (
    <main>
      <h1>Historial</h1>
      <p className="entradilla">
        Toda acción de moderación queda aquí, con su autor y su motivo. Es lo
        que hace posible apelar.
      </p>

      {error && <p className="error">{error}</p>}

      {acciones.length === 0 && !error ? (
        <div className="vacio">
          <strong>Sin acciones todavía</strong>
          Nadie ha moderado nada aún.
        </div>
      ) : (
        <table className="registro">
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Acción</th>
              <th>Quién</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {acciones.map((a) => (
              <tr key={a.id}>
                <td className="tenue" style={{ whiteSpace: 'nowrap' }}>
                  {new Date(a.createdAt).toLocaleString('es-MX')}
                </td>
                <td>
                  <span className={esDura(a.accion) ? 'chapa roja' : 'chapa'}>
                    {a.accion.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </td>
                <td>
                  {a.automatica ? (
                    <span className="chapa ambar">IA</span>
                  ) : (
                    `@${a.moderador ?? '?'}`
                  )}
                </td>
                <td>{a.motivo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
