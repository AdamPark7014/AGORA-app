'use client';

import { useState } from 'react';

/**
 * Video de una publicacion o un anuncio. La portada es la que guarda la API
 * (`thumbUrl`); `playsInline` evita que el iPhone lo abra a pantalla completa.
 *
 * Un video recien subido desde un iPhone puede seguir en HEVC unos segundos,
 * mientras el servidor lo pasa a H.264; Chrome y Firefox no lo reproducen. En
 * vez de un cuadro negro se dice que se esta preparando y se deja abrirlo.
 */
export function VideoAdjunto({
  url,
  portada,
  className,
}: {
  url: string;
  portada?: string | null;
  className?: string;
}) {
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <div className={`video-no-disponible ${className ?? ''}`} role="note">
        <p>Este video se está preparando para verse en el navegador.</p>
        <a href={url} target="_blank" rel="noreferrer">
          Abrirlo aparte
        </a>
      </div>
    );
  }

  return (
    // Los suben estudiantes sin subtitulos; no hay pista que poner.
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      className={className}
      src={url}
      poster={portada ?? undefined}
      controls
      playsInline
      preload="metadata"
      onError={() => setFallo(true)}
    />
  );
}
