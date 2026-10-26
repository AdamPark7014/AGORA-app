'use client';

import { useEffect, useState } from 'react';

import { track } from '@/lib/analytics';
import {
  EVENTO_REFRESH_GAMIFICACION,
  obtenerGamificacion,
  type GamificacionExtendida,
} from '@/lib/gamificacion';
import { CampusTip } from './campus-tip';
import { LeaderboardRachas } from './leaderboard-rachas';
import { RachaBadges } from './racha-badges';
import { RetoSemanal } from './reto-semanal';
import { RetosAmigos } from './retos-amigos';
import { RetosRankingSemanal } from './retos-ranking-semanal';

/**
 * Gamificacion del feed, fuera del camino del contenido.
 *
 * Antes el feed abria con eventos en vivo encima del compositor y un bloque
 * de racha, retos, ranking y tips debajo: en el celular habia que pasar
 * varias pantallas antes de ver la primera publicacion. Ahora:
 *
 * - En escritorio los widgets viven en el carril derecho (`CarrilDerecho`
 *   los monta en `/feed`), junto a la pregunta del dia que ya estaba ahi.
 * - Sin carril derecho, una sola tira compacta con el resumen que se abre
 *   para verlos. Se monta solo sin carril (no se oculta con CSS), asi que
 *   nunca hay dos copias pidiendo los mismos datos.
 *
 * Con el diseno D, "Ahora en el campus" y la pregunta relampago van en el
 * propio feed (arriba de las publicaciones), asi que aqui ya no entran.
 */

/** Los widgets en el orden en que se leen. */
export function WidgetsTuDia() {
  return (
    <>
      <RachaBadges />
      <RetoSemanal />
      <RetosAmigos />
      <RetosRankingSemanal />
      <LeaderboardRachas />
      <CampusTip />
    </>
  );
}

const CLAVE = 'agora-tu-dia';

/**
 * Tira plegable para pantallas sin carril derecho. El resumen sale de
 * `/gamificacion/mio`, la misma peticion (cacheada) que usan los widgets, asi
 * que abrirla no cuesta otra vuelta al servidor.
 */
export function TiraTuDia() {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState<GamificacionExtendida | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE) === '1') setAbierto(true);
    } catch {
      /* almacenamiento bloqueado: queda plegada */
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      obtenerGamificacion()
        .then((g) => vivo && setDatos(g))
        .catch(() => undefined);
    };
    cargar();
    window.addEventListener(EVENTO_REFRESH_GAMIFICACION, cargar);
    return () => {
      vivo = false;
      window.removeEventListener(EVENTO_REFRESH_GAMIFICACION, cargar);
    };
  }, []);

  function alternar(siguiente: boolean) {
    if (siguiente === abierto) return;
    setAbierto(siguiente);
    try {
      if (siguiente) localStorage.setItem(CLAVE, '1');
      else localStorage.removeItem(CLAVE);
    } catch {
      /* sin persistencia */
    }
    if (siguiente) track('tu_dia_abierto');
  }

  const partes: string[] = [];
  if (datos && datos.rachaActual > 0) {
    partes.push(`Racha de ${datos.rachaActual} ${datos.rachaActual === 1 ? 'día' : 'días'}`);
  } else {
    partes.push('Tu racha');
  }
  partes.push(
    datos?.retoSemanal ? `Reto ${datos.retoSemanal.progreso}/${datos.retoSemanal.meta}` : 'Reto',
  );

  return (
    <details
      className="tarjeta tu-dia"
      open={abierto}
      onToggle={(e) => alternar(e.currentTarget.open)}
    >
      <summary>
        <span className="tu-dia-titulo">Tu día</span>
        <span className="tu-dia-sub">{partes.join(' · ')}</span>
      </summary>
      {abierto && (
        <div className="tu-dia-cuerpo">
          <WidgetsTuDia />
        </div>
      )}
    </details>
  );
}
