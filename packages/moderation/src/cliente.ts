/**
 * Clasificador de moderacion previa con Claude, por la puerta unica
 * (C:\dev\scripts\ai-os\IA-CLAUDE.md): el SDK toma ANTHROPIC_BASE_URL y
 * ANTHROPIC_API_KEY (el token del proyecto `agora`, nunca la llave de
 * Anthropic) del entorno.
 *
 * Reemplaza a omni-moderation de OpenAI (26-10-2026): aquel daba puntajes por
 * categoria y no podia aplicar la politica de Agora tal cual (no distingue la
 * critica a un profesor del acoso, ni detecta datos personales de otra
 * persona). Claude Haiku 5.5 la lee completa y decide con ella. Texto e
 * imagenes van en una sola llamada.
 */

import Anthropic from '@anthropic-ai/sdk';

import {
  DECISIONES,
  LINEAS_ROJAS,
  esClasificacion,
  veredictoDe,
  type Veredicto,
} from './politica.js';
import { POLITICA_PARA_CLAUDE } from './prompt.js';

/** El mas barato que pasa el eval (`packages/moderation/eval`); ver IA-CLAUDE.md §4. */
export const MODELO_MODERACION = 'claude-haiku-5-5';

/** De donde viene el contenido: va en el mensaje y en `x-proceso` para medir por funcion. */
export type TipoContenido =
  | 'publicacion'
  | 'comentario'
  | 'sin-nombre'
  | 'mensaje'
  | 'evento'
  | 'anuncio'
  /** Pie de una publicacion con video. */
  | 'clip'
  | 'aventon'
  /** Nombre, usuario, bio, intereses y lo que busca. */
  | 'perfil';

/** Un mensaje anterior del hilo: `autor` es quien escribe el nuevo; `otro`, quien lo recibe. */
export interface MensajeContexto {
  readonly de: 'autor' | 'otro';
  readonly texto: string;
}

/**
 * Cuantos mensajes anteriores ve el clasificador y hasta que largo cada uno.
 * Poco a proposito: basta para ver una insistencia o un chantaje que se arma,
 * y el contexto no va en cache (cambia en cada mensaje), asi que se paga entero.
 */
export const CONTEXTO_MAX_MENSAJES = 6;
export const CONTEXTO_MAX_CARACTERES = 300;

type CrearMensaje = (
  cuerpo: Anthropic.MessageCreateParamsNonStreaming,
  opciones?: Anthropic.RequestOptions,
) => Promise<Anthropic.Message>;

export interface OpcionesModeracion {
  readonly tipo?: TipoContenido;
  /** Mensajes anteriores del hilo, del mas viejo al mas nuevo (solo en mensajes). */
  readonly contexto?: readonly MensajeContexto[];
  /** Milisegundos antes de rendirse. Publicar no puede quedarse colgado. */
  readonly timeoutMs?: number;
  /** Solo para pruebas: reemplaza la llamada a la API. */
  readonly crear?: CrearMensaje;
}

const ESQUEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['publicar', 'revisar', 'retirar'] },
    linea_roja: { type: 'string', enum: [...Object.values(LINEAS_ROJAS), 'ninguna'] },
    razon: { type: 'string' },
  },
  required: ['decision', 'linea_roja', 'razon'],
  additionalProperties: false,
} as const;

let clientePorOmision: Anthropic | undefined;

/** Sin reintentos del SDK: el tiempo de espera es todo el presupuesto de la publicacion. */
const crearPorOmision: CrearMensaje = (cuerpo, opciones) => {
  clientePorOmision ??= new Anthropic({ maxRetries: 0 });
  return clientePorOmision.messages.create(cuerpo, opciones);
};

/** Los ultimos mensajes del hilo, recortados, entre etiquetas; vacio si no hay. */
export const bloqueConversacion = (contexto: readonly MensajeContexto[]): string => {
  const ultimos = contexto
    .map((m) => ({ de: m.de, texto: m.texto.trim() }))
    .filter((m) => m.texto)
    .slice(-CONTEXTO_MAX_MENSAJES);
  if (ultimos.length === 0) return '';
  const lineas = ultimos.map((m) => {
    const texto =
      m.texto.length > CONTEXTO_MAX_CARACTERES ? `${m.texto.slice(0, CONTEXTO_MAX_CARACTERES)}…` : m.texto;
    return `[${m.de === 'autor' ? 'autor' : 'otra persona'}] ${texto}`;
  });
  return `<conversacion>\n${lineas.join('\n')}\n</conversacion>\n`;
};

