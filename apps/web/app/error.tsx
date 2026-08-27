'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main>
      <div className="vacio">
        <span className="vacio-icono" aria-hidden="true">
          <AlertTriangle size={36} strokeWidth={1.5} />
        </span>
        <strong>Algo salió mal</strong>
        <p className="tenue">No pudimos cargar esta pantalla.</p>
        <button type="button" style={{ marginTop: 14 }} onClick={reset}>
          Reintentar
        </button>
      </div>
    </main>
  );
}
