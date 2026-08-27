export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const respuesta = await fetch(`/api${ruta}`, {
    ...opciones,
    credentials: 'include',
    headers: {
      ...(opciones.body ? { 'content-type': 'application/json' } : {}),
      ...opciones.headers,
    },
  });

  if (respuesta.status === 204) return undefined as T;
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new ErrorApi(
      respuesta.status,
      cuerpo?.errores?.[0]?.mensaje ?? cuerpo?.mensaje ?? cuerpo?.message ?? 'Algo salio mal.',
    );
  }

  return cuerpo as T;
}
