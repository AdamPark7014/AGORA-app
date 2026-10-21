'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, apiConCabeceras, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { olvidarSesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { destinoTrasLogin, siguienteDeUrl } from '@/lib/welcome';
import { LANDING_FAQ as FAQ_LANDING } from '@/lib/seo';
import { GraduationCap, Lock, MessageSquare } from '@/componentes/iconos';
import { EstadoEntrega } from '@/componentes/estado-entrega';
import { CampoContrasena, FormularioContrasena } from '@/componentes/formulario-contrasena';
import { Isotipo } from '@/componentes/isotipo';

/**
 * La puerta de Ágora.
 *
 *  - `entrar`: correo + contraseña, lo de todos los días.
 *  - `pedir` → `codigo`: el código al buzón @udlap.mx. Solo para crear la
 *    cuenta, para una cuenta de antes que aún no tiene contraseña y para
 *    "olvidé mi contraseña". Es la única verificación institucional, y por
 *    eso no se quita: solo se pide una vez.
 *  - `contrasena`: después del código, cuando la cuenta no tiene contraseña o
 *    se vino por "olvidé", se elige una antes de pasar.
 */
type Paso = 'entrar' | 'pedir' | 'codigo' | 'contrasena';
type Motivo = 'registro' | 'olvide';

/** La API no deja pedir otro código antes de un minuto; la pantalla lo cuenta. */
const ESPERA_REENVIO_S = 60;

const VENTAJAS = copy.login.ventajas.map((v, i) => ({
  ...v,
  icono: [GraduationCap, Lock, MessageSquare][i] ?? GraduationCap,
}));

