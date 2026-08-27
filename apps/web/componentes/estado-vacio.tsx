import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

type AccionVacio =
  | { etiqueta: string; onClick: () => void; href?: never }
  | { etiqueta: string; href: string; onClick?: never };

export function EstadoVacio({
  icono: Icono,
  titulo,
  children,
  accion,
}: {
  icono: LucideIcon;
  titulo: string;
  children: React.ReactNode;
  accion?: AccionVacio;
}) {
  return (
    <div className="vacio">
      <span className="vacio-icono" aria-hidden="true">
        <Icono size={36} strokeWidth={1.5} />
      </span>
      <strong>{titulo}</strong>
      <p className="vacio-texto">{children}</p>
      {accion &&
        (accion.href ? (
          <Link href={accion.href} className="enlace-boton vacio-cta">
            {accion.etiqueta}
          </Link>
        ) : (
          <button type="button" className="vacio-cta" onClick={accion.onClick}>
            {accion.etiqueta}
          </button>
        ))}
    </div>
  );
}
