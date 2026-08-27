import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

/**
 * Cliente de la API para la app nativa.
 *
 * La diferencia con la web es la sesion: aqui no hay cookies entre origenes,
 * asi que el token viaja en `Authorization: Bearer` y vive en el llavero del
 * sistema (Keychain en iOS, Keystore en Android), no en almacenamiento normal.
 *
 * La URL sale de `extra.apiUrl` para que apuntar a produccion sea cambiar
 * app.json, no recompilar codigo.
 */
const CLAVE_TOKEN = 'agora.sesion';

/**
 * En produccion manda `extra.apiUrl` de app.json.
 *
 * En desarrollo se deriva del host de Metro: un telefono real no puede resolver
 * `localhost` —ahi `localhost` es el propio telefono— asi que se reutiliza la
 * IP de LAN por la que ya se conecto al bundler. Sin esto hay que editar la IP
 * a mano cada vez que cambia la red.
 */
function resolverApi(): string {
  const configurada = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (configurada) return configurada;

  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:4200` : 'http://localhost:4200';
}

const API = resolverApi();

export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function guardarToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(CLAVE_TOKEN, token);
}

export async function leerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAVE_TOKEN);
}

export async function borrarToken(): Promise<void> {
  await SecureStore.deleteItemAsync(CLAVE_TOKEN);
}

export async function api<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = await leerToken();

  const respuesta = await fetch(`${API}/api${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });

  if (respuesta.status === 204) return undefined as T;
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    // Una sesion vencida se limpia sola: dejar el token muerto en el llavero
    // hace que cada peticion falle sin que el usuario entienda por que.
    if (respuesta.status === 401) await borrarToken();
    // La API devuelve una sola forma: `{ mensaje, errores? }`. Se prefiere el
    // detalle por campo cuando lo hay: dice mas que "Datos invalidos".
    throw new ErrorApi(
      respuesta.status,
      cuerpo?.errores?.[0]?.mensaje ?? cuerpo?.mensaje ?? 'Algo salio mal.',
    );
  }

  return cuerpo as T;
}
