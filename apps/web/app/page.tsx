'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, apiConCabeceras, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { olvidarSesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { destinoTrasLogin } from '@/lib/welcome';
import { LANDING_FAQ as FAQ_LANDING } from '@/lib/seo';
import { GraduationCap, Lock, MessageSquare } from '@/componentes/iconos';
import { EstadoEntrega } from '@/componentes/estado-entrega';
import { Isotipo } from '@/componentes/isotipo';

type Paso = 'correo' | 'codigo';

const VENTAJAS = copy.login.ventajas.map((v, i) => ({
  ...v,
  icono: [GraduationCap, Lock, MessageSquare][i] ?? GraduationCap,
}));

export default function Entrar() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Id de seguimiento del ultimo codigo enviado (cabecera X-Envio-Id). */
  const [envioId, setEnvioId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [reconociendo, setReconociendo] = useState(true);

  useEffect(() => {
    const control = new AbortController();
    const tiempo = window.setTimeout(() => setReconociendo(false), 4000);

    api<{ tienePerfil: boolean }>('/auth/yo', { signal: control.signal })
      .then((yo) => router.replace(destinoTrasLogin(yo.tienePerfil)))
      .catch(() => setReconociendo(false))
      .finally(() => window.clearTimeout(tiempo));

    return () => {
      control.abort();
      window.clearTimeout(tiempo);
    };
  }, [router]);

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
      setPaso('codigo');
    } catch (e) {
      if (e instanceof ErrorApi && e.estado === 429) {
        setPaso('codigo');
        setAviso(e.message);
      } else {
        setError(e instanceof ErrorApi ? e.message : copy.login.errores.enviarCodigo);
      }
    } finally {
      setCargando(false);
    }
  }

  function volverAlCorreo() {
    setPaso('correo');
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
      const { tienePerfil } = await api<{ tienePerfil: boolean }>('/auth/otp/verificar', {
        method: 'POST',
        body: JSON.stringify({ email, codigo }),
      });
      olvidarSesion();
      analytics.login();
      router.push(destinoTrasLogin(tienePerfil));
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

  return (
    <main className="landing">
      {paso === 'correo' ? (
        <>
          <div className="landing-hero">
            <Isotipo className="marca-punto landing-marca" />
            <p className="landing-marca-nombre">Ágora</p>
            <p className="insignia">{copy.login.insignia}</p>
            <h1>{copy.login.titulo}</h1>
            <p className="entradilla">{copy.login.entradilla}</p>
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
              {cargando ? copy.login.correo.botonEnviando : 'Entrar con @udlap.mx'}
            </button>
            <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
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
        </>
      ) : (
        <>
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

            <button
              type="submit"
              className="grande"
              disabled={cargando || codigo.length !== 6}
            >
              {cargando ? copy.login.codigo.botonVerificando : copy.login.codigo.boton}
            </button>

            <div className="acciones" style={{ marginTop: 12, justifyContent: 'center' }}>
              <button
                type="button"
                className="fantasma"
                onClick={volverAlCorreo}
              >
                {copy.login.codigo.cambiarCorreo}
              </button>
              <button
                type="button"
                className="fantasma"
                disabled={cargando}
                onClick={() => void pedirCodigo()}
              >
                {copy.login.codigo.reenviar}
              </button>
            </div>

            <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
          </form>

          <p className="tenue" style={{ textAlign: 'center', marginTop: 18 }}>
            {copy.login.codigo.pie} {copy.login.codigo.remitente}
            <br />
            En Outlook: busca <strong>Zynora</strong> o <strong>Ágora</strong>, revisa{' '}
            <strong>Correo no deseado</strong>, la pestaña{' '}
            <strong>Otros</strong> y, si tienes acceso,{' '}
            <a href="https://security.microsoft.com/quarantine" target="_blank" rel="noreferrer">
              Cuarentena de Microsoft
            </a>
            .
          </p>
        </>
      )}
    </main>
  );
}
