/**
 * Publicaciones: tipos, catalogos y acciones compartidas.
 *
 * La tarjeta de publicacion estaba copiada en seis pantallas (feed, detalle,
 * perfil, hashtag, guardados, buscar), cada una con su `interface Publicacion`
 * escrita a mano y su copia de `REACCIONES` y `MOTIVOS_REPORTE`. Cambiar una
 * reaccion o un motivo de reporte obligaba a acordarse de seis sitios, y la
 * forma de cada copia se iba separando de lo que manda la API.
 *
 * El tipo sigue a `VistaPost` (apps/api/src/posts/vista-post.ts). Lo que no
 * todas las rutas mandan es opcional: perfil y buscar devuelven un resumen
 * sin autor, sin encuesta o sin reaccion propia, y la tarjeta decide que
 * pintar segun lo que llegue en vez de suponer.
 */

import { api, ErrorApi } from './api';

/** Un archivo adjunto, como `MediaVista` de la API. */
export interface Adjunto {
  url: string;
  /** Version de 480 px para listas; `null` si no hace falta. */
  thumbUrl?: string | null;
  ancho?: number | null;
  alto?: number | null;
  mime?: string;
  esVideo: boolean;
}

export interface AutorPublicacion {
  handle: string;
  nombre: string;
  fotoUrl?: string | null;
  verificado?: boolean;
}

export interface OpcionEncuesta {
  id: string;
  texto: string;
  votos: number;
}

export interface Encuesta {
  pregunta: string;
  opciones: OpcionEncuesta[];
}

export interface ComunidadPublicacion {
  slug: string;
  nombre: string;
}

/** La publicacion tal y como la pinta el cliente. */
export interface Publicacion {
  id: string;
  texto: string;
  createdAt: string;
  comunidad: ComunidadPublicacion;
  estado?: string;
  autor?: AutorPublicacion | null;
  media?: Adjunto[];
  encuesta?: Encuesta | null;
  numComments?: number;
  numReactions?: number;
  /** `undefined` si la ruta no lo manda: entonces no se puede reaccionar desde ahi. */
  miReaccion?: string | null;
  /** `undefined` si la ruta no lo manda: sin el, el boton de guardar mentiria. */
  miGuardado?: boolean;
  anonimo?: boolean;
  /** Solo en publicaciones anonimas. */
  alias?: string | null;
  /** Solo en `/guardados`. */
  guardadoAt?: string;
}

/**
 * Perfil y buscar mandan la comunidad como texto (solo el nombre). Se acepta
 * esa forma en la frontera y se normaliza una vez, para que la tarjeta no
 * tenga que preguntar cada vez.
 */
export type PublicacionApi = Omit<Publicacion, 'comunidad'> & {
  comunidad: ComunidadPublicacion | string;
};

export function normalizarPublicacion(p: PublicacionApi): Publicacion {
  return {
    ...p,
    comunidad: typeof p.comunidad === 'string' ? { slug: '', nombre: p.comunidad } : p.comunidad,
  };
}

export const REACCIONES = [
  { tipo: 'ME_LATE', etiqueta: 'Me late', emoji: '🔥' },
  { tipo: 'ME_RIO', etiqueta: 'Me río', emoji: '😂' },
  { tipo: 'APOYO', etiqueta: 'Apoyo', emoji: '🤝' },
  { tipo: 'NO_MAMES', etiqueta: 'No mames', emoji: '😱' },
] as const;

/**
 * Motivos de reporte, en el mismo orden que la politica de contenido: las
 * cinco lineas rojas primero y "otro" al final.
 */
export const MOTIVOS_REPORTE = [
  { valor: 'INTIMIDAD_SEXUAL', etiqueta: 'Contenido íntimo sin permiso' },
  { valor: 'DATOS_PERSONALES', etiqueta: 'Datos personales' },
  { valor: 'AMENAZA_VIOLENCIA', etiqueta: 'Amenaza de violencia' },
  { valor: 'ACOSO_DIRIGIDO', etiqueta: 'Acoso dirigido' },
  { valor: 'SUPLANTACION', etiqueta: 'Suplantación' },
  { valor: 'OTRO', etiqueta: 'Otro' },
] as const;

