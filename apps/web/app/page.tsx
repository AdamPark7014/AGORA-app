'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { analytics } from '@/lib/analytics';
import { olvidarSesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { GraduationCap, Lock, MessageSquare } from '@/componentes/iconos';

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
  const [cargando, setCargando] = useState(false);
  const [reconociendo, setReconociendo] = useState(true);

  useEffect(() => {
    const control = new AbortController();
    const tiempo = window.setTimeout(() => setReconociendo(false), 4000);

    api<{ tienePerfil: boolean }>('/auth/yo', { signal: control.signal })
      .then((yo) => router.replace(yo.tienePerfil ? '/feed' : '/registro'))
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
      // Acaba de nacer una sesion: lo que hubiera guardado ya no vale.
      olvidarSesion();
      analytics.login();
      router.push(tienePerfil ? '/feed' : '/registro');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.login.errores.verificar);
    } finally {
      setCargando(false);
    }
  }

  if (reconociendo) {
    return (
      <main>
        <p className="tenue">{copy.cargando.momento}</p>
      </main>
    );
  }

  return (
    <main>
      {paso === 'correo' ? (
        <>
          <div className="hero-panel">
            <div className="hero-entrada">
              <span className="marca-punto" aria-hidden="true">
                Á
              </span>
              <span className="insignia">{copy.login.insignia}</span>
              <h1>{copy.login.titulo}</h1>
              <p className="entradilla">{copy.login.entradilla}</p>
            </div>
          </div>

          <form className="tarjeta tarjeta-compositor" onSubmit={pedirCodigo}>
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
              {cargando ? copy.login.correo.botonEnviando : copy.login.correo.boton}
            </button>
            {error && <p className="error">{error}</p>}
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
          <div className="hero-entrada">
            <h1>{copy.login.codigo.titulo}</h1>
            <p className="entradilla">
              Te mandamos 6 dígitos a <strong>{email}</strong>.
            </p>
          </div>

          <form className="tarjeta" onSubmit={verificar}>
            {aviso && <p className="nota">{aviso} Usa el que ya recibiste.</p>}
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

            {error && <p className="error">{error}</p>}
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
