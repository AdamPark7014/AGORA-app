'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use, useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { sesion } from '@/lib/sesion';
import { copy } from '@/lib/copy';
import { Avatar } from '@/componentes/avatar';
import { MessageCircle, Settings } from '@/componentes/iconos';
import { TiempoRelativo } from '@/componentes/tiempo';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { EsqueletoPerfil } from '@/componentes/esqueleto';
import { UserX, Inbox, Cake, Lock } from 'lucide-react';
import { RachaBadges } from '@/componentes/racha-badges';
import { TIPOS_RETO_AMIGO } from '@agora/contracts';
import { atributosImagen } from '@/lib/imagen';
import {
  crearReto,
  etiquetaTipoReto,
  puedeRetar,
  refrescarRetosEnFeed,
  type TipoRetoAmigo,
} from '@/lib/retos';

interface Perfil {
  handle: string;
  nombre: string;
  apellidos: string;
  bio?: string | null;
  fotoUrl: string | null;
  portadaUrl?: string | null;
  ciudadOrigen?: string | null;
  instagram?: string | null;
  intereses?: string[];
  busco?: string | null;
  cumpleMes?: number | null;
  cumpleDia?: number | null;
  seguidores?: number;
  siguiendo?: number;
  publicaciones?: number;
  generacion?: number | null;
  escuela?: string | null;
  carrera?: string | null;
  departamento?: string | null;
  colegio?: string | null;
  suspendido?: boolean;
  restringido?: boolean;
  yoLeSigo?: boolean;
  verificado?: boolean;
}

interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  comunidad: string;
  numComments: number;
  numReactions: number;
  media?: Array<{ url: string; thumbUrl?: string | null; ancho?: number | null; esVideo: boolean }>;
}

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export default function PaginaPerfil({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const router = useRouter();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [siguienteCursor, setSiguienteCursor] = useState<string | null>(null);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yo, setYo] = useState<string | null>(null);
  const [siguiendo, setSiguiendo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [pestana, setPestana] = useState<'publicaciones' | 'info'>('publicaciones');
  const [bloqueado, setBloqueado] = useState(false);
  const [silenciado, setSilenciado] = useState(false);
  const [listaSocial, setListaSocial] = useState<'seguidores' | 'siguiendo' | null>(null);
  const [personasLista, setPersonasLista] = useState<Array<{ handle: string; nombre: string; fotoUrl: string | null; verificado?: boolean }>>([]);
  const [puedeRetarInfo, setPuedeRetarInfo] = useState<{ puedeRetar: boolean; motivo?: string } | null>(null);
  const [modalRetar, setModalRetar] = useState(false);
  const [tipoReto, setTipoReto] = useState<TipoRetoAmigo>('RACHA');
  const [enviandoReto, setEnviandoReto] = useState(false);
  const [avisoReto, setAvisoReto] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const datos = await api<Perfil>(`/perfil/${handle}`);
      setPerfil(datos);
      setSiguiendo(datos.yoLeSigo ?? false);
      if (!datos.restringido) {
        const p = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
          `/perfil/${handle}/publicaciones`,
        );
        setPublicaciones(p.publicaciones);
        setSiguienteCursor(p.siguienteCursor);
      } else {
        setPublicaciones([]);
        setSiguienteCursor(null);
      }
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 404
          ? copy.perfil.noExiste.titulo
          : copy.perfil.errores.cargar,
      );
    }
  }, [handle]);

  useEffect(() => {
    void cargar();
    sesion()
      .then((u) => setYo(u.handle))
      .catch(() => undefined);
  }, [cargar]);

  useEffect(() => {
    if (!perfil || perfil.restringido || yo === handle) return;
    api<{ bloqueado: boolean; silenciado: boolean }>(`/bloqueos/${handle}`)
      .then((b) => {
        setBloqueado(b.bloqueado);
        setSilenciado(b.silenciado);
      })
      .catch(() => undefined);
  }, [perfil, yo, handle]);

  useEffect(() => {
    if (!perfil || perfil.restringido || yo === handle || bloqueado) {
      setPuedeRetarInfo(null);
      return;
    }
    puedeRetar(handle)
      .then(setPuedeRetarInfo)
      .catch(() => setPuedeRetarInfo({ puedeRetar: false }));
  }, [perfil, yo, handle, bloqueado]);

  async function cargarMasPublicaciones() {
    if (!siguienteCursor || cargandoMas) return;
    setCargandoMas(true);
    try {
      const p = await api<{ publicaciones: Publicacion[]; siguienteCursor: string | null }>(
        `/perfil/${handle}/publicaciones?cursor=${siguienteCursor}`,
      );
      setPublicaciones((prev) => [...prev, ...p.publicaciones]);
      setSiguienteCursor(p.siguienteCursor);
    } catch {
      // Silencioso.
    } finally {
      setCargandoMas(false);
    }
  }

  async function escribir() {
    setOcupado(true);
    try {
      const { id } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle }),
      });
      router.push(`/mensajes/${id}`);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.');
      setOcupado(false);
    }
  }

  async function alternarSeguir() {
    setOcupado(true);
    try {
      const r = await api<{ siguiendo: boolean }>(`/perfil/${handle}/seguir`, { method: 'POST' });
      setSiguiendo(r.siguiendo);
      setPerfil((p) =>
        p ? { ...p, seguidores: (p.seguidores ?? 0) + (r.siguiendo ? 1 : -1) } : p,
      );
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo seguir.');
    } finally {
      setOcupado(false);
    }
  }

  async function alternarBloqueo(soloSilencio: boolean) {
    setOcupado(true);
    try {
      if ((soloSilencio && silenciado) || (!soloSilencio && bloqueado)) {
        await api(`/bloqueos/${handle}`, { method: 'DELETE' });
        setBloqueado(false);
        setSilenciado(false);
      } else {
        await api(`/bloqueos/${handle}`, {
          method: 'POST',
          body: JSON.stringify({ soloSilencio }),
        });
        setBloqueado(!soloSilencio);
        setSilenciado(soloSilencio);
      }
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo actualizar.');
    } finally {
      setOcupado(false);
    }
  }

  async function abrirLista(tipo: 'seguidores' | 'siguiendo') {
    setListaSocial(tipo);
    try {
      const datos = await api<{ personas: Array<{ handle: string; nombre: string; fotoUrl: string | null; verificado?: boolean }> }>(
        `/perfil/${handle}/${tipo}`,
      );
      setPersonasLista(datos.personas);
    } catch {
      setPersonasLista([]);
    }
  }

  async function enviarReto() {
    setEnviandoReto(true);
    setError(null);
    setAvisoReto(null);
    try {
      await crearReto({ retadoHandle: handle, tipo: tipoReto });
      setModalRetar(false);
      setAvisoReto('Reto enviado. A ver si le entra.');
      setPuedeRetarInfo({
        puedeRetar: false,
        motivo: 'Ya tienes un reto pendiente o activo con esa persona.',
      });
      refrescarRetosEnFeed();
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo enviar el reto.');
    } finally {
      setEnviandoReto(false);
    }
  }

  if (error && !perfil) {
    return (
      <main>
        <EstadoVacio icono={UserX} titulo={error}>
          {copy.perfil.noExiste.texto}
        </EstadoVacio>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main>
        <EsqueletoPerfil />
      </main>
    );
  }

  const nombreCompleto = `${perfil.nombre} ${perfil.apellidos}`;
  const esMio = yo === perfil.handle;
  const privado = perfil.restringido === true;

  const etiquetas = [
    perfil.carrera && { texto: perfil.carrera, clase: 'etiqueta naranja' },
    perfil.escuela && { texto: perfil.escuela, clase: 'etiqueta' },
    perfil.departamento && { texto: perfil.departamento, clase: 'etiqueta' },
    perfil.generacion && { texto: `Generación ${perfil.generacion}`, clase: 'etiqueta aqua' },
    perfil.colegio && { texto: `Colegio ${perfil.colegio}`, clase: 'etiqueta oro' },
  ].filter(Boolean) as Array<{ texto: string; clase: string }>;

  if (privado) {
    return (
      <main>
        <div className="tarjeta perfil-tarjeta">
          <div className="perfil-cabeza">
            <span className="perfil-avatar">
              <Avatar
                nombre={nombreCompleto}
                semilla={perfil.handle}
                tamano="grande"
                fotoUrl={perfil.fotoUrl}
                anillo="aqua"
                verificado={perfil.verificado}
              />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ marginBottom: 2 }}>{nombreCompleto}</h1>
              <p className="tenue" style={{ margin: 0 }}>@{perfil.handle}</p>
            </div>
          </div>
          {perfil.carrera && (
            <p className="tenue" style={{ marginTop: 12 }}>
              {perfil.carrera}
              {perfil.escuela ? ` · ${perfil.escuela}` : ''}
            </p>
          )}
        </div>
        <EstadoVacio icono={Lock} titulo={copy.perfil.privado.titulo}>
          {copy.perfil.privado.texto}
        </EstadoVacio>
      </main>
    );
  }

  return (
    <main>
      <div className="tarjeta perfil-tarjeta">
        {/* Portada: si no hay imagen, un degradado con los colores UDLAP. */}
        <div
          className="portada"
          style={
            perfil.portadaUrl
              ? { backgroundImage: `url(${perfil.portadaUrl})` }
              : undefined
          }
        />

        <div className="perfil-cabeza">
          <span className="perfil-avatar">
            <Avatar
              nombre={nombreCompleto}
              semilla={perfil.handle}
              tamano="grande"
              fotoUrl={perfil.fotoUrl}
              anillo="aqua"
              verificado={perfil.verificado}
            />
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ marginBottom: 2 }}>{nombreCompleto}</h1>
            <p className="tenue" style={{ margin: 0 }}>
              @{perfil.handle}
              {perfil.ciudadOrigen && ` · 📍 ${perfil.ciudadOrigen}`}
            </p>
          </div>
        </div>

        {perfil.suspendido && <p className="error">Esta cuenta está suspendida.</p>}

        {perfil.bio && <p style={{ marginTop: 14 }}>{perfil.bio}</p>}

        {perfil.busco && (
          <p className="busco">
            <strong>Busco:</strong> {perfil.busco}
          </p>
        )}

        <div className="perfil-cifras">
          <div className="perfil-cifra">
            <strong>{perfil.publicaciones ?? 0}</strong>
            <span className="tenue">publicaciones</span>
          </div>
          <button type="button" className="perfil-cifra" onClick={() => abrirLista('seguidores')}>
            <strong>{perfil.seguidores ?? 0}</strong>
            <span className="tenue">seguidores</span>
          </button>
          <button type="button" className="perfil-cifra" onClick={() => abrirLista('siguiendo')}>
            <strong>{perfil.siguiendo ?? 0}</strong>
            <span className="tenue">siguiendo</span>
          </button>
        </div>

        <div className="acciones" style={{ marginTop: 16 }}>
          {esMio ? (
            <Link href="/ajustes" className="reaccion" style={{ textDecoration: 'none' }}>
              <Settings size={16} strokeWidth={1.75} aria-hidden="true" style={{ marginRight: 4 }} />
              Editar perfil
            </Link>
          ) : (
            <>
              <button type="button" disabled={ocupado} onClick={alternarSeguir}>
                {siguiendo ? '✓ Siguiendo' : '＋ Seguir'}
              </button>
              <button type="button" className="secundario" disabled={ocupado} onClick={escribir}>
                <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" style={{ marginRight: 4, verticalAlign: -2 }} />
                Escribirle
              </button>
              {puedeRetarInfo?.puedeRetar && (
                <button
                  type="button"
                  className="secundario"
                  disabled={ocupado}
                  onClick={() => {
                    setTipoReto('RACHA');
                    setModalRetar(true);
                  }}
                >
                  ⚔️ Retar
                </button>
              )}
              <button type="button" className="fantasma" disabled={ocupado} onClick={() => alternarBloqueo(true)}>
                {silenciado ? 'Dejar de silenciar' : 'Silenciar'}
              </button>
              <button type="button" className="fantasma" disabled={ocupado} onClick={() => alternarBloqueo(false)}>
                {bloqueado ? 'Desbloquear' : 'Bloquear'}
              </button>
            </>
          )}
          {perfil.instagram && (
            <a
              className="reaccion"
              style={{ textDecoration: 'none' }}
              href={`https://instagram.com/${perfil.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              📷 @{perfil.instagram}
            </a>
          )}
        </div>
        {avisoReto && <p className="nota" style={{ marginTop: 12, marginBottom: 0 }}>{avisoReto}</p>}
      </div>

      <RachaBadges
        handle={esMio ? undefined : handle}
        mostrarCompartir={esMio}
      />

      <div className="pestanas-perfil">
        <button
          type="button"
          className={pestana === 'publicaciones' ? 'pestana-perfil activa' : 'pestana-perfil'}
          onClick={() => setPestana('publicaciones')}
        >
          Publicaciones
        </button>
        <button
          type="button"
          className={pestana === 'info' ? 'pestana-perfil activa' : 'pestana-perfil'}
          onClick={() => setPestana('info')}
        >
          Información
        </button>
      </div>

      {pestana === 'info' ? (
        <div className="tarjeta">
          <ul className="etiquetas" style={{ margin: 0 }}>
            {etiquetas.map((e) => (
              <li key={e.texto} className={e.clase}>
                {e.texto}
              </li>
            ))}
          </ul>

          {perfil.intereses && perfil.intereses.length > 0 && (
            <>
              <p className="panel-titulo" style={{ margin: '20px 0 8px' }}>
                Le interesa
              </p>
              <ul className="etiquetas" style={{ margin: 0 }}>
                {perfil.intereses.map((i) => (
                  <li key={i} className="etiqueta">
                    {i}
                  </li>
                ))}
              </ul>
            </>
          )}

          {perfil.cumpleMes && perfil.cumpleDia && (
            <p className="tenue" style={{ marginTop: 18, marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Cake size={16} strokeWidth={1.75} aria-hidden="true" />
              Cumple el {perfil.cumpleDia} de {MESES[perfil.cumpleMes - 1]}
            </p>
          )}
        </div>
      ) : publicaciones.length === 0 ? (
        <EstadoVacio
          icono={Inbox}
          titulo={esMio ? copy.perfil.vacio.mio.titulo : copy.perfil.vacio.otro.titulo}
          accion={
            esMio ? { etiqueta: copy.perfil.vacio.mio.cta, href: '/feed' } : undefined
          }
        >
          {esMio ? copy.perfil.vacio.mio.texto : copy.perfil.vacio.otro.texto}
        </EstadoVacio>
      ) : (
        <ul className="lista">
          {publicaciones.map((p) => (
            <li key={p.id} className="tarjeta">
              <p className="pub-meta" style={{ margin: '0 0 8px' }}>
                <TiempoRelativo fecha={p.createdAt} /> · {p.comunidad}
              </p>
              {p.media && p.media.length > 0 && (
                <div className={`galeria n${Math.min(p.media.length, 4)}`} style={{ marginBottom: 10 }}>
                  {p.media.slice(0, 4).map((m) =>
                    m.esVideo ? (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video key={m.url} src={m.url} controls preload="metadata" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={m.url}
                        {...atributosImagen(m, Math.min(p.media?.length ?? 1, 4))}
                        alt=""
                        loading="lazy"
                      />
                    ),
                  )}
                </div>
              )}
              <p className="pub-texto" style={{ marginBottom: 10 }}>
                {p.texto}
              </p>
              <Link href={`/publicacion/${p.id}`} className="pub-cuentas">
                {p.numReactions} reacciones · {p.numComments} comentarios
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pestana === 'publicaciones' && siguienteCursor && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button type="button" className="secundario" disabled={cargandoMas} onClick={cargarMasPublicaciones}>
            {cargandoMas ? copy.cargando.general : 'Cargar más publicaciones'}
          </button>
        </div>
      )}

      {listaSocial && (
        <div className="lightbox-fondo" role="dialog" aria-modal="true" onClick={() => setListaSocial(null)}>
          <div className="tarjeta" style={{ width: 'min(420px, 96vw)', maxHeight: '70vh', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>
              {listaSocial === 'seguidores' ? 'Seguidores' : 'Siguiendo'}
            </h2>
            {personasLista.length === 0 ? (
              <p className="tenue">Nadie por aquí todavía.</p>
            ) : (
              <ul className="lista" style={{ margin: 0 }}>
                {personasLista.map((p) => (
                  <li key={p.handle}>
                    <Link href={`/perfil/${p.handle}`} className="persona" onClick={() => setListaSocial(null)}>
                      <Avatar nombre={p.nombre} semilla={p.handle} fotoUrl={p.fotoUrl} verificado={p.verificado} />
                      <span>
                        <span className="persona-nombre">{p.nombre}</span>
                        <br />
                        <span className="tenue">@{p.handle}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="fantasma" style={{ marginTop: 12 }} onClick={() => setListaSocial(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}

      {modalRetar && (
        <div
          className="lightbox-fondo"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-reto-titulo"
          onClick={() => setModalRetar(false)}
        >
          <div
            className="tarjeta modal-reto"
            style={{ width: 'min(420px, 96vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-reto-titulo" style={{ marginTop: 0 }}>
              Retar a @{handle}
            </h2>
            <p className="tenue" style={{ marginTop: 0 }}>
              Elige de qué quieres competir esta semana.
            </p>

            <div className="modal-reto-opciones" role="radiogroup" aria-label="Tipo de reto">
              {TIPOS_RETO_AMIGO.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  role="radio"
                  aria-checked={tipoReto === tipo}
                  className={`modal-reto-opcion${tipoReto === tipo ? ' activa' : ''}`}
                  onClick={() => setTipoReto(tipo)}
                >
                  {etiquetaTipoReto(tipo)}
                </button>
              ))}
            </div>

            <div className="acciones" style={{ marginTop: 16 }}>
              <button type="button" disabled={enviandoReto} onClick={() => void enviarReto()}>
                {enviandoReto ? 'Enviando…' : 'Enviar reto'}
              </button>
              <button type="button" className="fantasma" disabled={enviandoReto} onClick={() => setModalRetar(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
