'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { marcarWelcomeVisto } from '@/lib/welcome';
import { Avatar } from '@/componentes/avatar';
import { PreguntaDelDia } from '@/componentes/pregunta-del-dia';

/**
 * Bienvenida guiada: en vez de tres pantallas que describen la app, cuatro
 * pasos que la dejan lista. Quien termina tiene foto, sigue a gente de su
 * carrera, ya contesto la pregunta del dia y se presento: su primer feed no
 * sale vacio. Cada paso se puede saltar.
 */

interface MiPerfil {
  handle: string;
  nombre: string;
  apellidos: string;
  fotoUrl: string | null;
}

interface Sugerencia {
  handle: string;
  nombre: string;
  apellidos: string;
  fotoUrl: string | null;
  carrera: string | null;
  deTuCarrera: boolean;
}

interface Comunidad {
  slug: string;
  tipo: string;
}

type Paso = 'foto' | 'seguir' | 'pregunta' | 'presentarte';

/** Con cinco ya hay feed el primer dia; no se exige, solo se sugiere. */
const META_SEGUIR = 5;

export default function Bienvenida() {
  const router = useRouter();
  const [pasos, setPasos] = useState<Paso[]>(['foto', 'seguir', 'presentarte']);
  const [indice, setIndice] = useState(0);
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [sugerencias, setSugerencias] = useState<Sugerencia[] | null>(null);
  const [sigo, setSigo] = useState<Set<string>>(new Set());
  const [campus, setCampus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [presentacion, setPresentacion] = useState('');
  const selectorFoto = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api<MiPerfil>('/perfil/mio')
      .then(setPerfil)
      .catch(() => undefined);
    api<Sugerencia[]>('/perfil/sugerencias')
      .then(setSugerencias)
      .catch(() => setSugerencias([]));
    api<Comunidad[]>('/perfil/mis-comunidades')
      .then((cs) => setCampus(cs.find((c) => c.tipo === 'UNIVERSIDAD')?.slug ?? cs[0]?.slug ?? null))
      .catch(() => undefined);
    // La pregunta solo entra como paso si hoy hay una.
    api<{ id: string } | null>('/pregunta/hoy')
      .then((p) => {
        if (p?.id) setPasos(['foto', 'seguir', 'pregunta', 'presentarte']);
      })
      .catch(() => undefined);
  }, []);

  const paso = pasos[indice]!;
  const ultimo = indice === pasos.length - 1;

  function terminar() {
    marcarWelcomeVisto();
    router.replace('/feed');
  }

  function avanzar() {
    setError(null);
    if (ultimo) terminar();
    else setIndice((i) => i + 1);
  }

  async function subirFoto(archivo: File) {
    setOcupado(true);
    setError(null);
    try {
      const cuerpo = new FormData();
      cuerpo.append('archivo', archivo);
      const respuesta = await fetch('/api/media', {
        method: 'POST',
        credentials: 'include',
        body: cuerpo,
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new ErrorApi(respuesta.status, datos?.message ?? 'Falló la subida.');
      await api('/perfil', { method: 'PATCH', body: JSON.stringify({ fotoMediaId: datos.id }) });
      setPerfil((p) => (p ? { ...p, fotoUrl: datos.url } : p));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo subir la foto.');
    } finally {
      setOcupado(false);
    }
  }

  async function alternarSeguir(handle: string) {
    try {
      const r = await api<{ siguiendo: boolean }>(`/perfil/${handle}/seguir`, { method: 'POST' });
      setSigo((previo) => {
        const nuevo = new Set(previo);
        if (r.siguiendo) nuevo.add(handle);
        else nuevo.delete(handle);
        return nuevo;
      });
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo seguir.');
    }
  }

  async function presentarse(evento: React.FormEvent) {
    evento.preventDefault();
    if (!campus || !presentacion.trim()) return;
    setOcupado(true);
    setError(null);
    try {
      await api('/posts', {
        method: 'POST',
        body: JSON.stringify({ comunidadSlug: campus, texto: presentacion.trim(), mediaIds: [] }),
      });
      terminar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setOcupado(false);
    }
  }

  const nombre = perfil ? `${perfil.nombre} ${perfil.apellidos}`.trim() : '';

  return (
    <main className="welcome">
      <div className="welcome-tope">
        <span className="tenue">
          Paso {indice + 1} de {pasos.length}
        </span>
        <button type="button" className="fantasma" onClick={terminar}>
          Saltar todo
        </button>
      </div>

      <div className="welcome-cuerpo">
        {paso === 'foto' && (
          <>
            <h1>Ponle cara a tu perfil</h1>
            <p className="entradilla">
              Con foto es más fácil que te reconozcan en el campus y te sigan de vuelta.
            </p>
            <div className="welcome-avatar">
              <Avatar
                nombre={nombre || 'Tú'}
                semilla={perfil?.handle}
                fotoUrl={perfil?.fotoUrl}
                tamano="grande"
              />
            </div>
            <button
              type="button"
              className="secundario"
              disabled={ocupado}
              onClick={() => selectorFoto.current?.click()}
            >
              {ocupado ? 'Subiendo…' : perfil?.fotoUrl ? 'Cambiar foto' : 'Elegir foto'}
            </button>
            <input
              ref={selectorFoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void subirFoto(f);
                e.target.value = '';
              }}
            />
          </>
        )}

        {paso === 'seguir' && (
          <>
            <h1>Sigue a tu gente</h1>
            <p className="entradilla">
              {sigo.size >= META_SEGUIR
                ? 'Listo, tu feed ya tiene de dónde llenarse.'
                : `Sigue a ${META_SEGUIR - sigo.size} más y tu feed arranca con vida.`}
            </p>
            {sugerencias === null ? (
              <p className="tenue">Buscando gente de tu carrera…</p>
            ) : sugerencias.length === 0 ? (
              <p className="tenue">Todavía no hay a quién sugerirte. Eres de los primeros.</p>
            ) : (
              <ul className="welcome-personas">
                {sugerencias.map((s) => {
                  const siguiendo = sigo.has(s.handle);
                  const nombreS = `${s.nombre} ${s.apellidos}`.trim();
                  return (
                    <li key={s.handle}>
                      <Avatar nombre={nombreS} semilla={s.handle} fotoUrl={s.fotoUrl} tamano="chico" />
                      <span className="welcome-persona-texto">
                        <strong>{nombreS}</strong>
                        <span className="tenue">
                          {s.deTuCarrera ? 'De tu carrera' : (s.carrera ?? `@${s.handle}`)}
                        </span>
                      </span>
                      <button
                        type="button"
                        className={siguiendo ? 'secundario' : ''}
                        aria-pressed={siguiendo}
                        onClick={() => void alternarSeguir(s.handle)}
                      >
                        {siguiendo ? 'Siguiendo' : 'Seguir'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {paso === 'pregunta' && (
          <>
            <h1>La pregunta del día</h1>
            <p className="entradilla">Contesta y ve qué opina el resto del campus.</p>
            <PreguntaDelDia />
          </>
        )}

        {paso === 'presentarte' && (
          <form className="welcome-presentarte" onSubmit={presentarse}>
            <h1>Preséntate</h1>
            <p className="entradilla">
              Tu primera publicación, para toda la UDLAP. Qué estudias, de dónde eres, qué buscas.
            </p>
            <textarea
              rows={4}
              maxLength={2000}
              placeholder="¡Hola! Soy de primer semestre de…"
              value={presentacion}
              onChange={(e) => setPresentacion(e.target.value)}
            />
            <button type="submit" disabled={ocupado || !campus || !presentacion.trim()}>
              {ocupado ? 'Publicando…' : 'Publicar y entrar'}
            </button>
          </form>
        )}

        {error && (
          <p className="error" aria-live="polite">
            {error}
          </p>
        )}
      </div>

      <div className="welcome-puntos" aria-hidden="true">
        {pasos.map((p, i) => (
          <span key={p} className={`welcome-punto${i === indice ? ' activo' : ''}`} />
        ))}
      </div>

      <button
        type="button"
        className={paso === 'presentarte' ? 'fantasma' : 'grande'}
        onClick={avanzar}
      >
        {ultimo ? 'Entrar sin publicar' : 'Siguiente'}
      </button>
    </main>
  );
}
