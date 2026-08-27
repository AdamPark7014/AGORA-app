'use client';

import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';

interface Yo {
  handle: string | null;
  roles: string[];
}

/**
 * Puerta del panel.
 *
 * Esto es **cortesía visual, no seguridad**: la defensa real está en el
 * `PermisoGuard` del servidor, que comprueba el permiso en cada endpoint. Un
 * usuario sin permiso que se salte esta pantalla solo verá tableros vacíos y
 * errores 403, porque la API no le va a contestar.
 */
export function Guardia({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'sin-sesion' | 'sin-permiso'>(
    'cargando',
  );

  useEffect(() => {
    api<Yo>('/auth/yo')
      .then((yo) => {
        const puede = yo.roles.some((r) => r === 'moderador' || r === 'admin');
        setEstado(puede ? 'ok' : 'sin-permiso');
      })
      .catch((e) => {
        setEstado(e instanceof ErrorApi && e.estado === 401 ? 'sin-sesion' : 'sin-permiso');
      });
  }, []);

  if (estado === 'cargando') {
    return <p className="tenue">Comprobando permisos…</p>;
  }

  if (estado === 'sin-sesion') {
    const web = process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3200';
    return (
      <div className="vacio">
        <strong>No has iniciado sesión</strong>
        Entra en Ágora con tu correo institucional y vuelve aquí.
        <p style={{ marginTop: 16 }}>
          <a href={web}>Ir a Ágora →</a>
        </p>
      </div>
    );
  }

  if (estado === 'sin-permiso') {
    return (
      <div className="vacio">
        <strong>No tienes acceso a este panel</strong>
        Hace falta el rol de moderador. Si crees que es un error, habla con
        quien administra la red.
      </div>
    );
  }

  return <>{children}</>;
}
