'use client';

import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Avatar } from '@/componentes/avatar';
import { ToggleTema } from '@/componentes/proveedor-tema';
import { SuscribirPush } from '@/componentes/suscribir-push';
import { PreferenciasNotificaciones } from '@/componentes/preferencias-notificaciones';
import { EliminarCuenta } from '@/componentes/eliminar-cuenta';

interface MiPerfil {
  handle: string;
  nombre: string;
  apellidos: string;
  bio: string | null;
  fotoUrl: string | null;
  portadaUrl: string | null;
  cumpleMes: number | null;
  cumpleDia: number | null;
  ciudadOrigen: string | null;
  instagram: string | null;
  intereses: string[];
  busco: string | null;
  visibilidad: 'UNIVERSIDAD' | 'COMUNIDADES';
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Días por mes en año bisiesto: nadie que nació el 29 de febrero se queda fuera. */
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function Ajustes() {
  const [perfil, setPerfil] = useState<MiPerfil | null>(null);
  const [bio, setBio] = useState('');
  const [mes, setMes] = useState('');
  const [dia, setDia] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [fotoMediaId, setFotoMediaId] = useState<string | null | undefined>(undefined);
  const [portadaUrl, setPortadaUrl] = useState<string | null>(null);
  const [portadaMediaId, setPortadaMediaId] = useState<string | null | undefined>(undefined);
  const [ciudad, setCiudad] = useState('');
  const [instagram, setInstagram] = useState('');
  const [busco, setBusco] = useState('');
  const [intereses, setIntereses] = useState<string[]>([]);
  const [nuevoInteres, setNuevoInteres] = useState('');
  const [visibilidad, setVisibilidad] = useState<'UNIVERSIDAD' | 'COMUNIDADES'>('UNIVERSIDAD');
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [comunidades, setComunidades] = useState<
    Array<{ slug: string; nombre: string; silenciada: boolean }>
  >([]);

  useEffect(() => {
    api<MiPerfil>('/perfil/mio')
      .then((p) => {
        setPerfil(p);
        setBio(p.bio ?? '');
        setMes(p.cumpleMes ? String(p.cumpleMes) : '');
        setDia(p.cumpleDia ? String(p.cumpleDia) : '');
        setFotoUrl(p.fotoUrl);
        setPortadaUrl(p.portadaUrl);
        setCiudad(p.ciudadOrigen ?? '');
        setInstagram(p.instagram ?? '');
        setBusco(p.busco ?? '');
        setIntereses(p.intereses ?? []);
        setVisibilidad(p.visibilidad ?? 'UNIVERSIDAD');
      })
      .catch((e) =>
        setError(
          e instanceof ErrorApi && e.estado === 404
            ? 'Todavía no tienes perfil.'
            : 'No se pudo cargar tu perfil.',
        ),
      );
    api<Array<{ slug: string; nombre: string; silenciada: boolean }>>('/perfil/mis-comunidades')
      .then(setComunidades)
      .catch(() => undefined);
  }, []);

  async function alternarSilencio(slug: string, silenciada: boolean) {
    try {
      await api(`/perfil/comunidades/${slug}`, {
        method: 'PATCH',
        body: JSON.stringify({ silenciada }),
      });
      setComunidades((previas) =>
        previas.map((c) => (c.slug === slug ? { ...c, silenciada } : c)),
      );
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo actualizar la comunidad.');
    }
  }

  /** Una sola función para foto y portada: cambia solo dónde cae el resultado. */
  async function subirImagen(archivo: File, destino: 'foto' | 'portada') {
    setSubiendo(true);
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

      if (destino === 'foto') {
        setFotoUrl(datos.url);
        setFotoMediaId(datos.id);
      } else {
        setPortadaUrl(datos.url);
        setPortadaMediaId(datos.id);
      }
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo subir la imagen.');
    } finally {
      setSubiendo(false);
    }
  }

