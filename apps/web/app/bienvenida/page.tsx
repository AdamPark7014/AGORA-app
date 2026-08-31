'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CalendarDays, LayoutList, BadgeCheck } from 'lucide-react';

import { marcarWelcomeVisto } from '@/lib/welcome';

const PAGINAS = [
  {
    icono: LayoutList,
    titulo: 'Tu feed del campus',
    texto:
      'Descubre lo que pasa en la UDLAP: posts, encuestas y conversaciones de tu comunidad verificada.',
  },
  {
    icono: BadgeCheck,
    titulo: 'Comunidades verificadas',
    texto:
      'Carreras, colegios y grupos oficiales con badge verificado. Solo gente real de la UDLAP.',
  },
  {
    icono: CalendarDays,
    titulo: 'Eventos en vivo',
    texto: 'Fiestas, charlas, torneos y más. RSVP y no te pierdas nada del campus.',
  },
] as const;

export default function Bienvenida() {
  const router = useRouter();
  const [pagina, setPagina] = useState(0);
  const actual = PAGINAS[pagina]!;
  const ultima = pagina === PAGINAS.length - 1;
  const Icono = actual.icono;

  function terminar() {
    marcarWelcomeVisto();
    router.replace('/feed');
  }

  return (
    <main className="welcome">
      <div className="welcome-tope">
        <button type="button" className="fantasma" onClick={terminar}>
          Saltar
        </button>
      </div>

      <div className="welcome-cuerpo">
        <span className="welcome-icono" aria-hidden="true">
          <Icono size={40} strokeWidth={1.5} />
        </span>
        <h1>{actual.titulo}</h1>
        <p className="entradilla">{actual.texto}</p>
      </div>

      <div className="welcome-puntos" role="tablist" aria-label="Progreso de bienvenida">
        {PAGINAS.map((p, i) => (
          <button
            key={p.titulo}
            type="button"
            role="tab"
            aria-selected={i === pagina}
            aria-label={`Página ${i + 1}`}
            className={`welcome-punto${i === pagina ? ' activo' : ''}`}
            onClick={() => setPagina(i)}
          />
        ))}
      </div>

      <button
        type="button"
        className="grande"
        onClick={() => {
          if (ultima) terminar();
          else setPagina((p) => p + 1);
        }}
      >
        {ultima ? 'Entrar al Ágora' : 'Siguiente'}
      </button>
    </main>
  );
}
