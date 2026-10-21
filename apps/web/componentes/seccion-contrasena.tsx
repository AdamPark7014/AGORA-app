'use client';

import { useState } from 'react';

import { olvidarSesion, useSesion } from '@/lib/sesion';
import { avisar } from '@/lib/avisos';
import { FormularioContrasena } from './formulario-contrasena';

/**
 * Tarjeta de contraseña en Ajustes. Quien aún no tiene (cuenta de antes de
 * las contraseñas) la crea aquí sin más trámite: su sesión ya prueba que el
 * buzón es suyo. Quien ya tiene, la cambia dando la actual.
 */
export function SeccionContrasena() {
  const { yo, cargando } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [listo, setListo] = useState(false);

  if (cargando || !yo) return null;
  const tiene = yo.tieneContrasena || listo;

  return (
    <section className="tarjeta" style={{ marginTop: 24 }} id="contrasena" aria-labelledby="contrasena-titulo">
      <strong id="contrasena-titulo">Contraseña</strong>
      <p className="tenue" style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
        {tiene
          ? 'Entras con tu correo @udlap.mx y esta contraseña. Si la cambias, tus otras sesiones se cierran.'
          : 'Tu cuenta es de antes de las contraseñas. Crea una y entrarás sin esperar el código del correo.'}
      </p>

      {!abierto ? (
        <button type="button" className={tiene ? 'secundario' : undefined} onClick={() => setAbierto(true)}>
          {tiene ? 'Cambiar contraseña…' : 'Crear mi contraseña'}
        </button>
      ) : (
        <>
          <FormularioContrasena
            modo={tiene ? 'cambiar' : 'crear'}
            onListo={() => {
              olvidarSesion();
              setListo(true);
              setAbierto(false);
              avisar(tiene ? 'Contraseña cambiada.' : 'Listo: ya entras con tu contraseña.');
            }}
          />
          <button type="button" className="fantasma" onClick={() => setAbierto(false)}>
            Cancelar
          </button>
        </>
      )}
    </section>
  );
}
