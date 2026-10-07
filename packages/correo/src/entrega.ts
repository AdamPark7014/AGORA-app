/**
 * Que paso con un correo despues de que el proveedor lo acepto.
 *
 * Que Brevo responda 201 solo significa que lo puso en cola. El buzon de UDLAP
 * (Microsoft 365) todavia puede rechazarlo — direccion mal escrita, buzon que
 * no existe — y Brevo, despues de un rebote duro, bloquea la direccion y deja
 * de intentar sin avisarle a nadie. Las dos cosas pasaron en produccion y la
 * pantalla seguia diciendo "Revisa tu correo" con un codigo que nunca iba a
 * llegar. Este modulo traduce los eventos del proveedor a un estado que la
 * pantalla puede mostrar.
 *
 * Los eventos llegan por dos caminos con nombres distintos para lo mismo: el
 * webhook manda `hard_bounce` y la API de estadisticas `hardBounces`. Se
 * normalizan antes de compararlos.
 */

export type EstadoEntrega =
  /** Aceptado por el proveedor; aun sin noticias del buzon destino. */
  | 'enviado'
  /** El destino lo aplazo (soft bounce / deferred). El proveedor reintenta. */
  | 'demorado'
  /** El servidor de destino lo acepto. Puede estar en Otros o No deseado. */
  | 'entregado'
  /** El destino lo rechazo: la direccion no existe o no acepta correo. */
  | 'rebotado'
  /** El proveedor no lo mando: la direccion tenia un rebote previo. */
  | 'bloqueado'
  /** Fallo del proveedor. */
  | 'error';

/** Estados que ya no van a cambiar solos: la pantalla deja de preguntar. */
export const ESTADOS_FINALES: ReadonlySet<EstadoEntrega> = new Set<EstadoEntrega>([
  'entregado',
  'rebotado',
  'bloqueado',
  'error',
]);

/** `hard_bounce`, `hardBounces` y `HardBounce` son el mismo evento. */
export const normalizarEvento = (evento: string): string =>
  evento.toLowerCase().replace(/[^a-z]/g, '').replace(/s$/, '');

const ESTADO_POR_EVENTO: Readonly<Record<string, EstadoEntrega>> = {
  request: 'enviado',
  sent: 'enviado',
  deferred: 'demorado',
  softbounce: 'demorado',
  delivered: 'entregado',
  hardbounce: 'rebotado',
  invalid: 'rebotado',
  invalidemail: 'rebotado',
  blocked: 'bloqueado',
  error: 'error',
};

/**
 * Estado que implica un evento, o null si el evento no dice nada de la entrega
 * (aperturas, clics: Microsoft "abre" cada correo con su escaner segundos
 * despues de recibirlo, asi que una apertura no prueba que una persona lo vio).
 */
export const estadoDeEvento = (evento: string): EstadoEntrega | null =>
  ESTADO_POR_EVENTO[normalizarEvento(evento)] ?? null;

const RANGO: Readonly<Record<EstadoEntrega, number>> = {
  enviado: 0,
  demorado: 1,
  entregado: 2,
  error: 3,
  bloqueado: 3,
  rebotado: 4,
};

/**
 * El estado solo avanza. Los eventos no llegan en orden: un `request` tardio
 * no puede borrar un `delivered`, pero un rebote posterior a la entrega (el
 * servidor acepto y luego devolvio un NDR) si manda.
 */
export const combinarEstado = (actual: EstadoEntrega, nuevo: EstadoEntrega): EstadoEntrega =>
  RANGO[nuevo] >= RANGO[actual] ? nuevo : actual;

export interface EventoEntrega {
  readonly evento: string;
  readonly motivo: string | null;
}

const API_BREVO = 'https://api.brevo.com/v3';

/**
 * Eventos de un mensaje en Brevo, para cuando el webhook no llego (caido, mal
 * configurado, o el proceso se reinicio). Brevo tarda de segundos a minutos en
 * indexarlos, asi que una lista vacia no significa nada.
 */
export const eventosBrevo = async (
  apiKey: string,
  messageId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EventoEntrega[]> => {
  const url = `${API_BREVO}/smtp/statistics/events?limit=50&sort=desc&messageId=${encodeURIComponent(messageId)}`;
  const respuesta = await fetchImpl(url, {
    headers: { 'api-key': apiKey, accept: 'application/json' },
    signal: AbortSignal.timeout(6000),
  });
  if (!respuesta.ok) throw new Error(`brevo respondio ${respuesta.status} al pedir eventos`);
  const datos = (await respuesta.json().catch(() => ({}))) as {
    events?: Array<{ event?: unknown; reason?: unknown }>;
  };
  return (datos.events ?? [])
    .filter((e): e is { event: string; reason?: unknown } => typeof e.event === 'string')
    .map((e) => ({ evento: e.event, motivo: typeof e.reason === 'string' ? e.reason : null }));
};

/**
 * Saca una direccion de la lista de bloqueo de Brevo. Tras un rebote duro
 * Brevo deja de mandarle cualquier cosa para siempre; si la direccion era
 * buena (buzon recien creado, error temporal de Microsoft), esa persona nunca
 * podria volver a entrar. Devuelve true si estaba bloqueada.
 */
export const desbloquearBrevo = async (
  apiKey: string,
  email: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> => {
  const respuesta = await fetchImpl(
    `${API_BREVO}/smtp/blockedContacts/${encodeURIComponent(email)}`,
    {
      method: 'DELETE',
      headers: { 'api-key': apiKey, accept: 'application/json' },
      signal: AbortSignal.timeout(6000),
    },
  );
  if (respuesta.status === 404) return false;
  if (!respuesta.ok) throw new Error(`brevo respondio ${respuesta.status} al desbloquear`);
  return true;
};
