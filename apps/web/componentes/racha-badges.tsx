'use client';

import { useEffect, useState } from 'react';
import { BADGES_CAMPUS, type BadgeCodigo } from '@agora/contracts';
import { Flame, Share2 } from 'lucide-react';

import {
  obtenerGamificacion,
  gamificacionPorHandle,
  textoCompartirRacha,
  EVENTO_REFRESH_GAMIFICACION,
  type GamificacionExtendida,
} from '@/lib/gamificacion';

type Props = {
  /** Si se omite, carga `/gamificacion/mio` (feed, perfil propio). */
  handle?: string;
  /** Título del panel; por defecto «Tu racha» o «Racha» en perfiles ajenos. */
  titulo?: string;
  /** Muestra botón compartir cuando racha ≥ 2 (solo perfil propio). */
  mostrarCompartir?: boolean;
};

export function RachaBadges({ handle, titulo, mostrarCompartir = !handle }: Props) {
  const [datos, setDatos] = useState<GamificacionExtendida | null>(null);
  const [avisoCompartir, setAvisoCompartir] = useState<string | null>(null);
  const [badgeActiva, setBadgeActiva] = useState<string | null>(null);

  useEffect(() => {
    const cargar = () => {
      const promesa = handle ? gamificacionPorHandle(handle) : obtenerGamificacion();
      promesa.then(setDatos).catch(() => undefined);
    };

    cargar();
    if (!handle) {
      window.addEventListener(EVENTO_REFRESH_GAMIFICACION, cargar);
      return () => window.removeEventListener(EVENTO_REFRESH_GAMIFICACION, cargar);
    }
    return undefined;
  }, [handle]);

  async function compartirRacha() {
    if (!datos || datos.rachaActual < 2) return;
    const texto = textoCompartirRacha(datos.rachaActual);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mi racha en Ágora', text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setAvisoCompartir('Copiado al portapapeles');
      window.setTimeout(() => setAvisoCompartir(null), 2000);
    } catch {
      setAvisoCompartir('No se pudo compartir');
      window.setTimeout(() => setAvisoCompartir(null), 2000);
    }
  }

  if (!datos || (datos.rachaActual === 0 && datos.badges.length === 0)) return null;

  const etiquetaTitulo = titulo ?? (handle ? 'Racha' : 'Tu racha');

  return (
    <div className="panel racha-panel">
      <div className="racha-cabecera">
        <p className="panel-titulo" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Flame size={14} strokeWidth={2} aria-hidden="true" />
          {etiquetaTitulo}
        </p>
        <div className="racha-cabecera-derecha">
          <div className="racha-numeros">
            <span className="racha-actual" aria-label={`${datos.rachaActual} días seguidos`}>
              {datos.rachaActual}
              <span className="racha-unidad">{datos.rachaActual === 1 ? 'día' : 'días'}</span>
            </span>
            {datos.rachaMaxima > datos.rachaActual && (
              <span className="tenue racha-record">Récord: {datos.rachaMaxima}</span>
            )}
          </div>
          {mostrarCompartir && datos.rachaActual >= 2 && (
            <span className="racha-compartir">
              <button
                type="button"
                className="reaccion"
                title="Compartir racha"
                aria-label="Compartir mi racha"
                onClick={() => void compartirRacha()}
              >
                <Share2 size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
              {avisoCompartir && (
                <span className="tenue" style={{ fontSize: '0.78rem' }}>
                  {avisoCompartir}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {!handle && datos.comparacionCampus && datos.comparacionCampus.tuRacha > 0 && (
        <p
          className={`racha-comparacion-chip${
            datos.comparacionCampus.porEncimaDelPromedio ? ' racha-comparacion-chip--arriba' : ''
          }`}
        >
          Tu racha vs campus: 🔥 {datos.comparacionCampus.tuRacha} vs promedio{' '}
          {Number.isInteger(datos.comparacionCampus.promedioRacha)
            ? datos.comparacionCampus.promedioRacha
            : datos.comparacionCampus.promedioRacha.toFixed(1)}
          {datos.comparacionCampus.porEncimaDelPromedio && (
            <span className="racha-comparacion-badge">Arriba del promedio</span>
          )}
        </p>
      )}

      {(datos.duelosGanados ?? 0) > 0 && (
        <p className="racha-duelos-ganados">
          🏆 {datos.duelosGanados} {datos.duelosGanados === 1 ? 'duelo ganando' : 'duelos ganando'}
        </p>
      )}

      {datos.badges.length > 0 && (
        <div className="racha-insignias">
          <p className="tenue" style={{ margin: '0 0 8px', fontSize: 'var(--t-xs)' }}>
            Insignias
          </p>
          <ul className="racha-lista-insignias">
            {datos.badges.map((b) => {
              const def = BADGES_CAMPUS[b.codigo as BadgeCodigo];
              const etiqueta = def?.etiqueta ?? b.etiqueta;
              const subtitulo = def?.subtitulo ?? '';
              const tip = subtitulo ? `${etiqueta} — ${subtitulo}` : etiqueta;
              const activa = badgeActiva === b.codigo;

              return (
                <li key={b.codigo} className="racha-insignia" style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className="reaccion"
                    title={tip}
                    aria-label={tip}
                    aria-expanded={activa}
                    onClick={() => setBadgeActiva(activa ? null : b.codigo)}
                    style={{ fontSize: 'inherit', lineHeight: 1 }}
                  >
                    <span aria-hidden="true">{b.emoji}</span>
                  </button>
                  {activa && subtitulo && (
                    <span
                      role="tooltip"
                      className="racha-insignia-tip"
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 2,
                        minWidth: 160,
                        maxWidth: 220,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: 'var(--superficie)',
                        border: '1px solid var(--borde)',
                        boxShadow: '0 4px 12px rgb(0 0 0 / 12%)',
                        fontSize: 'var(--t-xs)',
                        lineHeight: 1.35,
                      }}
                    >
                      <strong style={{ display: 'block', marginBottom: 2 }}>{etiqueta}</strong>
                      <span className="tenue">{subtitulo}</span>
                    </span>
                  )}
                  <span>{etiqueta}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
