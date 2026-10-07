'use client';

import { useEffect, useState } from 'react';

import { api, ErrorApi } from '@/lib/api';
import { copy } from '@/lib/copy';
import { CircleAlert, CircleCheck, LoaderCircle } from './iconos';

type Estado = 'enviado' | 'demorado' | 'entregado' | 'rebotado' | 'bloqueado' | 'error';

const FINALES = new Set<Estado>(['entregado', 'rebotado', 'bloqueado', 'error']);

/**
 * Esperas entre preguntas: casi todo se resuelve en los primeros 10 s
 * (Outlook acepta o rechaza en segundos), asi que se pregunta seguido al
 * principio y cada vez menos despues. Suman ~90 s y se rinde.
 */
const ESPERAS_MS = [1500, 2000, 2500, 3000, 4000, 5000, 6000, 8000, 10000, 12000, 15000, 20000];

/**
 * Dice si el codigo llego al buzon. Antes la pantalla solo decia "Revisa tu
 * correo" y un correo mal escrito costaba diez minutos de espera inutil; ahora
 * el rebote se ve en segundos.
 */
export function EstadoEntrega({
  envioId,
  email,
  onCorregir,
  onReenviar,
}: {
  envioId: string;
  email: string;
  onCorregir: () => void;
  onReenviar: () => void;
}) {
  const [estado, setEstado] = useState<Estado>('enviado');
  const [agotado, setAgotado] = useState(false);
  const [perdido, setPerdido] = useState(false);

  useEffect(() => {
    let vivo = true;
    let paso = 0;
    let temporizador: number | undefined;
    setEstado('enviado');
    setAgotado(false);
    setPerdido(false);

    const preguntar = async () => {
      try {
        const r = await api<{ estado: Estado }>(`/auth/otp/entrega/${envioId}`);
        if (!vivo) return;
        setEstado(r.estado);
        if (FINALES.has(r.estado)) return;
      } catch (e) {
        if (!vivo) return;
        // La API se reinicio y olvido el envio: no hay nada que seguir.
        if (e instanceof ErrorApi && e.estado === 404) {
          setPerdido(true);
          return;
        }
      }
      const espera = ESPERAS_MS[paso++];
      if (espera === undefined) {
        setAgotado(true);
        return;
      }
      temporizador = window.setTimeout(preguntar, espera);
    };

    temporizador = window.setTimeout(preguntar, ESPERAS_MS[paso++]);
    return () => {
      vivo = false;
      window.clearTimeout(temporizador);
    };
  }, [envioId]);

  if (perdido) return null;

  const textos = copy.login.codigo.entrega;
  const reenviar = (
    <button type="button" className="entrega-accion" onClick={onReenviar}>
      {copy.login.codigo.reenviar}
    </button>
  );

  if (estado === 'entregado') {
    return (
      <p className="entrega entrega-ok" role="status">
        <CircleCheck size={18} aria-hidden />
        <span>{textos.entregado}</span>
      </p>
    );
  }

  if (estado === 'rebotado') {
    return (
      <p className="entrega entrega-mal" role="alert">
        <CircleAlert size={18} aria-hidden />
        <span>
          {textos.rebotado(email)}{' '}
          <button type="button" className="entrega-accion" onClick={onCorregir}>
            {copy.login.codigo.cambiarCorreo}
          </button>
        </span>
      </p>
    );
  }

  if (estado === 'bloqueado' || estado === 'error') {
    return (
      <p className="entrega entrega-mal" role="alert">
        <CircleAlert size={18} aria-hidden />
        <span>
          {estado === 'bloqueado' ? textos.bloqueado : textos.error} {reenviar}
        </span>
      </p>
    );
  }

  return (
    <p className="entrega entrega-espera" role="status">
      {agotado ? <CircleAlert size={18} aria-hidden /> : <LoaderCircle size={18} className="girando" aria-hidden />}
      <span>
        {agotado ? textos.sinNoticias : estado === 'demorado' ? textos.demorado : textos.enviado}
        {agotado && <> {reenviar}</>}
      </span>
    </p>
  );
}
