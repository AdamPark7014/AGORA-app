import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function NoEncontrado() {
  return (
    <main>
      <div className="vacio">
        <span className="vacio-icono" aria-hidden="true">
          <MapPin size={36} strokeWidth={1.5} />
        </span>
        <strong>Página no encontrada</strong>
        <p className="tenue">Esa ruta no existe en Ágora.</p>
        <Link href="/feed" className="vacio-cta">
          Ir al feed
        </Link>
      </div>
    </main>
  );
}