  function agregarInteres() {
    const limpio = nuevoInteres.trim();
    if (!limpio || intereses.length >= 10) return;
    // Sin duplicados y sin distinguir mayúsculas: "Futbol" y "futbol" son lo mismo.
    if (intereses.some((i) => i.toLowerCase() === limpio.toLowerCase())) {
      setNuevoInteres('');
      return;
    }
    setIntereses([...intereses, limpio]);
    setNuevoInteres('');
  }

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    setAviso(null);
    try {
      await api('/perfil', {
        method: 'PATCH',
        body: JSON.stringify({
          bio,
          ...(fotoMediaId !== undefined ? { fotoMediaId } : {}),
          ...(portadaMediaId !== undefined ? { portadaMediaId } : {}),
          ciudadOrigen: ciudad,
          instagram,
          busco,
          intereses,
          visibilidad,
          // Mes y día viajan juntos o van los dos en null: es lo que valida el
          // contrato, y evita un cumpleaños a medias.
          cumpleMes: mes ? Number(mes) : null,
          cumpleDia: mes && dia ? Number(dia) : null,
        }),
      });
      setAviso('Guardado.');
      setFotoMediaId(undefined);
      setPortadaMediaId(undefined);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  if (!perfil) {
    return (
      <main>
        {error ? <p className="error">{error}</p> : <p className="tenue">Cargando…</p>}
      </main>
    );
  }

  const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`;
  const diasDelMes = mes ? DIAS_POR_MES[Number(mes) - 1]! : 31;

  return (
    <main>
      <h1>Tu perfil</h1>
      <p className="entradilla">
        Entre más cuentes, más fácil que alguien encuentre de qué hablarte.
      </p>

      <form className="tarjeta" onSubmit={guardar}>
        <label className="campo">
          <span>Portada</span>
          <div
            className="portada"
            style={{
              margin: '0 0 10px',
              borderRadius: 'var(--radio-chico)',
              height: 110,
              ...(portadaUrl ? { backgroundImage: `url(${portadaUrl})` } : {}),
            }}
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={subiendo}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void subirImagen(f, 'portada');
              e.target.value = '';
            }}
          />
          {portadaUrl && (
            <button
              type="button"
              className="fantasma"
              onClick={() => {
                setPortadaUrl(null);
                setPortadaMediaId(null);
              }}
            >
              Quitar portada
            </button>
          )}
        </label>

        <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
          <Avatar
            nombre={nombreCompleto}
            semilla={perfil.handle}
            tamano="grande"
            fotoUrl={fotoUrl}
          />

          <div>
            <label className="campo" style={{ marginBottom: 6 }}>
              <span>Foto de perfil</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={subiendo}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void subirImagen(f, 'foto');
                  e.target.value = '';
                }}
              />
            </label>
            {fotoUrl && (
              <button
                type="button"
                className="fantasma"
                onClick={() => {
                  setFotoUrl(null);
                  setFotoMediaId(null);
                }}
              >
                Quitar foto
              </button>
            )}
            {subiendo && <p className="tenue">Subiendo…</p>}
          </div>
        </div>

        <label className="campo">
          <span>Bio (280 caracteres)</span>
          <textarea
            rows={3}
            maxLength={280}
            placeholder="5to de LIS. Pregúntame por aventones desde Angelópolis."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </label>

        <label className="campo">
          <span>¿Qué buscas ahora mismo?</span>
          <input
            maxLength={120}
            placeholder="Equipo para el proyecto de Bases de Datos"
            value={busco}
            onChange={(e) => setBusco(e.target.value)}
          />
        </label>

        <div className="filtros">
          <label className="campo">
            <span>¿De dónde eres?</span>
            <input
              maxLength={80}
              placeholder="Veracruz"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
            />
          </label>

          <label className="campo">
            <span>Instagram</span>
            <input
              maxLength={60}
              placeholder="tu_usuario"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </label>
        </div>

        <label className="campo">
          <span>Intereses (hasta 10)</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              maxLength={30}
              placeholder="futbol, anime, café de especialidad…"
              value={nuevoInteres}
              onChange={(e) => setNuevoInteres(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  agregarInteres();
                }
              }}
            />
            <button
              type="button"
              className="secundario"
              disabled={!nuevoInteres.trim() || intereses.length >= 10}
              onClick={agregarInteres}
            >
              Añadir
            </button>
          </div>
        </label>

        {intereses.length > 0 && (
          <ul className="etiquetas" style={{ margin: '0 0 16px' }}>
            {intereses.map((i) => (
              <li key={i} className="etiqueta">
                {i}{' '}
                <button
                  type="button"
                  className="fantasma"
                  style={{ padding: '0 4px', fontSize: '0.8rem' }}
                  aria-label={`Quitar ${i}`}
                  onClick={() => setIntereses(intereses.filter((x) => x !== i))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="filtros">
          <label className="campo">
            <span>Mes de cumpleaños</span>
            <select
              value={mes}
              onChange={(e) => {
                setMes(e.target.value);
                // Si el día ya no existe en el mes nuevo, se limpia.
                if (e.target.value && Number(dia) > DIAS_POR_MES[Number(e.target.value) - 1]!) {
                  setDia('');
                }
              }}
            >
              <option value="">Prefiero no decirlo</option>
              {MESES.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="campo">
            <span>Día</span>
            <select value={dia} disabled={!mes} onChange={(e) => setDia(e.target.value)}>
              <option value="">—</option>
              {Array.from({ length: diasDelMes }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="tenue" style={{ margin: '0 0 16px' }}>
          No pedimos el año. El cumpleaños sirve para que te feliciten, no para
          que nadie sepa tu edad.
        </p>

        <label className="campo">
          <span>¿Quién ve tu perfil completo?</span>
          <select
            value={visibilidad}
            onChange={(e) => setVisibilidad(e.target.value as 'UNIVERSIDAD' | 'COMUNIDADES')}
          >
            <option value="UNIVERSIDAD">Toda la UDLAP</option>
            <option value="COMUNIDADES">Solo quien comparta comunidad conmigo</option>
          </select>
        </label>

        <p className="tenue" style={{ margin: '0 0 16px' }}>
          Con la opción restringida, los demás solo ven tu nombre, tu carrera y
          tu foto. Nada de bio, intereses, cumpleaños ni publicaciones.
        </p>

        <div className="tarjeta" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong>Apariencia</strong>
            <p className="tenue" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
              Cambia entre modo claro y oscuro.
            </p>
          </div>
          <ToggleTema />
        </div>

        {comunidades.length > 0 && (
          <div className="tarjeta" style={{ marginBottom: 16 }}>
            <strong>Comunidades en tu feed</strong>
            <p className="tenue" style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
              Silencia una comunidad para dejar de ver sus publicaciones en el feed general.
              Sigues perteneciendo a ella.
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {comunidades.map((c) => (
                <li
                  key={c.slug}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <span style={{ minWidth: 0 }}>{c.nombre}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span className="tenue" style={{ fontSize: '0.8rem' }}>
                      {c.silenciada ? 'Silenciada' : 'Visible'}
                    </span>
                    <input
                      type="checkbox"
                      checked={c.silenciada}
                      onChange={(e) => alternarSilencio(c.slug, e.target.checked)}
                      aria-label={`Silenciar ${c.nombre}`}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="tarjeta" style={{ marginBottom: 16 }}>
          <strong>Tipos de notificación</strong>
          <p className="tenue" style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
            Elige qué avisos quieres ver en la app y cuáles por push.
          </p>
          <PreferenciasNotificaciones />
        </div>

        <div className="tarjeta" style={{ marginBottom: 16 }}>
          <strong>Notificaciones push</strong>
          <p className="tenue" style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
            Recibe avisos en tu teléfono o computadora aunque no tengas Ágora abierta.
          </p>
          <SuscribirPush />
        </div>

        <button type="submit" className="grande" disabled={guardando}>
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>

        {aviso && <p className="nota" style={{ marginTop: 14, marginBottom: 0 }}>{aviso}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      <EliminarCuenta handle={perfil.handle} />
    </main>
  );
}
