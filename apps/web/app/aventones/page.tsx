'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { notificarInsigniasNuevas } from '@/lib/gamificacion';
import type { BadgeCodigo } from '@agora/contracts';
import { Avatar } from '@/componentes/avatar';
import { EncabezadoPagina } from '@/componentes/encabezado-pagina';
import { EstadoVacio } from '@/componentes/estado-vacio';
import { Car, X, MessageCircle } from '@/componentes/iconos';
import { Clock } from 'lucide-react';

interface Aventon {
  id: string;
  sentido: 'A_CAMPUS' | 'DESDE_CAMPUS';
  origen: string;
  destino: string;
  salidaAt: string;
  lugares: number;
  ocupados: number;
  cuotaMxn: number;
  nota: string | null;
  conductor: { handle: string; nombre: string; fotoUrl: string | null } | null;
  voyYo: boolean;
  esMio: boolean;
}

function mananaTemprano(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(7, 30, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function Aventones() {
  const router = useRouter();
  const [aventones, setAventones] = useState<Aventon[]>([]);
  const [sentido, setSentido] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [nuevo, setNuevo] = useState({
    sentido: 'A_CAMPUS',
    origen: '',
    destino: 'Campus UDLAP',
    salidaAt: mananaTemprano(),
    lugares: '3',
    cuotaMxn: '25',
    nota: '',
  });

  const cargar = useCallback(async (filtro: string) => {
    setCargando(true);
    setError(null);
    try {
      const q = filtro ? `?sentido=${filtro}` : '';
      const datos = await api<{ aventones: Aventon[] }>(`/aventones${q}`);
      setAventones(datos.aventones);
    } catch (e) {
      setError(
        e instanceof ErrorApi && e.estado === 401
          ? 'Necesitas iniciar sesión.'
          : 'No se pudieron cargar los aventones.',
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar(sentido);
  }, [sentido, cargar]);

  function actualizar(campo: keyof typeof nuevo, valor: string) {
    setNuevo((previo) => {
      // Al invertir el sentido se intercambian origen y destino: nadie quiere
      // volver a escribir "Campus UDLAP" cada vez.
      if (campo === 'sentido' && valor !== previo.sentido) {
        return { ...previo, sentido: valor, origen: previo.destino, destino: previo.origen };
      }
      return { ...previo, [campo]: valor };
    });
  }

  async function publicar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const resp = await api<{ nuevasInsignias?: BadgeCodigo[] }>('/aventones', {
        method: 'POST',
        body: JSON.stringify({
          sentido: nuevo.sentido,
          origen: nuevo.origen,
          destino: nuevo.destino,
          salidaAt: new Date(nuevo.salidaAt).toISOString(),
          lugares: Number(nuevo.lugares),
          cuotaMxn: Number(nuevo.cuotaMxn || 0),
          ...(nuevo.nota ? { nota: nuevo.nota } : {}),
        }),
      });
      notificarInsigniasNuevas(resp.nuevasInsignias);
      setAbierto(false);
      setNuevo((p) => ({ ...p, nota: '' }));
      await cargar(sentido);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo publicar.');
    } finally {
      setEnviando(false);
    }
  }

  async function escribir(handle: string) {
    try {
      const { id } = await api<{ id: string }>('/mensajes/abrir', {
        method: 'POST',
        body: JSON.stringify({ handle }),
      });
      router.push(`/mensajes/${id}`);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo abrir el chat.');
    }
  }

  async function apartar(id: string) {
    try {
      const r = await api<{ voyYo: boolean; ocupados: number }>(`/aventones/${id}/asiento`, {
        method: 'POST',
      });
      setAventones((previos) =>
        previos.map((a) => (a.id === id ? { ...a, voyYo: r.voyYo, ocupados: r.ocupados } : a)),
      );
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo apartar.');
    }
  }

  return (
    <main>
      <EncabezadoPagina
        titulo="Aventones"
        entradilla="El camión son $16 por viaje y no corre fines de semana. Compartan coche."
        acciones={
          <button type="button" onClick={() => setAbierto((v) => !v)}>
            {abierto ? (
              <>
                <X size={18} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -3 }} />
                Cancelar
              </>
            ) : (
              <>
                <Car size={18} strokeWidth={1.75} style={{ marginRight: 6, verticalAlign: -3 }} />
                Ofrecer aventón
              </>
            )}
          </button>
        }
      />

      <div className="ruta-visual" aria-hidden="true">
        <span className="ruta-punto" />
        <span className="ruta-linea" />
        <span className="ruta-punto destino" />
      </div>
      <p className="tenue" style={{ textAlign: 'center', margin: '0 0 18px', fontSize: '0.85rem' }}>
        Puebla ↔ Cholula · El bus no corre fines de semana
      </p>
      <p className="tenue" style={{ textAlign: 'center', margin: '-10px 0 18px', fontSize: '0.8rem' }}>
        Antes de subirte, avísale a alguien a dónde vas y con quién.{' '}
        <Link href="/reglas">Consejos de seguridad</Link>
      </p>

      <div className="acciones" style={{ marginBottom: 18 }}>
        <select
          className="selector-pastilla"
          aria-label="Filtrar por sentido"
          value={sentido}
          onChange={(e) => setSentido(e.target.value)}
        >
          <option value="">Los dos sentidos</option>
          <option value="A_CAMPUS">Hacia el campus</option>
          <option value="DESDE_CAMPUS">Desde el campus</option>
        </select>
      </div>

      {abierto && (
        <form className="tarjeta" style={{ marginBottom: 20 }} onSubmit={publicar}>
          <label className="campo">
            <span>Sentido</span>
            <select
              value={nuevo.sentido}
              onChange={(e) => actualizar('sentido', e.target.value)}
            >
              <option value="A_CAMPUS">Hacia el campus</option>
              <option value="DESDE_CAMPUS">Desde el campus</option>
            </select>
          </label>

          <div className="filtros">
            <label className="campo">
              <span>Salgo de</span>
              <input
                required
                maxLength={120}
                placeholder="Angelópolis"
                value={nuevo.origen}
                onChange={(e) => actualizar('origen', e.target.value)}
              />
            </label>
            <label className="campo">
              <span>Llego a</span>
              <input
                required
                maxLength={120}
                placeholder="Campus UDLAP"
                value={nuevo.destino}
                onChange={(e) => actualizar('destino', e.target.value)}
              />
            </label>
          </div>

          <div className="filtros">
            <label className="campo">
              <span>Salida</span>
              <input
                type="datetime-local"
                required
                value={nuevo.salidaAt}
                onChange={(e) => actualizar('salidaAt', e.target.value)}
              />
            </label>
            <label className="campo">
              <span>Lugares</span>
              <input
                type="number"
                min={1}
                max={7}
                required
                value={nuevo.lugares}
                onChange={(e) => actualizar('lugares', e.target.value)}
              />
            </label>
            <label className="campo">
              <span>Cooperación c/u</span>
              <input
                type="number"
                min={0}
                placeholder="25"
                value={nuevo.cuotaMxn}
                onChange={(e) => actualizar('cuotaMxn', e.target.value)}
              />
            </label>
          </div>

          <label className="campo">
            <span>Nota (opcional)</span>
            <input
              maxLength={500}
              placeholder="Salgo puntual, aviso por chat si me atraso"
              value={nuevo.nota}
              onChange={(e) => actualizar('nota', e.target.value)}
            />
          </label>

          <button type="submit" className="grande" disabled={enviando}>
            {enviando ? 'Publicando…' : 'Publicar aventón'}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      )}

      {error && !abierto && <p className="error">{error}</p>}

      {!cargando && aventones.length === 0 && !error && (
        <EstadoVacio icono={Car} titulo="No hay aventones publicados">
          Si manejas, ofrece uno. Alguien de tu zona lo va a agradecer.
        </EstadoVacio>
      )}

      <ul className="lista">
        {aventones.map((a) => {
          const salida = new Date(a.salidaAt);
          const libres = a.lugares - a.ocupados;
          return (
            <li
              key={a.id}
              className={`tarjeta tarjeta-aventon tarjeta-interactiva ${a.sentido === 'DESDE_CAMPUS' ? 'desde-campus' : ''}`}
            >
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span className={a.sentido === 'A_CAMPUS' ? 'etiqueta naranja' : 'etiqueta aqua'}>
                  {a.sentido === 'A_CAMPUS' ? '→ Al campus' : '← Desde el campus'}
                </span>
                <strong style={{ fontSize: '1.05rem' }}>
                  {a.origen} → {a.destino}
                </strong>
              </div>

              <p className="tenue" style={{ margin: '8px 0 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Clock size={14} strokeWidth={1.75} aria-hidden="true" />
                {salida.toLocaleDateString('es-MX', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                a las{' '}
                {salida.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {a.cuotaMxn === 0 ? 'Gratis' : `$${a.cuotaMxn} c/u`}
                {' · '}
                <strong style={{ color: libres > 0 ? 'var(--aqua)' : 'var(--peligro)' }}>
                  {libres > 0 ? `${libres} de ${a.lugares} libres` : 'Lleno'}
                </strong>
              </p>

              {a.nota && <p style={{ marginBottom: 0 }}>{a.nota}</p>}

              <div className="asientos-visual" aria-label={`${libres} de ${a.lugares} lugares libres`}>
                {Array.from({ length: a.lugares }).map((_, i) => {
                  const ocupado = i < a.ocupados;
                  const mio = a.voyYo && i === a.ocupados - 1 && ocupado;
                  return (
                    <span
                      key={i}
                      className={`asiento${ocupado ? ' ocupado' : ''}${mio ? ' mio' : ''}`}
                      aria-hidden="true"
                    >
                      {mio ? '✓' : ocupado ? '·' : ''}
                    </span>
                  );
                })}
              </div>

              <div className="pub-pie" style={{ marginTop: 12 }}>
                {a.conductor && (
                  <span
                    className="tenue"
                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Avatar
                      nombre={a.conductor.nombre}
                      semilla={a.conductor.handle}
                      fotoUrl={a.conductor.fotoUrl}
                      tamano="chico"
                    />
                    <Link href={`/perfil/${a.conductor.handle}`}>{a.conductor.nombre}</Link>
                  </span>
                )}

                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  {a.conductor && !a.esMio && (
                    <button
                      type="button"
                      className="reaccion"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      onClick={() => escribir(a.conductor!.handle)}
                    >
                      <MessageCircle size={16} strokeWidth={1.75} aria-hidden="true" />
                      Escribirle
                    </button>
                  )}
                  {a.esMio ? (
                    <span className="tenue">Tu aventón</span>
                  ) : (
                    <button
                      type="button"
                      className="reaccion"
                      aria-pressed={a.voyYo}
                      disabled={!a.voyYo && libres === 0}
                      onClick={() => apartar(a.id)}
                    >
                      {a.voyYo ? '✅ Voy' : '🙋 Apartar lugar'}
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
