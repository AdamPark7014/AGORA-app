'use client';

import { useState } from 'react';

import { api, ErrorApi } from '@/lib/api';

interface Props {
  postId: string;
  inicial?: boolean;
}

export function GuardarPost({ postId, inicial = false }: Props) {
  const [guardado, setGuardado] = useState(inicial);
  const [cargando, setCargando] = useState(false);

  async function alternar() {
    if (cargando) return;
    setCargando(true);
    const antes = guardado;
    setGuardado(!antes);
    try {
      const r = await api<{ guardado: boolean }>(`/posts/${postId}/guardar`, { method: 'POST' });
      setGuardado(r.guardado);
    } catch (e) {
      setGuardado(antes);
      if (e instanceof ErrorApi) {
        // Sin ruido en UI: el feed sigue usable.
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <button
      type="button"
      className="reaccion"
      title={guardado ? 'Quitar de guardados' : 'Guardar'}
      aria-label={guardado ? 'Quitar de guardados' : 'Guardar publicación'}
      aria-pressed={guardado}
      disabled={cargando}
      onClick={alternar}
    >
      {guardado ? '🔖' : '🏷️'}
    </button>
  );
}
