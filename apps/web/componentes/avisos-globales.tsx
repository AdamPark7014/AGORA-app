'use client';

import { useEffect, useRef, useState } from 'react';

import {
  EVENTO_AVISO,
  EVENTO_CONFIRMAR,
  type DetalleAviso,
  type DetalleConfirmar,
} from '@/lib/avisos';

const DURACION_MS = 4000;

interface Aviso extends DetalleAviso {
  id: number;
}

export function AvisosGlobales() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [pregunta, setPregunta] = useState<DetalleConfirmar | null>(null);
  const dialogo = useRef<HTMLDialogElement>(null);
  const siguienteId = useRef(0);

  useEffect(() => {
    function alAvisar(e: Event) {
      const { texto, tono } = (e as CustomEvent<DetalleAviso>).detail;
      const id = ++siguienteId.current;
      setAvisos((previos) => [...previos.slice(-2), { id, texto, tono }]);
      window.setTimeout(
        () => setAvisos((previos) => previos.filter((a) => a.id !== id)),
        tono === 'error' ? DURACION_MS * 1.5 : DURACION_MS,
      );
    }
    function alConfirmar(e: Event) {
      e.preventDefault();
      setPregunta((e as CustomEvent<DetalleConfirmar>).detail);
    }
    window.addEventListener(EVENTO_AVISO, alAvisar);
    window.addEventListener(EVENTO_CONFIRMAR, alConfirmar);
    return () => {
      window.removeEventListener(EVENTO_AVISO, alAvisar);
      window.removeEventListener(EVENTO_CONFIRMAR, alConfirmar);
    };
  }, []);

  useEffect(() => {
    const d = dialogo.current;
    if (pregunta && d && !d.open) d.showModal();
  }, [pregunta]);

  function responder(si: boolean) {
    pregunta?.responder(si);
    setPregunta(null);
    dialogo.current?.close();
  }

  return (
    <>
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (
          <p key={a.id} className={a.tono === 'error' ? 'toast toast--error' : 'toast'}>
            {a.texto}
          </p>
        ))}
      </div>

      <dialog
        ref={dialogo}
        className="dialogo-confirmar"
        aria-labelledby="dialogo-confirmar-titulo"
        onCancel={(e) => {
          e.preventDefault();
          responder(false);
        }}
      >
        {pregunta && (
          <form
            method="dialog"
            onSubmit={(e) => {
              e.preventDefault();
              responder(true);
            }}
          >
            <h2 id="dialogo-confirmar-titulo">{pregunta.titulo}</h2>
            {pregunta.detalle && <p>{pregunta.detalle}</p>}
            <div className="dialogo-confirmar-acciones">
              <button type="button" className="secundario" onClick={() => responder(false)}>
                Cancelar
              </button>
              <button type="submit" className={pregunta.peligro ? 'peligro' : undefined} autoFocus>
                {pregunta.accion ?? 'Aceptar'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