/** Aplica un cambio a la publicacion en el estado de quien la pinta. */
export type ActualizarPublicacion = (cambio: (p: Publicacion) => Publicacion) => void;

/** Texto de error de la API o uno por defecto. */
export function mensajeError(e: unknown, porDefecto: string): string {
  return e instanceof ErrorApi ? e.message : porDefecto;
}

/**
 * Reaccionar es optimista: la interfaz cambia al instante y el servidor
 * confirma despues.
 *
 * Es la accion correcta para esto — reversible, sin consecuencia y de exito
 * casi seguro. Esperar el viaje de ida y vuelta hace que la app se sienta
 * lenta sin ganar nada. Publicar y enviar mensaje **no** son optimistas: ahi
 * el usuario necesita saber que de verdad quedo.
 *
 * Si el servidor rechaza, se revierte al estado exacto de antes y se lanza
 * el error para que la pantalla avise como acostumbra.
 */
export async function reaccionarOptimista(
  antes: Publicacion,
  tipo: string,
  actualizar: ActualizarPublicacion,
): Promise<void> {
  const quita = antes.miReaccion === tipo;
  const nueva = quita ? null : tipo;
  const delta = quita ? -1 : antes.miReaccion ? 0 : 1;

  actualizar((p) => ({ ...p, miReaccion: nueva, numReactions: (p.numReactions ?? 0) + delta }));

  try {
    const { miReaccion } = await api<{ miReaccion: string | null }>(
      `/posts/${antes.id}/reacciones`,
      { method: 'POST', body: JSON.stringify({ tipo }) },
    );
    // El servidor manda: si su respuesta difiere de lo que pintamos, gana el.
    if (miReaccion !== nueva) actualizar((p) => ({ ...p, miReaccion }));
  } catch (e) {
    actualizar((p) => ({ ...p, miReaccion: antes.miReaccion, numReactions: antes.numReactions }));
    throw e;
  }
}

/** Vota en la encuesta y devuelve los conteos nuevos. */
export async function votarEncuesta(postId: string, opcionId: string): Promise<OpcionEncuesta[]> {
  const { opciones } = await api<{ opciones: OpcionEncuesta[] }>(`/posts/${postId}/votos`, {
    method: 'POST',
    body: JSON.stringify({ opcionId }),
  });
  return opciones;
}

/** Edita el texto propio. Devuelve el aviso de moderacion si lo hay. */
export async function editarPublicacion(postId: string, texto: string): Promise<string | null> {
  const r = await api<{ aviso: string | null }>(`/posts/${postId}`, {
    method: 'PATCH',
    body: JSON.stringify({ texto }),
  });
  return r.aviso;
}

export async function borrarPublicacion(postId: string): Promise<void> {
  await api(`/posts/${postId}`, { method: 'DELETE' });
}

/**
 * Reportar. Sin esto la cola de moderacion solo recibe lo que marca la IA, y
 * el acoso dirigido —que un clasificador no detecta— no llega nunca.
 * Devuelve el texto de agradecimiento que corresponde.
 */
export async function reportarPublicacion(postId: string, motivo: string): Promise<string> {
  const r = await api<{ yaExistia: boolean }>('/reportes', {
    method: 'POST',
    body: JSON.stringify({ postId, motivo }),
  });
  return r.yaExistia
    ? 'Ya habías reportado esto. Un moderador lo va a ver.'
    : 'Gracias. Un moderador lo va a revisar.';
}

/** Retiro por moderacion; el motivo lo ve el autor. */
export async function retirarPublicacion(postId: string, motivo: string): Promise<void> {
  await api(`/moderacion/posts/${postId}/retirar`, {
    method: 'POST',
    body: JSON.stringify({ motivo }),
  });
}
