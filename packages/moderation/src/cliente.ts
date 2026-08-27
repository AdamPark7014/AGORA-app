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
export const moderarTexto = async (
  texto: string,
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
      body: JSON.stringify({ model: MODELO, input: texto }),
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
