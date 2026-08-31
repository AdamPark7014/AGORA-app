'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { olvidarSesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { EsqueletoLista } from '@/componentes/esqueleto';

interface Catalogo {
  escuelas: Array<{
    slug: string;
    nombre: string;
    carreras: Array<{ slug: string; nombre: string }>;
    departamentos: Array<{ slug: string; nombre: string }>;
  }>;
  colegios: Array<{ slug: string; nombre: string }>;
}

const ANO_ACTUAL = new Date().getFullYear();
const GENERACIONES = Array.from({ length: 10 }, (_, i) => ANO_ACTUAL + 1 - i);

export default function Registro() {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [escuelaSlug, setEscuelaSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [datos, setDatos] = useState({
    handle: '',
    nombre: '',
    apellidos: '',
    generacion: String(ANO_ACTUAL),
    carreraSlug: '',
    colegioSlug: '',
    bio: '',
  });

  useEffect(() => {
    api<Catalogo>('/catalogo')
      .then(setCatalogo)
      .catch(() => setError(copy.registro.errorCatalogo));
  }, []);

  // Carreras y departamentos dependen de la escuela: mostrar las 52 carreras
  // juntas volveria el formulario inservible en un telefono.
  const escuela = useMemo(
    () => catalogo?.escuelas.find((e) => e.slug === escuelaSlug),
    [catalogo, escuelaSlug],
  );

  const carreraNombre = escuela?.carreras.find((c) => c.slug === datos.carreraSlug)?.nombre;
  const colegioNombre = catalogo?.colegios.find((c) => c.slug === datos.colegioSlug)?.nombre;

  const previewComunidades = [
    escuela?.nombre,
    carreraNombre,
    datos.generacion ? `Generación ${datos.generacion}` : null,
    colegioNombre ? `Colegio ${colegioNombre}` : null,
  ].filter(Boolean) as string[];

  function actualizar(campo: keyof typeof datos, valor: string) {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);
    try {
      await api('/perfil', {
        method: 'POST',
        body: JSON.stringify({
          handle: datos.handle,
          nombre: datos.nombre,
          apellidos: datos.apellidos,
          generacion: Number(datos.generacion),
          carreraSlug: datos.carreraSlug,
          ...(datos.colegioSlug ? { colegioSlug: datos.colegioSlug } : {}),
          ...(datos.bio ? { bio: datos.bio } : {}),
        }),
      });
      // El perfil recien creado cambia `handle` y `tienePerfil`.
      olvidarSesion();
      router.push('/bienvenida');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : copy.registro.errorCrear);
    } finally {
      setCargando(false);
    }
  }

  if (!catalogo) {
    return (
      <main>
        {error ? (
          <div aria-live="polite">
            <p className="error">{error}</p>
          </div>
        ) : (
          <EsqueletoLista cantidad={2} />
        )}
      </main>
    );
  }

  return (
    <main>
      <div className="hero-entrada">
        <span className="marca-punto" aria-hidden="true">
          Á
        </span>
        <h1>{copy.registro.titulo}</h1>
        <p className="entradilla">{copy.registro.entradilla}</p>
      </div>

      <form className="tarjeta" onSubmit={enviar}>
        <label className="campo">
          <span>Nombre de usuario</span>
          <input
            required
            placeholder="adampozo"
            value={datos.handle}
            onChange={(e) => actualizar('handle', e.target.value.toLowerCase())}
          />
        </label>

        <div className="filtros">
          <label className="campo">
            <span>Nombre</span>
            <input
              required
              placeholder="Adam"
              value={datos.nombre}
              onChange={(e) => actualizar('nombre', e.target.value)}
            />
          </label>
          <label className="campo">
            <span>Apellidos</span>
            <input
              required
              placeholder="Del Pozo"
              value={datos.apellidos}
              onChange={(e) => actualizar('apellidos', e.target.value)}
            />
          </label>
        </div>

        <div className="filtros">
          <label className="campo">
            <span>Escuela</span>
            <select
              required
              value={escuelaSlug}
              onChange={(e) => {
                setEscuelaSlug(e.target.value);
                actualizar('carreraSlug', '');
              }}
            >
              <option value="">Elige…</option>
              {catalogo.escuelas.map((e) => (
                <option key={e.slug} value={e.slug}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Carrera</span>
            <select
              required
              disabled={!escuela}
              value={datos.carreraSlug}
              onChange={(e) => actualizar('carreraSlug', e.target.value)}
            >
              <option value="">Elige…</option>
              {escuela?.carreras.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="filtros">
          <label className="campo">
            <span>Generación</span>
            <select
              required
              value={datos.generacion}
              onChange={(e) => actualizar('generacion', e.target.value)}
            >
              {GENERACIONES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Colegio residencial (opcional)</span>
            <select
              value={datos.colegioSlug}
              onChange={(e) => actualizar('colegioSlug', e.target.value)}
            >
              <option value="">No vivo en campus</option>
              {catalogo.colegios.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="campo">
          <span>Bio (opcional, 280 caracteres)</span>
          <textarea
            rows={3}
            maxLength={280}
            value={datos.bio}
            onChange={(e) => actualizar('bio', e.target.value)}
          />
        </label>

        {previewComunidades.length > 0 && (
          <div className="preview-comunidades">
            <strong>{copy.registro.previewTitulo}</strong>
            <p className="tenue" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              {copy.registro.previewSub}
            </p>
            <ul>
              {previewComunidades.map((c) => (
                <li key={c} className="etiqueta naranja">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button type="submit" className="grande" disabled={cargando}>
          {cargando ? copy.registro.botonCreando : copy.registro.boton}
        </button>

        <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
      </form>
    </main>
  );
}
