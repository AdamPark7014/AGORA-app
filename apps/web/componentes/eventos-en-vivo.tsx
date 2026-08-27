'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { EventoEnVivo } from '@agora/contracts';

import { obtenerEventosEnVivo } from '@/lib/retos';

function badgeEvento(evento: EventoEnVivo): string {
  if (evento.enCurso) return '🔴 En vivo';
  const min = evento.empiezaEnMinutos;
  if (min <= 0) return '⚡ Ahorita';
  if (min < 60) return `⏱ En ${min} min`;
  return `📅 En ${Math.floor(min / 60)}h`;
}

export function EventosEnVivo() {
  const [eventos, setEventos] = useState<EventoEnVivo[]>([]);

  useEffect(() => {
    obtenerEventosEnVivo()
      .then((r) => setEventos(r.eventos))
      .catch(() => undefined);
  }, []);

  if (eventos.length === 0) return null;

  return (
    <div className="panel eventos-en-vivo">
      <p className="panel-titulo eventos-en-vivo-titulo">🔴 En vivo / pronto</p>
      <p className="tenue eventos-en-vivo-sub">
        Pasa por el campus antes de que se acabe el hype.
      </p>

      <div className="eventos-en-vivo-carril" role="list">
        {eventos.map((evento) => (
          <Link
            key={evento.id}
            href={`/eventos/${evento.id}`}
            className={`evento-en-vivo-tarjeta${evento.enCurso ? ' evento-en-vivo-tarjeta--curso' : ''}`}
            role="listitem"
          >
            <span
              className={`evento-en-vivo-badge${evento.enCurso ? ' evento-en-vivo-badge--curso' : ''}`}
            >
              {badgeEvento(evento)}
            </span>
            <span className="evento-en-vivo-nombre">{evento.titulo}</span>
            <span className="evento-en-vivo-meta">
              <span className="evento-en-vivo-lugar">📍 {evento.lugar}</span>
              {evento.vanAIr > 0 && (
                <span className="evento-en-vivo-asistentes">👋 {evento.vanAIr}</span>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
