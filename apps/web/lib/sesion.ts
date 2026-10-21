'use client';

import { useEffect, useState } from 'react';

import { api } from './api';

/**
 * La sesion, pedida una sola vez y compartida.
 *
 * Ocho componentes distintos llamaban cada uno a `/auth/yo` — encabezado,
 * carriles, feed, perfil, publicacion, mas, moderacion y la portada. En una
 * pagina cualquiera coinciden tres o cuatro, asi que cada carga disparaba
 * varias peticiones **identicas**, y cada una cuesta en el servidor una
 * consulta a `Session`, `User` y `Profile`.
 *
 * Con ~9,000 personas eso no tira nada, pero es multiplicar por cuatro la
 * parte mas caliente de la API a cambio de nada. Aqui se resuelve con dos
 * cosas simples: una promesa en vuelo compartida (dos componentes que montan
 * a la vez se cuelgan de la misma peticion) y una vida corta en cache.
 *
 * La cache es corta a proposito. La sesion cambia poco, pero cuando cambia
 * —al entrar, al salir, al crear el perfil— hay que notarlo enseguida;
 * `olvidarSesion()` la tira a mano en esos momentos.
 */
export interface Sesion {
  id: string;
  email: string;
  roles: string[];
  handle: string | null;
  tienePerfil: boolean;
  nombre: string | null;
  fotoUrl: string | null;
  esStaff: boolean;
  puedeModerar: boolean;
  puedeSuspender?: boolean;
  /** false = cuenta de antes de las contraseñas: se le invita a crearla. */
  tieneContrasena: boolean;
  /** Esta sesión se abrió con un código al correo (no con contraseña). */
  viaCodigo?: boolean;
}

const VIDA_MS = 30_000;

let enVuelo: Promise<Sesion> | null = null;
let cacheada: { valor: Sesion; hasta: number } | null = null;

/** Pide la sesion, reusando la respuesta reciente o la peticion en curso. */
export function sesion(): Promise<Sesion> {
  if (cacheada && Date.now() < cacheada.hasta) return Promise.resolve(cacheada.valor);
  if (enVuelo) return enVuelo;

  enVuelo = api<Sesion>('/auth/yo')
    .then((valor) => {
      cacheada = { valor, hasta: Date.now() + VIDA_MS };
      return valor;
    })
    .finally(() => {
      // Se suelta pase lo que pase: dejar una promesa rechazada pegada aqui
      // condenaria a la pagina a fallar para siempre.
      enVuelo = null;
    });

  return enVuelo;
}

/** Tira la copia guardada. Al entrar, al salir y al crear perfil. */
export function olvidarSesion(): void {
  cacheada = null;
  enVuelo = null;
}

/** La sesion como estado de React. `null` mientras carga o si no hay. */
export function useSesion(): { yo: Sesion | null; cargando: boolean } {
  const [yo, setYo] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    sesion()
      .then((s) => vivo && setYo(s))
      .catch(() => vivo && setYo(null))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, []);

  return { yo, cargando };
}
