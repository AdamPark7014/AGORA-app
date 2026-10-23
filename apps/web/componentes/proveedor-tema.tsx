'use client';

import { Moon, Sun } from 'lucide-react';
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

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

/**
 * Lee el tema que de verdad pinta la página (`data-theme` en `<html>`, que pone
 * el script anti-FOUC antes del primer pintado) sin romper la hidratación.
 *
 * El servidor no sabe el tema: renderizaba siempre la luna y el cliente, en
 * oscuro, el sol, y React tiraba el árbol entero por el desajuste. Con
 * `useSyncExternalStore` el servidor y la hidratación usan `null` y el valor
 * real llega en el render siguiente.
 */
function suscribirTema(avisar: () => void) {
  const observador = new MutationObserver(avisar);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observador.disconnect();
}

function useTemaOscuro(): boolean | null {
  return useSyncExternalStore(
    suscribirTema,
    () => document.documentElement.dataset.theme === 'dark',
    () => null,
  );
}

export function ToggleTema({ conTexto = false }: { conTexto?: boolean }) {
  const { tema, setTema } = useTema();
  const oscuro = useTemaOscuro();

  function alternar() {
    const esOscuro =
      tema === 'dark' ||
      (tema === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTema(esOscuro ? 'light' : 'dark');
  }

  // El icono se elige por CSS (`.solo-tema-*`), no aquí: así el HTML del
  // servidor ya sale con el icono correcto y no parpadea al hidratar.
  const etiqueta =
    oscuro === null ? 'Cambiar tema' : oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      type="button"
      className={conTexto ? 'toggle-tema toggle-tema-texto' : 'toggle-tema'}
      onClick={alternar}
      aria-label={etiqueta}
      title={etiqueta}
    >
      <span className="solo-tema-oscuro">
        <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
        {conTexto && 'Modo claro'}
      </span>
      <span className="solo-tema-claro">
        <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
        {conTexto && 'Modo oscuro'}
      </span>
    </button>
  );
}
