import Link from 'next/link';
import { partirTextoSocial } from '@agora/shared';

export function TextoConMenciones({
  texto,
  className,
}: {
  texto: string;
  className?: string;
}) {
  const partes = partirTextoSocial(texto);

  return (
    <span className={className}>
      {partes.map((p, i) => {
        if (p.tipo === 'mencion') {
          return (
            <Link key={`@${p.handle}-${i}`} href={`/perfil/${p.handle}`} className="pub-autor">
              {p.valor}
            </Link>
          );
        }
        if (p.tipo === 'hashtag') {
          return (
            <Link
              key={`#${p.tag}-${i}`}
              href={`/hashtag/${encodeURIComponent(p.tag)}`}
              className="pub-autor"
            >
              {p.valor}
            </Link>
          );
        }
        return <span key={i}>{p.valor}</span>;
      })}
    </span>
  );
}
