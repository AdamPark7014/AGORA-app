'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { TiempoRelativo } from '@/componentes/tiempo';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EstadoError } from '@/componentes/estado-error';
import { EsqueletoLista } from '@/componentes/esqueleto';
import { EyeOff, Flag, Lock } from '@/componentes/iconos';

interface Anonima {
  id: string;
  texto: string;
  estado: string;
  createdAt: string;
  alias: string;
  esMio: boolean;
  numComments: number;
  numReactions: number;
  miReaccion: string | null;
}

const REACCIONES = [
  { tipo: 'ME_LATE', etiqueta: 'Me late', emoji: '🔥' },
  { tipo: 'ME_RIO', etiqueta: 'Me río', emoji: '😂' },
  { tipo: 'APOYO', etiqueta: 'Apoyo', emoji: '🤝' },
] as const;

const MOTIVOS_REPORTE = [
  { valor: 'INTIMIDAD_SEXUAL', etiqueta: 'Contenido íntimo sin permiso' },
  { valor: 'DATOS_PERSONALES', etiqueta: 'Datos personales' },
  { valor: 'AMENAZA_VIOLENCIA', etiqueta: 'Amenaza de violencia' },
  { valor: 'ACOSO_DIRIGIDO', etiqueta: 'Acoso dirigido' },
  { valor: 'SUPLANTACION', etiqueta: 'Suplantación' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

const MAX = 600;

export default function Anonimo() {
  const [habilitada, setHabilitada] = useState<boolean | null>(null);
  const [alias, setAlias] = useState<string | null>(null);
  const [posts, setPosts] = useState<Anonima[]>([]);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [leidoReglas, setLeidoReglas] = useState(false);
  const [reportando, setReportando] = useState<string | null>(null);
  const [avisoReporte, setAvisoReporte] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setErrorCarga(false);
    try {
      const d = await api<{ publicaciones: Anonima[] }>('/anonimo');
      setPosts(d.publicaciones);
    } catch (e) {
      if (!(e instanceof ErrorApi && e.estado === 503)) {
        setErrorCarga(true);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Se lee el estado antes que nada: si la zona está apagada, no se pide ni
    // el alias ni el feed.
    api<{ habilitada: boolean }>('/anonimo/estado')
      .then(async (e) => {
        setHabilitada(e.habilitada);
        if (!e.habilitada) {
          setCargando(false);
          return;
        }
        await cargar();
        const a = await api<{ alias: string }>('/anonimo/alias');
        setAlias(a.alias);
      })
      .catch(() => {
        setHabilitada(false);
        setCargando(false);
      });

    setLeidoReglas(localStorage.getItem('agora:reglas-anonimo') === 'visto');
  }, [cargar]);

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    setAviso(null);
    try {
      const r = await api<{ aviso: string | null }>('/anonimo', {
        method: 'POST',
        body: JSON.stringify({ texto }),
      });
      setTexto('');
      if (r.aviso) setAviso(r.aviso);
      await cargar();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  async function reaccionar(id: string, tipo: string) {
    try {
      const { miReaccion } = await api<{ miReaccion: string | null }>(
        `/posts/${id}/reacciones`,
        { method: 'POST', body: JSON.stringify({ tipo }) },
      );
      setPosts((previos) =>
        previos.map((p) =>
          p.id === id
            ? {
                ...p,
                miReaccion,
                numReactions:
                  p.numReactions + (miReaccion && !p.miReaccion ? 1 : !miReaccion ? -1 : 0),
              }
            : p,
        ),
      );
    } catch {
      setError('No se pudo reaccionar.');
    }
  }

  async function reportar(postId: string, motivo: string) {
    setReportando(null);
    setError(null);
    try {
      const r = await api<{ yaExistia: boolean }>('/reportes', {
        method: 'POST',
        body: JSON.stringify({ postId, motivo }),
      });
      setAvisoReporte(
        r.yaExistia
          ? 'Ya habías reportado esto. Un moderador lo va a ver.'
          : 'Gracias. Un moderador lo va a revisar.',
      );
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo reportar.');
    }
  }

  if (habilitada === false) {
    return (
      <main>
        <EncabezadoPagina titulo="Sin nombre" />
        <EstadoVacio icono={Lock} titulo="Esta zona está apagada">
          Solo se enciende con moderación previa configurada. No se publica sin filtro aquí.
        </EstadoVacio>
      </main>
    );
  }

  return (
    <main>
      <div className="anonimo-banner">
        <strong>Zona anónima</strong>
        <p style={{ margin: '6px 0 0', fontSize: '0.88rem', opacity: 0.9 }}>
          Publicas como <strong>{alias ?? '…'}</strong>. Tu identidad real no se muestra, pero sí
          queda registrada para moderación.
        </p>
      </div>

      <EncabezadoPagina
        titulo="Sin nombre"
        entradilla="Lo que no te atreves a firmar. Tu alias no cambia."
      />

      {!leidoReglas && (
        <div className="tarjeta reglas-anonimo">
          <h2>Antes de escribir, tres cosas</h2>
          <ul>
            <li>
              <strong>Nadie ve tu nombre, pero Ágora sí lo sabe.</strong> El
              anonimato es frente a otros usuarios, no frente a nosotros ni
              frente a una autoridad. En México quien aloja el contenido
              comparte la responsabilidad.
            </li>
            <li>
              <strong>Todo pasa por el filtro antes de publicarse.</strong> Aquí
              no se publica primero y se revisa después.
            </li>
            <li>
              <strong>No cuentes cosas que solo tú podrías saber.</strong> Tu
              alias no cambia, y juntando detalles cualquiera te identifica.
            </li>
          </ul>
          <p className="tenue">
            Criticar, quejarte y burlarte está permitido. Nombres, direcciones,
            fotos íntimas y amenazas no.
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('agora:reglas-anonimo', 'visto');
              setLeidoReglas(true);
            }}
          >
            Entendido
          </button>
        </div>
      )}

      <form className="tarjeta" onSubmit={publicar}>
        <label className="campo" style={{ marginBottom: 8 }}>
          <span>Publicas como {alias ?? '…'}</span>
          <textarea
            rows={3}
            maxLength={MAX}
            required
            placeholder="Di lo que piensas. Sin nombres de nadie."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>

        <div className="acciones">
          <button type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? 'Publicando…' : 'Publicar sin nombre'}
          </button>
          <span className="tenue" style={{ marginLeft: 'auto' }}>
            {MAX - texto.length}
          </span>
        </div>

        {aviso && <p className="nota" style={{ marginTop: 12, marginBottom: 0 }}>{aviso}</p>}
        {avisoReporte && <p className="nota" style={{ marginTop: 12, marginBottom: 0 }}>{avisoReporte}</p>}
        {error && <p className="error">{error}</p>}
      </form>

      {cargando && <EsqueletoLista cantidad={3} />}

      {errorCarga && (
        <EstadoError onReintentar={() => void cargar()}>No se pudo cargar la zona sin nombre.</EstadoError>
      )}

      {!cargando && !errorCarga && posts.length === 0 && (
        <EstadoVacio icono={EyeOff} titulo="Todavía nadie ha dicho nada">
          Alguien tiene que empezar.
        </EstadoVacio>
      )}

      <ul className="lista">
        {posts.map((p) => (
          <li key={p.id} className="tarjeta tarjeta-interactiva">
            <div className="pub-cabeza">
              {/* Sin avatar de persona: aquí no hay cara, y poner una genérica
                  sugeriría una identidad que no existe. */}
              <span className="alias-marca" aria-hidden="true">
                {p.alias.charAt(0)}
              </span>
              <div className="pub-identidad">
                <span className="pub-autor">
                  {p.alias}
                  {p.esMio && ' · tú'}
                </span>
                <div className="pub-meta">
                  <TiempoRelativo fecha={p.createdAt} />
                  {p.estado === 'EN_REVISION' && ' · en revisión'}
                </div>
              </div>
            </div>

            <p className="pub-texto">{p.texto}</p>

            <div className="pub-pie">
              {REACCIONES.map((r) => (
                <button
                  key={r.tipo}
                  type="button"
                  className="reaccion"
                  aria-pressed={p.miReaccion === r.tipo}
                  onClick={() => reaccionar(p.id, r.tipo)}
                >
                  <span className="reaccion-emoji" aria-hidden="true">{r.emoji}</span>
                  {r.etiqueta}
                </button>
              ))}
              <button
                type="button"
                className="reaccion"
                title="Reportar"
                aria-label="Reportar publicación"
                aria-expanded={reportando === p.id}
                onClick={() => setReportando(reportando === p.id ? null : p.id)}
              >
                <Flag size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {p.numReactions > 0 && (
                <span className="pub-cuentas">{p.numReactions}</span>
              )}
              <Link href={`/publicacion/${p.id}`} className="pub-cuentas" style={{ marginLeft: 'auto' }}>
                {p.numComments === 0
                  ? 'Comentar'
                  : `${p.numComments} ${p.numComments === 1 ? 'comentario' : 'comentarios'}`}
              </Link>
            </div>

            {reportando === p.id && (
              <div className="encuesta" style={{ marginTop: 12, marginBottom: 0 }}>
                <p className="encuesta-pregunta">¿Por qué lo reportas?</p>
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                  {MOTIVOS_REPORTE.map((m) => (
                    <button
                      key={m.valor}
                      type="button"
                      className="reaccion"
                      onClick={() => reportar(p.id, m.valor)}
                    >
                      {m.etiqueta}
                    </button>
                  ))}
                  <button type="button" className="fantasma" onClick={() => setReportando(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
