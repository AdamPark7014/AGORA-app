import Constants from 'expo-constants';

import { ErrorApi, leerToken } from './api';

function resolverApi(): string {
  const configurada = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (configurada) return configurada;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:4200` : 'http://localhost:4200';
}

const API = resolverApi();

export async function subirMedia(
  uri: string,
  nombre: string,
  mime: string,
): Promise<{ id: string; url: string }> {
  const token = await leerToken();
  const cuerpo = new FormData();
  cuerpo.append('archivo', { uri, name: nombre, type: mime } as unknown as Blob);

  const respuesta = await fetch(`${API}/api/media`, {
    method: 'POST',
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: cuerpo,
  });

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new ErrorApi(
      respuesta.status,
      datos?.mensaje ?? datos?.message ?? 'No se pudo subir el archivo.',
    );
  }
  return datos as { id: string; url: string };
}
