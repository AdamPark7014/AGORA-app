'use client';

import { useEffect, useState } from 'react';

import { api, apiConCabeceras, ErrorApi } from '@/lib/api';
import { avisar } from '@/lib/avisos';
import { copy } from '@/lib/copy';
import { olvidarSesion, type Sesion } from '@/lib/sesion';
import { EstadoEntrega } from './estado-entrega';
import { FormularioContrasena } from './formulario-contrasena';

/** La API no deja pedir otro código antes de un minuto; la pantalla lo cuenta. */
const ESPERA_REENVIO_S = 60;

/**
 * Días que le quedan para confirmar la UDLAP. La API ya los redondea hacia
 * arriba, así que mientras no venza son al menos 1 ("Te quedan 0 días" no).
 */
export function diasParaConfirmar(yo: Sesion): number {
  return Math.max(1, yo.udlapDiasRestantes ?? 1);
}

type Paso = 'inicio' | 'codigo' | 'contrasena';

/**
 * Confirmar el buzón @udlap.mx de una cuenta registrada con correo personal.
 *
 * Es el código de siempre (`/auth/otp/solicitar` + `/auth/otp/verificar`),
 * pero en una cuenta pendiente el canje borra el correo personal y la
 * contraseña y cierra todas las sesiones; la API deja la cookie nueva en la
 * respuesta. Por eso después se elige contraseña otra vez.
 *
 * Se usa desde el aviso de arriba del feed, desde Ajustes y desde la pantalla
 * de bloqueo cuando pasó el plazo.
 */
export function ConfirmarUdlap({
  email,
  onListo,
  onCancelar,
  encabezado,
  variante = 'tarjeta',
}: {
  /** El correo @udlap.mx de la cuenta (el de `/auth/yo`). */
  email: string;
  onListo: () => void;
  /** Sin él no se ofrece "Cancelar" (p. ej. en el bloqueo). */
  onCancelar?: () => void;
  /** Reemplaza el título y el texto de los pasos de pedir y canjear el código. */
  encabezado?: React.ReactNode;
  /** `pantalla` usa la cabecera grande de la puerta; `tarjeta`, una compacta. */
  variante?: 'pantalla' | 'tarjeta';
}) {
  const [paso, setPaso] = useState<Paso>('inicio');
  const [codigo, setCodigo] = useState('');
  const [envioId, setEnvioId] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const textos = copy.login.udlap;

  // Cuenta regresiva del reenvío.
  useEffect(() => {
    if (segundos <= 0) return;
    const t = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [segundos]);

  async function pedirCodigo() {
    setError(null);
    setCargando(true);
    try {
      const { cabeceras } = await apiConCabeceras('/auth/otp/solicitar', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      const id = cabeceras.get('x-envio-id');
      setEnvioId(id);
      // Sin seguimiento (API vieja o modo consola) queda el aviso de siempre.
      setAviso(id ? null : copy.login.codigo.avisoOutlook);
      setSegundos(ESPERA_REENVIO_S);
      setPaso('codigo');
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 429) {
        setPaso('codigo');
        setAviso(e.message);
        setSegundos(ESPERA_REENVIO_S);
      } else {
        setError(e instanceof ErrorApi ? e.message : copy.login.errores.enviarCodigo);
      }
    } finally {
      setCargando(false);
    }
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await api<{ tieneContrasena?: boolean; udlapPendiente?: boolean }>(
        '/auth/otp/verificar',
        { method: 'POST', body: JSON.stringify({ email, codigo }) },
      );
      // La sesión de antes ya no existe: la copia guardada tampoco sirve.
      olvidarSesion();
      setCodigo('');
      if (r.tieneContrasena) {
        // La cuenta ya no estaba pendiente (se confirmó en otro lado): nada que rehacer.
        terminar();
      } else {
        setPaso('contrasena');
      }
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.login.errores.verificar);
    } finally {
      setCargando(false);
    }
  }

  function terminar() {
    olvidarSesion();
    avisar(textos.listo);
    onListo();
  }

  const pantalla = variante === 'pantalla';

  if (paso === 'contrasena') {
    return (
      <div className="confirmar-udlap">
        {pantalla ? (
          <div className="landing-hero">
            <h1>{textos.nuevaContrasena.titulo}</h1>
            <p className="entradilla">{textos.nuevaContrasena.texto}</p>
          </div>
        ) : (
          <>
            <h2 className="confirmar-udlap-titulo">{textos.nuevaContrasena.titulo}</h2>
            <p className="confirmar-udlap-texto">{textos.nuevaContrasena.texto}</p>
          </>
        )}
        <FormularioContrasena modo="crear" onListo={terminar} />
      </div>
    );
  }

  const cabecera =
    encabezado ??
    (pantalla ? (
      <div className="landing-hero">
        <h1>{textos.confirmar.titulo}</h1>
        <p className="entradilla">{textos.confirmar.texto(email)}</p>
      </div>
    ) : (
      <>
        <h2 className="confirmar-udlap-titulo">{textos.confirmar.titulo}</h2>
        <p className="confirmar-udlap-texto">{textos.confirmar.texto(email)}</p>
      </>
    ));

  const cancelar = onCancelar && (
    <button type="button" className="fantasma" onClick={onCancelar} disabled={cargando}>
      {textos.cancelar}
    </button>
  );

  if (paso === 'inicio') {
    return (
      <div className="confirmar-udlap">
        {cabecera}
        <div className="landing-form">
          <button type="button" className="grande" disabled={cargando} onClick={() => void pedirCodigo()}>
            {cargando ? textos.confirmar.botonEnviando : textos.confirmar.boton}
          </button>
          <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
          {cancelar && <div className="landing-enlaces">{cancelar}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="confirmar-udlap">
      {cabecera}
      <form className="landing-form" onSubmit={confirmar}>
        {envioId && (
          <EstadoEntrega envioId={envioId} email={email} onReenviar={() => void pedirCodigo()} />
        )}
        {aviso && <p className="nota">{aviso}</p>}
        <label className="campo campo-codigo">
          <span>{copy.login.codigo.etiqueta}</span>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            autoFocus
            required
            placeholder={copy.login.codigo.placeholder}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        <button type="submit" className="grande" disabled={cargando || codigo.length !== 6}>
          {cargando ? textos.confirmar.confirmando : textos.confirmar.confirmar}
        </button>

        <div className="acciones" style={{ justifyContent: 'center' }}>
          <button
            type="button"
            className="fantasma"
            disabled={cargando || segundos > 0}
            onClick={() => void pedirCodigo()}
          >
            {segundos > 0 ? copy.login.codigo.reenviarEn(segundos) : copy.login.codigo.reenviar}
          </button>
          {cancelar}
        </div>

        <div aria-live="polite">{error && <p className="error">{error}</p>}</div>

        <p className="tenue confirmar-udlap-pie">
          {copy.login.codigo.pie} {copy.login.codigo.remitente}
        </p>
      </form>
    </div>
  );
}
