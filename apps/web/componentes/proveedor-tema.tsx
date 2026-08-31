'use client';

import { Moon, Sun } from 'lucide-react';
import { createContext, useContext, useEffect, useState } from 'react';

type Tema = 'light' | 'dark' | 'system';

const CLAVE_TEMA = 'agora:tema';

const ContextoTema = createContext<{
  tema: Tema;
  setTema: (t: Tema) => void;
}>({ tema: 'system', setTema: () => undefined });

export function useTema() {
  return useContext(ContextoTema);
}

function resolverTema(tema: Tema): 'light' | 'dark' {
  if (tema === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return tema;
}

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  const [tema, setTemaEstado] = useState<Tema>('system');
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_TEMA) as Tema | null;
    if (guardado === 'light' || guardado === 'dark' || guardado === 'system') {
      setTemaEstado(guardado);
    } else if (document.documentElement.dataset.theme === 'dark') {
      // El script anti-FOUC ya resolvió system→dark; alinear estado React.
      setTemaEstado('system');
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;

    const aplicar = () => {
      const resuelto = resolverTema(tema);
      document.documentElement.dataset.theme = resuelto;
    };

    aplicar();

    if (tema !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambiar = () => aplicar();
    mq.addEventListener('change', alCambiar);
    return () => mq.removeEventListener('change', alCambiar);
  }, [tema, listo]);

  function setTema(nuevo: Tema) {
    setTemaEstado(nuevo);
    localStorage.setItem(CLAVE_TEMA, nuevo);
  }

  return (
    <ContextoTema.Provider value={{ tema, setTema }}>
      {children}
    </ContextoTema.Provider>
  );
}

export function ToggleTema() {
  const { tema, setTema } = useTema();

  function alternar() {
    const oscuro =
      tema === 'dark' ||
      (tema === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTema(oscuro ? 'light' : 'dark');
  }

  const oscuro =
    typeof document !== 'undefined' &&
    document.documentElement.dataset.theme === 'dark';

  return (
    <button
      type="button"
      className="toggle-tema"
      onClick={alternar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {oscuro ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  );
}
