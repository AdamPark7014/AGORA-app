'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

export function Lightbox({
  url,
  esVideo,
  onCerrar,
}: {
  url: string;
  esVideo?: boolean;
  onCerrar: () => void;
}) {
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCerrar();
    };
    window.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.body.style.overflow = anterior;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [onCerrar]);

  return (
    <div
      className="lightbox-fondo"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada"
      onClick={onCerrar}
    >
      <button type="button" className="lightbox-cerrar" aria-label="Cerrar" onClick={onCerrar}>
        <X size={22} strokeWidth={1.75} />
      </button>
      <div className="lightbox-contenido" onClick={(e) => e.stopPropagation()}>
        {esVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={url} controls autoPlay />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" />
        )}
      </div>
    </div>
  );
}
