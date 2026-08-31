import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

export function EstadoError({
  titulo = 'Algo salió mal',
  children,
  onReintentar,
  icono: Icono = AlertCircle,
}: {
  titulo?: string;
  children: React.ReactNode;
  onReintentar?: () => void;
  icono?: LucideIcon;
}) {
  return (
    <div className="vacio" role="alert">
      <span className="vacio-icono" aria-hidden="true">
        <Icono size={36} strokeWidth={1.5} />
      </span>
      <strong>{titulo}</strong>
      <p className="vacio-texto">{children}</p>
      {onReintentar && (
        <button type="button" className="vacio-cta" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