/** Arma la peticion: politica fija y en cache primero, el contenido del usuario despues. */
export const peticionModeracion = (
  texto: string,
  imagenes: readonly string[],
  tipo: TipoContenido,
  contexto: readonly MensajeContexto[] = [],
): Anthropic.MessageCreateParamsNonStreaming => ({
  model: MODELO_MODERACION,
  max_tokens: 200,
  // Clasificar no necesita razonar en voz alta: sin thinking responde en ~1 s
  // (eval del 26-10). Haiku 5.5 lo permite apagado con esfuerzo low.
  thinking: { type: 'disabled' },
  output_config: { effort: 'low', format: { type: 'json_schema', schema: ESQUEMA } },
  system: [{ type: 'text', text: POLITICA_PARA_CLAUDE, cache_control: { type: 'ephemeral' } }],
  messages: [
    {
      role: 'user',
      content: [
        ...imagenes.map(
          (url): Anthropic.ImageBlockParam => ({ type: 'image', source: { type: 'url', url } }),
        ),
        {
          type: 'text',
          text: `${bloqueConversacion(contexto)}Tipo: ${tipo}\n<contenido>\n${texto}\n</contenido>`,
        },
      ],
    },
  ],
});

/**
 * Evalua un contenido (texto y, si hay, imagenes por URL publica) y devuelve
 * el veredicto de la politica.
 *
 * Si la API falla, tarda demasiado o responde algo fuera del esquema, el
 * contenido SE PUBLICA y se encola para revision humana. Bloquear
 * publicaciones porque un proveedor externo esta caido convierte una
 * incidencia suya en censura nuestra.
 */
export const moderarContenido = async (
  contenido: { readonly texto?: string; readonly imagenes?: readonly string[] },
  opciones: OpcionesModeracion = {},
): Promise<Veredicto> => {
  const texto = contenido.texto?.trim() ?? '';
  const imagenes = contenido.imagenes ?? [];
  if (!texto && imagenes.length === 0) return { decision: DECISIONES.PUBLICAR };

  const tipo = opciones.tipo ?? 'publicacion';
  const timeoutMs = opciones.timeoutMs ?? (imagenes.length > 0 ? 8000 : 4000);
  const crear = opciones.crear ?? crearPorOmision;

  try {
    const respuesta = await crear(peticionModeracion(texto, imagenes, tipo, opciones.contexto ?? []), {
      timeout: timeoutMs,
      headers: { 'x-proceso': `agora-moderar-${tipo}` },
    });
    if (respuesta.stop_reason === 'refusal') {
      // El modelo no quiso ni clasificarlo: que lo vea una persona.
      return {
        decision: DECISIONES.PUBLICAR_Y_ENCOLAR,
        motivo: 'Publicado. Un moderador lo revisara.',
        razonIA: 'El clasificador se nego a evaluarlo.',
      };
    }
    if (respuesta.stop_reason !== 'end_turn') return veredictoDegradado();

    const json = respuesta.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const clasificacion: unknown = JSON.parse(json);
    if (!esClasificacion(clasificacion)) return veredictoDegradado();
    return veredictoDe(clasificacion);
  } catch {
    return veredictoDegradado();
  }
};

/** Atajo para solo texto. */
export const moderarTexto = (texto: string, opciones?: OpcionesModeracion): Promise<Veredicto> =>
  moderarContenido({ texto }, opciones);

/** Atajo para una sola imagen por URL publica. */
export const moderarImagen = (url: string, opciones?: OpcionesModeracion): Promise<Veredicto> =>
  moderarContenido({ imagenes: [url] }, opciones);

const SEVERIDAD: Record<string, number> = {
  [DECISIONES.PUBLICAR]: 0,
  [DECISIONES.PUBLICAR_Y_ENCOLAR]: 1,
  [DECISIONES.RETIRAR]: 2,
};

/** El veredicto mas severo de varios. */
export const masSevero = (veredictos: readonly Veredicto[]): Veredicto =>
  veredictos.reduce<Veredicto>(
    (peor, v) => ((SEVERIDAD[v.decision] ?? 0) > (SEVERIDAD[peor.decision] ?? 0) ? v : peor),
    { decision: DECISIONES.PUBLICAR },
  );

/** Fallo del proveedor: se publica igual y lo revisa una persona. */
const veredictoDegradado = (): Veredicto => ({
  decision: DECISIONES.PUBLICAR_Y_ENCOLAR,
  motivo: 'No se pudo verificar automaticamente. Un moderador lo revisara.',
});
