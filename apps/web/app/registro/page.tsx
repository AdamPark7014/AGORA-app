'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { olvidarSesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { Isotipo } from '@/componentes/isotipo';

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

/** Sin acentos ni mayusculas: "ingenieria" encuentra "Ingeniería". */
function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** El nombre con la parte que coincide resaltada. */
function Resaltado({ texto, busqueda }: { texto: string; busqueda: string }) {
  const i = normalizar(texto).indexOf(normalizar(busqueda.trim()));
  if (!busqueda.trim() || i < 0) return <>{texto}</>;
  const fin = i + busqueda.trim().length;
  return (
    <>
      {texto.slice(0, i)}
      <mark>{texto.slice(i, fin)}</mark>
      {texto.slice(fin)}
    </>
  );
}

export default function Registro() {
  const router = useRouter();
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [escuelaSlug, setEscuelaSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aceptaReglas, setAceptaReglas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
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

  // Buscador sobre las 52 carreras de todas las escuelas: elegir la carrera ya
  // dice la escuela, y nadie tiene que saber en cual quedo la suya.
  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!catalogo || q.length < 2) return [];
    return catalogo.escuelas
      .flatMap((e) => e.carreras.map((c) => ({ ...c, escuela: e })))
      .filter((c) => normalizar(c.nombre).includes(q))
      .slice(0, 6);
  }, [catalogo, busqueda]);
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
    if (!datos.carreraSlug) {
      setError('Elige tu carrera.');
      return;
    }
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
        <Isotipo />
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

        <div className="campo">
          <span id="etiqueta-carrera">Carrera</span>
          {carreraNombre && escuela ? (
            <div className="carrera-elegida">
              <span>
                <strong>{carreraNombre}</strong>
                <small>{escuela.nombre}</small>
              </span>
              <button
                type="button"
                className="fantasma"
                onClick={() => {
                  actualizar('carreraSlug', '');
                  setEscuelaSlug('');
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <>
              <input
                type="search"
                aria-label="Busca tu carrera"
                aria-describedby="etiqueta-carrera"
                placeholder="Escribe tu carrera, p. ej. Sistemas"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {resultados.length > 0 && (
                <ul className="carrera-resultados">
                  {resultados.map((c) => (
                    <li key={c.slug}>
                      <button
                        type="button"
                        onClick={() => {
                          setEscuelaSlug(c.escuela.slug);
                          actualizar('carreraSlug', c.slug);
                          setBusqueda('');
                        }}
                      >
                        <strong>
                          <Resaltado texto={c.nombre} busqueda={busqueda} />
                        </strong>
                        <small>{c.escuela.nombre}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {busqueda.trim().length >= 2 && resultados.length === 0 && (
                <small className="tenue">Ninguna carrera se llama así. Prueba con otra palabra.</small>
              )}
            </>
          )}
        </div>

        <fieldset className="campo generaciones">
          <legend>Generación (año en que entraste)</legend>
          <div className="generaciones-opciones">
            {GENERACIONES.map((a) => (
              <label key={a} className="generacion-opcion">
                <input
                  type="radio"
                  name="generacion"
                  value={a}
                  checked={datos.generacion === String(a)}
                  onChange={(e) => actualizar('generacion', e.target.value)}
                />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </fieldset>

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

        {/* App Store (1.2) y Google Play piden que quien entra a una red con
            contenido de usuarios acepte reglas con cero tolerancia al abuso
            antes de publicar nada. Es solo una compuerta: no va al API. */}
        <label className="casilla">
          <input
            type="checkbox"
            required
            checked={aceptaReglas}
            onChange={(e) => setAceptaReglas(e.target.checked)}
          />
          <span>
            Acepto los{' '}
            <Link href="/terminos" target="_blank">
              Términos
            </Link>{' '}
            y las{' '}
            <Link href="/reglas" target="_blank">
              Reglas de la comunidad
            </Link>
            . Cero tolerancia al acoso, las amenazas y el contenido ofensivo.
          </span>
        </label>

        <button type="submit" className="grande" disabled={cargando || !aceptaReglas}>
          {cargando ? copy.registro.botonCreando : copy.registro.boton}
        </button>

        <div aria-live="polite">{error && <p className="error">{error}</p>}</div>
      </form>
    </main>
  );
}
