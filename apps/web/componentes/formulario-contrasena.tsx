'use client';

import { useId, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { copy } from '@/lib/copy';
import { Eye, EyeOff } from './iconos';

/**
 * Campo de contraseña con el botón de ver/ocultar. El botón no roba el foco
 * ni el Enter del formulario (es type="button").
 */
export function CampoContrasena({
  etiqueta,
  valor,
  onCambio,
  autoComplete,
  visible,
  onAlternar,
  autoFocus,
  disabled,
}: {
  etiqueta: string;
  valor: string;
  onCambio: (valor: string) => void;
  autoComplete: 'current-password' | 'new-password';
  visible: boolean;
  onAlternar: () => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="campo campo-contrasena">
      <label htmlFor={id}>
        <span>{etiqueta}</span>
      </label>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        required
        minLength={autoComplete === 'new-password' ? 8 : 1}
        maxLength={128}
        autoFocus={autoFocus}
        disabled={disabled}
        value={valor}
        onChange={(e) => onCambio(e.target.value)}
      />
      <button
        type="button"
        className="ver-contrasena"
        onClick={onAlternar}
        aria-label={visible ? copy.login.contrasena.ocultar : copy.login.contrasena.mostrar}
        aria-pressed={visible}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}

/**
 * Crear (o reemplazar sin la actual) y cambiar contraseña, con el mismo
 * formulario. `modo === 'cambiar'` pide además la actual.
 */
export function FormularioContrasena({
  modo,
  onListo,
  textoBoton,
}: {
  modo: 'crear' | 'cambiar';
  onListo: () => void;
  textoBoton?: string;
}) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const textos = copy.login.nuevaContrasena;

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    if (nueva !== confirmacion) {
      setError(textos.noCoincide);
      return;
    }
    setGuardando(true);
    try {
      if (modo === 'cambiar') {
        await api('/auth/contrasena/cambiar', {
          method: 'POST',
          body: JSON.stringify({ actual, nueva }),
        });
      } else {
        await api('/auth/contrasena', {
          method: 'POST',
          body: JSON.stringify({ contrasena: nueva }),
        });
      }
      setActual('');
      setNueva('');
      setConfirmacion('');
      onListo();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.login.errores.contrasena);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form className="landing-form" onSubmit={guardar} noValidate>
      {modo === 'cambiar' && (
        <CampoContrasena
          etiqueta="Contraseña actual"
          valor={actual}
          onCambio={setActual}
          autoComplete="current-password"
          visible={visible}
          onAlternar={() => setVisible((v) => !v)}
          disabled={guardando}
        />
      )}
      <CampoContrasena
        etiqueta={textos.etiqueta}
        valor={nueva}
        onCambio={setNueva}
        autoComplete="new-password"
        visible={visible}
        onAlternar={() => setVisible((v) => !v)}
        autoFocus={modo === 'crear'}
        disabled={guardando}
      />
      <p className="ayuda-campo">{textos.ayuda}</p>
      <CampoContrasena
        etiqueta={textos.confirmar}
        valor={confirmacion}
        onCambio={setConfirmacion}
        autoComplete="new-password"
        visible={visible}
        onAlternar={() => setVisible((v) => !v)}
        disabled={guardando}
      />
      <button
        type="submit"
        className="grande"
        disabled={guardando || nueva.length < 8 || confirmacion.length < 8 || (modo === 'cambiar' && !actual)}
      >
        {guardando ? textos.botonGuardando : (textoBoton ?? textos.boton)}
      </button>
      <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
    </form>
  );
}
