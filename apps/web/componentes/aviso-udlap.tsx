'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { copy } from '@/lib/copy';
import { useSesion } from '@/lib/sesion';
import { ConfirmarUdlap, diasParaConfirmar } from './confirmar-udlap';

/**
 * Recordatorio arriba del contenido para quien se registró con su correo
 * personal: tiene 30 días para confirmar su buzón @udlap.mx. No se puede
 * cerrar (el plazo corre) y en Ajustes no se muestra porque ahí está la
 * tarjeta "Correo UDLAP". Vencido el plazo, lo sustituye el bloqueo.
 */
export function AvisoUdlap() {
  const { yo } = useSesion();
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const [confirmado, setConfirmado] = useState(false);

  if (!yo?.udlapPendiente || yo.udlapVencida || confirmado || ruta.startsWith('/ajustes')) {
    return null;
  }

  const textos = copy.login.udlap.aviso;

  return (
    <section className="aviso-udlap" aria-labelledby={abierto ? undefined : 'aviso-udlap-titulo'}>
      {abierto ? (
        <ConfirmarUdlap
          email={yo.email}
          onListo={() => setConfirmado(true)}
          onCancelar={() => setAbierto(false)}
        />
      ) : (
        <>
          <strong id="aviso-udlap-titulo">{textos.titulo}</strong>
          <p>{textos.texto(diasParaConfirmar(yo))}</p>
          <button type="button" onClick={() => setAbierto(true)}>
            {textos.boton}
          </button>
        </>
      )}
    </section>
  );
}
