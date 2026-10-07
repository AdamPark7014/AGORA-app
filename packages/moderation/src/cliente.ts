/**
 * Cliente de la API omni-moderation de OpenAI.
 *
 * Se eligio sobre Perspective API por dos razones: es gratuita, y Google apaga
 * Perspective el 31 de diciembre de 2026. Cubre texto e imagen y funciona en
 * espanol.
 */

import { decidir, DECISIONES, type PuntajesModeracion, type Veredicto } from './politica.js';

const ENDPOINT = 'https://api.openai.com/v1/moderations';
const MODELO = 'omni-moderation-latest';

export interface OpcionesModeracion {
  readonly apiKey: string;
  /** Milisegundos antes de rendirse. Publicar no puede quedarse colgado. */
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

interface RespuestaOpenAI {
  results?: Array<{ category_scores?: Record<string, number> }>;
}

/**
 * Evalua un texto y devuelve el veredicto de la politica.
 *
 * Si la API falla o tarda demasiado, el contenido SE PUBLICA y se encola para
 * revision humana. Bloquear publicaciones porque un proveedor externo esta
 * caido convierte una incidencia suya en censura nuestra.
 */
export const moderarTexto = (texto: string, opciones: OpcionesModeracion): Promise<Veredicto> =>
  consultar(texto, opciones);

/**
 * Evalua una imagen por URL publica (o `data:`). Misma politica que el texto:
 * desnudez o violencia grafica pasan a revision humana y solo las lineas
 * rojas se retiran solas.
 */
export const moderarImagen = (url: string, opciones: OpcionesModeracion): Promise<Veredicto> =>
  consultar([{ type: 'image_url', image_url: { url } }], opciones);

const SEVERIDAD: Record<string, number> = {
  [DECISIONES.PUBLICAR]: 0,
  [DECISIONES.PUBLICAR_Y_ENCOLAR]: 1,
  [DECISIONES.RETIRAR]: 2,
};

/** El veredicto mas severo de varios (texto + cada imagen de una publicacion). */
export const masSevero = (veredictos: readonly Veredicto[]): Veredicto =>
  veredictos.reduce<Veredicto>(
    (peor, v) => ((SEVERIDAD[v.decision] ?? 0) > (SEVERIDAD[peor.decision] ?? 0) ? v : peor),
    { decision: DECISIONES.PUBLICAR },
  );

const consultar = async (
  input: string | ReadonlyArray<Record<string, unknown>>,
  opciones: OpcionesModeracion,
): Promise<Veredicto> => {
  const { apiKey, timeoutMs = 4000, fetchImpl = fetch } = opciones;
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);

  try {
    const respuesta = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODELO, input }),
      signal: control.signal,
    });

    if (!respuesta.ok) return veredictoDegradado();

    const datos = (await respuesta.json()) as RespuestaOpenAI;
    const puntajes = datos.results?.[0]?.category_scores;
    if (!puntajes) return veredictoDegradado();

    return decidir(puntajes as PuntajesModeracion);
  } catch {
    return veredictoDegradado();
  } finally {
    clearTimeout(temporizador);
  }
};

/** Fallo del proveedor: se publica igual y lo revisa una persona. */
const veredictoDegradado = (): Veredicto => ({
  decision: DECISIONES.PUBLICAR_Y_ENCOLAR,
  motivo: 'No se pudo verificar automaticamente. Un moderador lo revisara.',
});
