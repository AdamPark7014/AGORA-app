'use client';

import { Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Invitación a instalar la PWA.
 *
 * En iOS **no existe** `beforeinstallprompt` ni banner automático: la única vía
 * es Compartir → Añadir a pantalla de inicio, y la mayoría no sabe que esa
 * opción está ahí. Con una guía explícita se reporta ~85 % de instalación
 * frente a casi nada sin ella — el instructivo *es* la superficie de conversión.
 *
 * En Android el navegador sí ofrece el evento, así que se usa el botón nativo.
 *
 * Aparece a la tercera visita, no en la primera: pedir instalar a alguien que
 * todavía no sabe qué es la app es la forma más rápida de que lo descarte.
 */
const VISITAS_MINIMAS = 3;
const CLAVE_VISITAS = 'agora:visitas';
const CLAVE_DESCARTADO = 'agora:instalar-descartado';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function Instalar() {
  const [visible, setVisible] = useState(false);
  const [esIOS, setEsIOS] = useState(false);
  const [eventoAndroid, setEventoAndroid] = useState<EventoInstalacion | null>(null);

  useEffect(() => {
    const yaInstalada =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (yaInstalada) return;

    if (localStorage.getItem(CLAVE_DESCARTADO) === 'si') return;

    const visitas = Number(localStorage.getItem(CLAVE_VISITAS) ?? '0') + 1;
    localStorage.setItem(CLAVE_VISITAS, String(visitas));
    if (visitas < VISITAS_MINIMAS) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setEsIOS(ios);

    if (ios) {
      setVisible(true);
      return;
    }

    // Android y escritorio: el navegador avisa cuando la app es instalable.
    const alPoder = (e: Event) => {
      e.preventDefault();
      setEventoAndroid(e as EventoInstalacion);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', alPoder);
    return () => window.removeEventListener('beforeinstallprompt', alPoder);
  }, []);

  function descartar() {
    localStorage.setItem(CLAVE_DESCARTADO, 'si');
    setVisible(false);
  }

  async function instalar() {
    if (!eventoAndroid) return;
    await eventoAndroid.prompt();
    await eventoAndroid.userChoice;
    descartar();
  }

  if (!visible) return null;

  return (
    <div className="instalar">
      <span className="instalar-icono" aria-hidden="true">
        <Smartphone size={28} strokeWidth={1.5} />
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>Ten Ágora a un toque</strong>
        {esIOS ? (
          <p className="tenue" style={{ margin: '2px 0 0' }}>
            Toca <strong>Compartir</strong> abajo y luego{' '}
            <strong>Añadir a pantalla de inicio</strong>. Es la única forma de
            recibir avisos en iPhone.
          </p>
        ) : (
          <p className="tenue" style={{ margin: '2px 0 0' }}>
            Instálala como app, sin pasar por ninguna tienda.
          </p>
        )}
      </div>

      <div className="acciones">
        {!esIOS && (
          <button type="button" onClick={instalar}>
            Instalar
          </button>
        )}
        <button type="button" className="fantasma" onClick={descartar}>
          Ahora no
        </button>
      </div>
    </div>
  );
}
