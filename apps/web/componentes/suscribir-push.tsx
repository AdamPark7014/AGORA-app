'use client';

import { useEffect, useState } from 'react';

import { desuscribirPush, estadoPush, suscribirPush } from '@/lib/push';

export function SuscribirPush() {
  const [soportado, setSoportado] = useState(true);
  const [activo, setActivo] = useState(false);
  const [suscrito, setSuscrito] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    estadoPush()
      .then((e) => {
        setSoportado(e.soportado);
        setActivo(e.activo);
        setSuscrito(e.suscrito);
      })
      .catch(() => undefined)
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return null;
  if (!soportado) {
    return (
      <p className="tenue" style={{ margin: 0, fontSize: '0.85rem' }}>
        Tu navegador no soporta notificaciones push.
      </p>
    );
  }
  if (!activo) {
    return (
      <p className="tenue" style={{ margin: 0, fontSize: '0.85rem' }}>
        Las notificaciones push aún no están configuradas en el servidor.
      </p>
    );
  }

  async function alternar() {
    setAviso(null);
    if (suscrito) {
      await desuscribirPush();
      setSuscrito(false);
      setAviso('Notificaciones push desactivadas.');
      return;
    }
    const ok = await suscribirPush();
    if (ok) {
      setSuscrito(true);
      setAviso('Listo. Te avisaremos cuando pase algo contigo.');
    } else {
      setAviso('No se pudo activar. Revisa los permisos del navegador.');
    }
  }

  return (
    <div>
      <button type="button" className={suscrito ? 'secundario' : undefined} onClick={alternar}>
        {suscrito ? 'Desactivar push' : 'Activar notificaciones push'}
      </button>
      {aviso && <p className="nota" style={{ margin: '8px 0 0' }}>{aviso}</p>}
      <p className="tenue" style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>
        Solo avisos dirigidos a ti: comentarios, mensajes, menciones. Nada de spam del feed.
      </p>
    </div>
  );
}
