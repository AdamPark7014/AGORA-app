'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

export function Compartir({ url, titulo }: { url: string; titulo?: string }) {
  const [aviso, setAviso] = useState<string | null>(null);

  async function compartir() {
    const completa = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
    try {
      if (navigator.share) {
        await navigator.share({ title: titulo ?? 'Ágora', url: completa });
        return;
      }
      await navigator.clipboard.writeText(completa);
      setAviso('Enlace copiado');
      setTimeout(() => setAviso(null), 2000);
    } catch {
      setAviso('No se pudo compartir');
    }
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        className="reaccion"
        title="Compartir"
        aria-label="Compartir publicación"
        onClick={() => void compartir()}
      >
        <Share2 size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {aviso && <span className="tenue" style={{ fontSize: '0.78rem' }}>{aviso}</span>}
    </span>
  );
}
