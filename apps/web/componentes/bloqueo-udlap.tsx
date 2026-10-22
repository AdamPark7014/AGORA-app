'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { api } from '@/lib/api';
import { copy } from '@/lib/copy';
import { olvidarSesion, useSesion } from '@/lib/sesion';
import { ConfirmarUdlap } from './confirmar-udlap';
import { Isotipo } from './isotipo';

/**
 * Pasaron los 30 días sin confirmar la UDLAP: la API responde 403 en todo lo
 * que no sea `/auth/*` ni `/cuenta/*`. La sesión es buena (no es un 401), así
 * que no se borra: en lugar del contenido se pinta esta pantalla, con el
 * código al buzón UDLAP y la salida.
 *
 * Mientras `/auth/yo` no contesta se pinta el contenido normal, para no hacer
 * esperar a todos por el caso raro.
 */
export function BloqueoUdlap({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { yo } = useSesion();
  const [liberado, setLiberado] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  if (!yo?.udlapVencida || liberado) return <>{children}</>;

  const textos = copy.login.udlap;

  async function salir() {
    setSaliendo(true);
    try {
      await api('/auth/salir', { method: 'POST' });
    } finally {
      olvidarSesion();
      router.push('/');
    }
  }

  return (
    <div className="pagina-centrada">
      <main className="landing bloqueo-udlap">
        <ConfirmarUdlap
          email={yo.email}
          variante="pantalla"
          onListo={() => setLiberado(true)}
          encabezado={
            <div className="landing-hero">
              <Isotipo className="marca-punto landing-marca" />
              <h1>{textos.bloqueo.titulo}</h1>
              <p className="entradilla">{textos.bloqueo.texto}</p>
              <p className="tenue">{textos.confirmar.texto(yo.email)}</p>
            </div>
          }
        />
        <div className="landing-enlaces">
          <button type="button" className="fantasma" disabled={saliendo} onClick={() => void salir()}>
            {textos.bloqueo.salir}
          </button>
        </div>
      </main>
    </div>
  );
}
