'use client';

import { useCallback, useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { Guardia } from '@/componentes/guardia';

interface Marcado {
  id: string;
  texto: string;
  createdAt: string;
  comunidad: string;
  motivoIA: string;
  autor: { handle: string; nombre: string } | null;
}

export default function PaginaMarcado() {
  return (
    <Guardia>
      <MarcadoInterno />
    </Guardia>
  );
}

function MarcadoInterno() {
  const [posts, setPosts] = useState<Marcado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [motivos, setMotivos] = useState<Record<string, string>>({});
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await api<{ posts: Marcado[] }>('/moderacion/marcado-ia');
      setPosts(datos.posts);
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo cargar.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  async function decidir(id: string, accion: 'RESTAURAR_CONTENIDO' | 'RETIRAR_CONTENIDO') {
    const motivo = (motivos[id] ?? '').trim();
    if (motivo.length < 3) {
      setError('Escribe el motivo de tu decisión.');
      return;
    }
    setTrabajando(id);
    setError(null);
    try {
      await api(`/moderacion/marcado-ia/${id}`, {
        method: 'POST',
        body: JSON.stringify({ accion, motivo }),
      });
      setPosts((previos) => previos.filter((p) => p.id !== id));
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudo decidir.');
    } finally {
      setTrabajando(null);
    }
  }

  return (
    <main>
      <h1>Marcado por la IA</h1>
      <p className="entradilla">
        El clasificador marcó esto pero <strong>sigue publicado</strong>: la IA
        nunca borra sola. Decide tú si se queda o se retira.
      </p>

      {error && <p className="error">{error}</p>}
      {cargando && <p className="tenue">Cargando…</p>}

      {!cargando && posts.length === 0 && !error && (
        <div className="vacio">
          <strong>Nada marcado</strong>
          El clasificador no encontró nada dudoso sin revisar.
        </div>
      )}

      {posts.map((p) => (
        <article key={p.id} className="caso ia">
          <div className="caso-cabeza">
            <span className="chapa ambar">Marcado por IA</span>
            <span className="chapa">{p.comunidad}</span>
            {p.autor && (
              <span className="tenue">
                de <strong>{p.autor.nombre}</strong> @{p.autor.handle}
              </span>
            )}
            <span className="tenue" style={{ marginLeft: 'auto' }}>
              {new Date(p.createdAt).toLocaleString('es-MX')}
            </span>
          </div>

          <p className="tenue" style={{ margin: 0 }}>
            <strong>Motivo del clasificador:</strong> {p.motivoIA}
          </p>

          <div className="contenido">{p.texto}</div>

          <div className="acciones">
            <input
              className="motivo-campo"
              placeholder="Motivo de tu decisión"
              value={motivos[p.id] ?? ''}
              onChange={(e) => setMotivos((prev) => ({ ...prev, [p.id]: e.target.value }))}
            />
            <button
              type="button"
              className="dejar"
              disabled={trabajando === p.id}
              onClick={() => decidir(p.id, 'RESTAURAR_CONTENIDO')}
            >
              Está bien, publicar
            </button>
            <button
              type="button"
              className="retirar"
              disabled={trabajando === p.id}
              onClick={() => decidir(p.id, 'RETIRAR_CONTENIDO')}
            >
              Retirar
            </button>
          </div>
        </article>
      ))}
    </main>
  );
}
