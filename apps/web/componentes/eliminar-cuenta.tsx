'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { api, ErrorApi } from '@/lib/api';
import { olvidarSesion } from '@/lib/sesion';

/**
 * Baja de la cuenta. Pide escribir el @usuario porque no hay vuelta atras: el
 * servidor borra el perfil y oculta todo lo publicado.
 */
export function EliminarCuenta({ handle }: { handle: string | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const esperado = handle ?? 'ELIMINAR';
  const coincide = confirmacion.trim().replace(/^@/, '').toLowerCase() === esperado.toLowerCase();

  async function eliminar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!coincide) return;
    setTrabajando(true);
    setError(null);
    try {
      await api('/cuenta/eliminar', {
        method: 'POST',
        body: JSON.stringify({ confirmacion: confirmacion.trim() }),
      });
      olvidarSesion();
      router.replace('/');
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo eliminar la cuenta. Intenta de nuevo.');
      setTrabajando(false);
    }
  }

  return (
    <section className="tarjeta zona-peligro" style={{ marginTop: 24 }} aria-labelledby="eliminar-cuenta">
      <strong id="eliminar-cuenta">Eliminar mi cuenta</strong>
      <p className="tenue" style={{ margin: '4px 0 12px', fontSize: '0.85rem' }}>
        Se borra tu perfil y dejan de verse tus publicaciones, comentarios, mensajes, anuncios,
        eventos y aventones. No se puede deshacer. Podrás volver a registrarte con tu correo.
      </p>

      {!abierto ? (
        <button type="button" className="secundario" onClick={() => setAbierto(true)}>
          Eliminar mi cuenta…
        </button>
      ) : (
        <form onSubmit={eliminar}>
          <label htmlFor="confirmar-baja" style={{ display: 'block', marginBottom: 6 }}>
            Para confirmar escribe <strong>{esperado}</strong>
          </label>
          <input
            id="confirmar-baja"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={trabajando}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="peligro" disabled={!coincide || trabajando}>
              {trabajando ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
            <button
              type="button"
              className="fantasma"
              disabled={trabajando}
              onClick={() => {
                setAbierto(false);
                setConfirmacion('');
                setError(null);
              }}
            >
              Cancelar
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      )}
    </section>
  );
}