export default function Entrar() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('entrar');
  const [motivo, setMotivo] = useState<Motivo>('registro');
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [recordarme, setRecordarme] = useState(true);
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Id de seguimiento del ultimo codigo enviado (cabecera X-Envio-Id). */
  const [envioId, setEnvioId] = useState<string | null>(null);
  const [segundos, setSegundos] = useState(0);
  const [tienePerfil, setTienePerfil] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [reconociendo, setReconociendo] = useState(true);

  useEffect(() => {
    const control = new AbortController();
    const tiempo = window.setTimeout(() => setReconociendo(false), 4000);

    api<{ tienePerfil: boolean }>('/auth/yo', { signal: control.signal })
      .then((yo) => router.replace(destinoTrasLogin(yo.tienePerfil, siguienteDeUrl())))
      .catch(() => setReconociendo(false))
      .finally(() => window.clearTimeout(tiempo));

    return () => {
      control.abort();
      window.clearTimeout(tiempo);
    };
  }, [router]);

  // Cuenta regresiva del reenvío.
  useEffect(() => {
    if (segundos <= 0) return;
    const t = window.setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [segundos]);

  function irA(destino: Paso, nuevoMotivo?: Motivo) {
    if (nuevoMotivo) setMotivo(nuevoMotivo);
    setPaso(destino);
    setError(null);
    setAviso(null);
  }

  function terminar(conPerfil: boolean) {
    olvidarSesion();
    analytics.login();
    router.push(destinoTrasLogin(conPerfil, siguienteDeUrl()));
  }

  async function entrar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const { tienePerfil: conPerfil } = await api<{ tienePerfil: boolean }>('/auth/entrar', {
        method: 'POST',
        body: JSON.stringify({ email, contrasena, recordarme }),
      });
      terminar(conPerfil);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.login.errores.entrar);
    } finally {
      setCargando(false);
    }
  }

  async function pedirCodigo(evento?: React.FormEvent) {
    evento?.preventDefault();
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

  function volverAlCorreo() {
    setPaso('pedir');
    setCodigo('');
    setError(null);
    setAviso(null);
    setEnvioId(null);
  }

  async function verificar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const r = await api<{ tienePerfil: boolean; tieneContrasena?: boolean }>('/auth/otp/verificar', {
        method: 'POST',
        body: JSON.stringify({ email, codigo }),
      });
      setTienePerfil(r.tienePerfil);
      // Sin contraseña todavía (cuenta nueva o de antes), o vino a cambiarla:
      // se elige antes de entrar. Si ya tiene y solo prefirió el código, pasa.
      if (!r.tieneContrasena || motivo === 'olvide') {
        olvidarSesion();
        setPaso('contrasena');
      } else {
        terminar(r.tienePerfil);
      }
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.login.errores.verificar);
    } finally {
      setCargando(false);
    }
  }

  if (reconociendo) {
    return (
      <main className="landing" aria-busy="true" aria-label={copy.cargando.momento}>
        <div className="landing-hero">
          <Isotipo className="marca-punto landing-marca" />
          <p className="landing-marca-nombre">Ágora</p>
          <p className="insignia">{copy.login.insignia}</p>
          <h1>{copy.login.titulo}</h1>
          <p className="entradilla">{copy.login.entradilla}</p>
        </div>
        <p className="tenue" style={{ textAlign: 'center' }}>
          {copy.cargando.momento}
        </p>
      </main>
    );
  }

  if (paso === 'entrar') {
    return (
      <main className="landing">
        <div className="landing-hero">
          <Isotipo className="marca-punto landing-marca" />
          <p className="landing-marca-nombre">Ágora</p>
          <p className="insignia">{copy.login.insignia}</p>
          <h1>{copy.login.titulo}</h1>
          <p className="entradilla">{copy.login.entradilla}</p>
        </div>

        <form className="landing-form" onSubmit={entrar}>
          <label className="campo">
            <span>{copy.login.correo.etiqueta}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              required
              placeholder={copy.login.correo.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <CampoContrasena
            etiqueta={copy.login.contrasena.etiqueta}
            valor={contrasena}
            onCambio={setContrasena}
            autoComplete="current-password"
            visible={verContrasena}
            onAlternar={() => setVerContrasena((v) => !v)}
            disabled={cargando}
          />
          <label className="casilla">
            <input
              type="checkbox"
              checked={recordarme}
              onChange={(e) => setRecordarme(e.target.checked)}
            />
            {copy.login.recordarme}
          </label>
          <button type="submit" className="grande" disabled={cargando}>
            {cargando ? copy.login.botonEntrando : copy.login.boton}
          </button>
          <div aria-live="polite">{error && <p className="error">{error}</p>}</div>

          <div className="landing-enlaces">
            <button type="button" className="fantasma" onClick={() => irA('pedir', 'olvide')}>
              {copy.login.olvide}
            </button>
            <button type="button" className="fantasma" onClick={() => irA('pedir', 'registro')}>
              {copy.login.primeraVez} <strong>{copy.login.crearCuenta}</strong>
            </button>
          </div>
        </form>

        <ul className="ventajas">
          {VENTAJAS.map((v) => (
            <li key={v.titulo} className="ventaja">
              <span className="ventaja-icono" aria-hidden="true">
                <v.icono size={22} strokeWidth={1.75} />
              </span>
              <span>
                <strong>{v.titulo}</strong>
                <br />
                {v.texto}
              </span>
            </li>
          ))}
        </ul>

        <section className="landing-faq" aria-labelledby="faq-titulo">
          <h2 id="faq-titulo">Preguntas frecuentes</h2>
          <dl>
            {FAQ_LANDING.map((item) => (
              <div key={item.pregunta} className="landing-faq-item">
                <dt>{item.pregunta}</dt>
                <dd>{item.respuesta}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    );
  }

  if (paso === 'pedir') {
    return (
      <main className="landing">
        <div className="landing-hero">
          <Isotipo className="marca-punto landing-marca" />
          <h1>{copy.login.pedir.titulo[motivo]}</h1>
          <p className="entradilla">{copy.login.pedir.explicacion[motivo]}</p>
        </div>

        <form className="landing-form" onSubmit={pedirCodigo}>
          <label className="campo">
            <span>{copy.login.correo.etiqueta}</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              required
              placeholder={copy.login.correo.placeholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" className="grande" disabled={cargando}>
            {cargando ? copy.login.pedir.botonEnviando : copy.login.pedir.boton}
          </button>
          <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
          <div className="landing-enlaces">
            <button type="button" className="fantasma" onClick={() => irA('entrar')}>
              {copy.login.pedir.volver}
            </button>
          </div>
        </form>
      </main>
    );
  }

  if (paso === 'contrasena') {
    const clave = motivo === 'olvide' ? 'olvide' : 'crear';
    return (
      <main className="landing">
        <div className="landing-hero">
          <Isotipo className="marca-punto landing-marca" />
          <h1>{copy.login.nuevaContrasena.titulo[clave]}</h1>
          <p className="entradilla">{copy.login.nuevaContrasena.entradilla[clave]}</p>
        </div>
        <FormularioContrasena modo="crear" onListo={() => terminar(tienePerfil)} />
      </main>
    );
  }

  return (
    <main className="landing">
      <div className="landing-hero">
        <Isotipo className="marca-punto landing-marca" />
        <h1>{copy.login.codigo.titulo}</h1>
        <p className="entradilla">
          Te mandamos 6 dígitos a <strong>{email}</strong>.
        </p>
      </div>

      <form className="landing-form" onSubmit={verificar}>
        {envioId && (
          <EstadoEntrega
            envioId={envioId}
            email={email}
            onCorregir={volverAlCorreo}
            onReenviar={() => void pedirCodigo()}
          />
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
          {cargando ? copy.login.codigo.botonVerificando : copy.login.codigo.boton}
        </button>

        <div className="acciones" style={{ marginTop: 12, justifyContent: 'center' }}>
          <button type="button" className="fantasma" onClick={volverAlCorreo}>
            {copy.login.codigo.cambiarCorreo}
          </button>
          <button
            type="button"
            className="fantasma"
            disabled={cargando || segundos > 0}
            onClick={() => void pedirCodigo()}
          >
            {segundos > 0 ? copy.login.codigo.reenviarEn(segundos) : copy.login.codigo.reenviar}
          </button>
        </div>

        <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
      </form>

      <p className="tenue" style={{ textAlign: 'center', marginTop: 18 }}>
        {copy.login.codigo.pie} {copy.login.codigo.tarda}
        <br />
        {copy.login.codigo.remitente} En Outlook: busca <strong>Zynora</strong> o{' '}
        <strong>Ágora</strong>, revisa <strong>Correo no deseado</strong>, la pestaña{' '}
        <strong>Otros</strong> y, si tienes acceso,{' '}
        <a href="https://security.microsoft.com/quarantine" target="_blank" rel="noreferrer">
          Cuarentena de Microsoft
        </a>
        .
      </p>
    </main>
  );
}
