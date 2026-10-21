'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useSesion } from '@/lib/sesion';

const CLAVE = 'agora:aviso-contrasena-cerrado';

/**
 * Invitación, una vez por sesión del navegador, a crear contraseña para
 * quien entró con código y aún no tiene. No es obligatoria: la cuenta sigue
 * funcionando con códigos, solo que más lento.
 */
export function AvisoContrasena() {
  const { yo } = useSesion();
  const ruta = usePathname();
  const [cerrado, setCerrado] = useState(true);

  useEffect(() => {
    try {
      setCerrado(sessionStorage.getItem(CLAVE) === '1');
    } catch {
      setCerrado(false);
    }
  }, []);

  if (cerrado || !yo || yo.tieneContrasena || ruta.startsWith('/ajustes')) return null;

  function cerrar() {
    setCerrado(true);
    try {
      sessionStorage.setItem(CLAVE, '1');
    } catch {
      // Sin almacenamiento: se vuelve a mostrar en la siguiente carga.
    }
  }

  return (
    <div className="aviso-contrasena" role="status">
      <span>
        Crea una contraseña y entra sin esperar el código.{' '}
        <Link href="/ajustes#contrasena">Crear contraseña</Link>
      </span>
      <button type="button" className="fantasma" onClick={cerrar} aria-label="Cerrar aviso">
        Ahora no
      </button>
    </div>
  );
}
