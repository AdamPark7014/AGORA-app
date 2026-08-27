'use client';

import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

const CLAVE_DESCARTADO = 'campusTipDismissed';

const TIPS = [
  'Tip: La biblioteca cierra tarde los jueves — aprovecha para estudiar en silencio.',
  'Tip: Doble tap en una foto = 🧡 Me late',
  'Tip: Responde la pregunta del día 7 veces y ganas insignia',
  'Tip: Filtra por tu carrera en el feed para ver lo más relevante.',
  'Tip: Mantén tu racha activa entrando un ratito cada día.',
  'Tip: Los jueves hay más movimiento en el feed — buen momento para publicar.',
  'Tip: Desliza en Trending para descubrir hashtags del campus.',
  'Tip: Saluda a quien cumple años hoy — aparecen arriba en el feed.',
  'Tip: Guarda posts útiles con el bookmark para encontrarlos después.',
  'Tip: Usa # para conectar tu publicación con el resto del campus.',
  'Tip: El Centro Estudiantil tiene WiFi estable si tu señal falla.',
  'Tip: Toca aquí para otro tip del campus 👆',
] as const;

function indiceAleatorio(excluir?: number): number {
  if (TIPS.length <= 1) return 0;
  let next = Math.floor(Math.random() * TIPS.length);
  while (next === excluir) {
    next = Math.floor(Math.random() * TIPS.length);
  }
  return next;
}

export function CampusTip() {
  const [descartado, setDescartado] = useState(true);
  const [indice, setIndice] = useState(0);
  const [pulso, setPulso] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(CLAVE_DESCARTADO) === 'true') return;
    setDescartado(false);
    setIndice(indiceAleatorio());
  }, []);

  function rotarTip() {
    setIndice((prev) => indiceAleatorio(prev));
    setPulso(true);
    window.setTimeout(() => setPulso(false), 350);
  }

  function cerrar(evento: React.MouseEvent) {
    evento.stopPropagation();
    localStorage.setItem(CLAVE_DESCARTADO, 'true');
    setDescartado(true);
  }

  if (descartado) return null;

  return (
    <div
      className={`campus-tip${pulso ? ' campus-tip-pulso' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Tip del campus. Toca para ver otro."
      onClick={rotarTip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          rotarTip();
        }
      }}
    >
      <span className="campus-tip-emoji" aria-hidden="true">
        💡
      </span>
      <p className="campus-tip-texto">{TIPS[indice]}</p>
      <button
        type="button"
        className="campus-tip-cerrar"
        aria-label="Cerrar tip"
        onClick={cerrar}
      >
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}
