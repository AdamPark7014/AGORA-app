/**
 * Cliente de la API.
 *
 * Same-origin gracias al rewrite de next.config.ts, asi que la cookie de
 * sesion viaja sola. `credentials: 'include'` se deja explicito porque la app
 * Expo de la Fase 8 si cruzara origen.
 */

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
    readonly errores?: Array<{ campo: string; mensaje: string }>,
  ) {
    super(mensaje);
  }
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  return (await apiConCabeceras<T>(ruta, opciones)).datos;
}

/** Igual que `api`, pero tambien entrega las cabeceras (p. ej. `X-Envio-Id`). */
export async function apiConCabeceras<T>(
  ruta: string,
  opciones: RequestInit = {},
): Promise<{ datos: T; cabeceras: Headers }> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: {
      ...(opciones.body ? { 'content-type': 'application/json' } : {}),
      ...opciones.headers,
    },
  });

  if (respuesta.status === 204) return { datos: undefined as T, cabeceras: respuesta.headers };

  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // La API devuelve una sola forma: `{ mensaje, errores? }`. Antes habia dos
    // —la de ZodPipe y la de Nest— y aqui se probaban tres campos a ver cual
    // traia algo. Ahora se prefiere el detalle por campo cuando lo hay, porque
    // "Necesitas un correo @udlap.mx" dice mas que "Datos invalidos".
    const mensaje = cuerpo?.errores?.[0]?.mensaje ?? cuerpo?.mensaje ?? 'Algo salió mal.';
    throw new ErrorApi(respuesta.status, mensaje, cuerpo?.errores);
  }

  return { datos: cuerpo as T, cabeceras: respuesta.headers };
}
