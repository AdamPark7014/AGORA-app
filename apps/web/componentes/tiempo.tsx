'use client';

import { useEffect, useState } from 'react';

/**
 * Tiempo relativo en espanol.
 *
 * Se calcula en el cliente tras montar, no en el render inicial: el servidor y
 * el navegador no comparten reloj, y renderizar "hace 3 min" en ambos lados
 * provoca un desajuste de hidratacion. Hasta entonces se muestra la fecha.
 */
export function TiempoRelativo({ fecha }: { fecha: string }) {
  const [texto, setTexto] = useState<string | null>(null);

  useEffect(() => {
    const calcular = () => setTexto(relativo(new Date(fecha)));
    calcular();
    // Un minuto basta: nadie mira un "hace 12 s" contando segundos.
    const id = setInterval(calcular, 60_000);
    return () => clearInterval(id);
  }, [fecha]);

  return (
    <time dateTime={fecha} title={new Date(fecha).toLocaleString('es-MX')}>
      {texto ?? new Date(fecha).toLocaleDateString('es-MX')}
    </time>
  );
}

function relativo(fecha: Date): string {
  const segundos = Math.round((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) return 'ahora';
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  if (dias < 7) return `hace ${dias} d`;
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}
