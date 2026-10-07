import Link from 'next/link';

import type { TarjetaPublica } from '@/lib/tarjeta-publica';
import { Isotipo } from './isotipo';

/** Preview mínima para anónimos / crawlers; CTA a login. */
export function PreviewPublica({
  tarjeta,
  siguiente,
}: {
  tarjeta: TarjetaPublica;
  siguiente: string;
}) {
  const loginHref = `/?siguiente=${encodeURIComponent(siguiente)}`;

  return (
    <main className="landing preview-publica">
      <div className="landing-hero">
        <Isotipo className="marca-punto landing-marca" />
        <p className="landing-marca-nombre">Ágora</p>
        <h1>{tarjeta.titulo}</h1>
        <p className="entradilla">{tarjeta.descripcion}</p>
        {tarjeta.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tarjeta.imagen}
            alt=""
            className="preview-publica-img"
            width={600}
            height={315}
          />
        ) : null}
      </div>
      <p className="tenue" style={{ textAlign: 'center', marginBottom: 16 }}>
        Contenido de la red verificada UDLAP. Entra con tu correo @udlap.mx para verlo completo.
      </p>
      <div style={{ textAlign: 'center' }}>
        <Link href={loginHref} className="grande" style={{ display: 'inline-block' }}>
          Entrar con @udlap.mx
        </Link>
      </div>
    </main>
  );
}
