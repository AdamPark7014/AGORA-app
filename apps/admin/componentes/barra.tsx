'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const PESTANAS = [
  { href: '/', texto: 'Resumen' },
  { href: '/cola', texto: 'Cola' },
  { href: '/marcado', texto: 'Marcado por IA' },
  { href: '/historial', texto: 'Historial' },
] as const;

export function Barra() {
  const ruta = usePathname();

  return (
    <header className="barra">
      <Link href="/" className="marca">
        <span className="marca-punto">Á</span>
        Moderación
      </Link>

      <nav className="pestanas">
        {PESTANAS.map((p) => (
          <Link key={p.href} href={p.href} className="pestana" aria-current={ruta === p.href ? 'page' : undefined}>
            {p.texto}
          </Link>
        ))}
      </nav>

      <a
        href={process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3200'}
        className="pestana"
        style={{ marginLeft: 'auto' }}
      >
        ← Volver a Ágora
      </a>
    </header>
  );
}
