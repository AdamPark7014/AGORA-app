'use client';

import { useState } from 'react';

import { copy } from '@/lib/copy';
import { useSesion } from '@/lib/sesion';
import { ConfirmarUdlap, diasParaConfirmar } from './confirmar-udlap';

/**
 * Tarjeta "Correo UDLAP" en Ajustes. Solo aparece en cuentas registradas con
 * correo personal que aún no confirman su buzón @udlap.mx.
 */
export function SeccionUdlap() {
  const { yo, cargando } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);

  if (cargando || !yo?.udlapPendiente || listo) return null;
  const textos = copy.login.udlap;

  return (
    <section
      className="tarjeta"
      style={{ margin: '0 0 24px' }}
      id="correo-udlap"
      aria-labelledby="correo-udlap-titulo"
    >
      <strong id="correo-udlap-titulo">{textos.ajustes.titulo}</strong>

      {!abierto ? (
        <>
          <p className="tenue" style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
            {textos.aviso.texto(diasParaConfirmar(yo))}
          </p>
          <button type="button" onClick={() => setAbierto(true)}>
            {textos.ajustes.boton}
          </button>
        </>
      ) : (
        <div style={{ marginTop: 12 }}>
          <ConfirmarUdlap
            email={yo.email}
            onListo={() => {
              setListo(true);
              setAbierto(false);
            }}
            onCancelar={() => setAbierto(false)}
          />
        </div>
      )}
    </section>
  );
}
