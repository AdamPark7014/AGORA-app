'use client';

import { usePathname } from 'next/navigation';

/**
 * Fade suave al cambiar de ruta. Sin librerías: solo una clase que se
 * reinicia cuando cambia el pathname.
 */
export function TransicionPagina({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();

  return (
    <div key={ruta} className="pagina-entrante">
      {children}
    </div>
  );
}
