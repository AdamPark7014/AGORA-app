'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { olvidarSesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { destinoTrasLogin } from '@/lib/welcome';
import { GraduationCap, Lock, MessageSquare } from '@/componentes/iconos';

type Paso = 'correo' | 'codigo';

const VENTAJAS = copy.login.ventajas.map((v, i) => ({
  ...v,
  icono: [GraduationCap, Lock, MessageSquare][i] ?? GraduationCap,
}));

function EsqueletoLogin() {
  return (
    <main className="landing" aria-busy="true" aria-label={copy.cargando.momento}>
      <div className="landing-hero">
        <span className="marca-punto landing-marca" aria-hidden="true">
          Á
        </span>
        <div className="esqueleto" style={{ width: '42%', height: 28, margin: '0 auto 12px' }} />
        <div className="esqueleto" style={{ width: '70%', height: 14, margin: '0 auto' }} />
      </div>
    </main>
  );
}

export default function Entrar() {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>('correo');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
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

  async function pedirCodigo(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api('/auth/otp/solicitar', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setAviso(
        `${copy.login.codigo.avisoOutlook} Usa el que ya recibiste.`,
      );
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
    return <EsqueletoLogin />;
  }

  return (
    <main className="landing">
      {paso === 'correo' ? (
        <>
          <div className="landing-hero">
            <span className="marca-punto landing-marca" aria-hidden="true">
              Á
            </span>
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
        </>
      ) : (
        <>
          <div className="landing-hero">
            <span className="marca-punto landing-marca" aria-hidden="true">
              Á
            </span>
            <h1>{copy.login.codigo.titulo}</h1>
            <p className="entradilla">
              Te mandamos 6 dígitos a <strong>{email}</strong>.
            </p>
          </div>

          <form className="landing-form" onSubmit={verificar}>
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
                onClick={() => {
                  setPaso('correo');
                  setCodigo('');
                  setError(null);
                  setAviso(null);
                }}
              >
                {copy.login.codigo.cambiarCorreo}
              </button>
            </div>

            <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
          </form>

          <p className="tenue" style={{ textAlign: 'center', marginTop: 18 }}>
            {copy.login.codigo.pie}
            <br />
            En Outlook: busca <strong>Ágora</strong>, revisa <strong>Correo no deseado</strong>, la pestaña{' '}
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
