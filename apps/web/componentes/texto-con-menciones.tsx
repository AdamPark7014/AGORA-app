import Link from 'next/link';
import { partirTextoSocial } from '@agora/shared';

/**
 * Texto con @menciones y #hashtags enlazados, en línea y en su lugar.
 *
 * Usaba `pub-autor`, que es la clase del nombre del autor (bloque, una línea,
 * con "…"): cada hashtag saltaba a su propia línea y, con `pre-wrap`, el
 * espacio entre dos hashtags se volvía un renglón en blanco.
 */
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
            <Link key={`@${p.handle}-${i}`} href={`/perfil/${p.handle}`} className="texto-enlace">
              {p.valor}
            </Link>
          );
        }
        if (p.tipo === 'hashtag') {
          return (
            <Link
              key={`#${p.tag}-${i}`}
              href={`/hashtag/${encodeURIComponent(p.tag)}`}
              className="texto-enlace"
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
