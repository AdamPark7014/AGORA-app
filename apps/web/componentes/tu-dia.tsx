'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { track } from '@/lib/analytics';

const CLAVE = 'agora-tu-dia';

/**
 * Racha, retos, ranking y pregunta del dia plegados bajo el compositor: el
 * feed abre con publicaciones, no con ocho tarjetas. Los hijos solo se montan
 * abierto, asi que tampoco piden datos hasta que alguien los quiere ver.
 */
export function TuDia({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE) === '1') setAbierto(true);
    } catch {
      /* almacenamiento bloqueado: queda plegado */
    }
  }, []);

  function alternar(siguiente: boolean) {
    if (siguiente === abierto) return;
    setAbierto(siguiente);
    try {
      if (siguiente) localStorage.setItem(CLAVE, '1');
      else localStorage.removeItem(CLAVE);
    } catch {
      /* sin persistencia */
    }
    if (siguiente) track('tu_dia_abierto');
  }

  return (
    <details
      className="tarjeta tu-dia"
      open={abierto}
      onToggle={(e) => alternar(e.currentTarget.open)}
    >
      <summary>
        <span className="tu-dia-titulo">Tu día en Ágora</span>
        <span className="tu-dia-sub">Racha, retos y pregunta del día</span>
      </summary>
      {abierto && <div className="tu-dia-cuerpo">{children}</div>}
    </details>
  );
}
