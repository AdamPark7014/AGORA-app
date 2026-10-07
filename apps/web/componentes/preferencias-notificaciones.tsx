'use client';

import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';

const ETIQUETAS: Record<string, string> = {
  COMENTARIO: 'Comentarios',
  REACCION: 'Reacciones',
  MENSAJE: 'Mensajes',
  MENCION: 'Menciones',
  SEGUIDOR: 'Nuevos seguidores',
  EVENTO_NUEVO: 'Eventos nuevos',
  AVENTON_APARTADO: 'Aventones',
  AVENTON_CANCELADO: 'Aventones cancelados',
  MODERACION: 'Moderación',
  INSIGNIA: 'Insignias',
  RETO: 'Retos y duelos',
};

interface Pref {
  tipo: string;
  inApp: boolean;
  push: boolean;
}

export function PreferenciasNotificaciones() {
  const [prefs, setPrefs] = useState<Pref[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    api<{ preferencias: Pref[] }>('/notificaciones/preferencias')
      .then((d) => setPrefs(d.preferencias))
      .catch(() => undefined);
  }, []);

  async function guardar(actualizadas: Pref[]) {
    setPrefs(actualizadas);
    try {
      await api('/notificaciones/preferencias', {
        method: 'PATCH',
        body: JSON.stringify({ preferencias: actualizadas }),
      });
      setAviso('Preferencias guardadas.');
      setTimeout(() => setAviso(null), 2500);
    } catch (e) {
      setAviso(e instanceof ErrorApi ? e.message : 'No se pudieron guardar.');
    }
  }

  function cambiar(tipo: string, campo: 'inApp' | 'push', valor: boolean) {
    const actualizadas = prefs.map((p) => (p.tipo === tipo ? { ...p, [campo]: valor } : p));
    void guardar(actualizadas);
  }

  if (prefs.length === 0) return null;

  return (
    <div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
        {prefs.map((p) => (
          <li
            key={p.tipo}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: 12,
              alignItems: 'center',
              fontSize: '0.9rem',
            }}
          >
            <span>{ETIQUETAS[p.tipo] ?? p.tipo}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="tenue" style={{ fontSize: '0.78rem' }}>App</span>
              <input
                type="checkbox"
                checked={p.inApp}
                onChange={(e) => cambiar(p.tipo, 'inApp', e.target.checked)}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="tenue" style={{ fontSize: '0.78rem' }}>Push</span>
              <input
                type="checkbox"
                checked={p.push}
                onChange={(e) => cambiar(p.tipo, 'push', e.target.checked)}
              />
            </label>
          </li>
        ))}
      </ul>
      {aviso && <p className="nota" style={{ margin: '10px 0 0' }}>{aviso}</p>}
      <p className="tenue" style={{ margin: '8px 0 0', fontSize: '0.8rem' }}>
        Los eventos nuevos vienen desactivados en push por defecto para no spamear.
      </p>
    </div>
  );
}
