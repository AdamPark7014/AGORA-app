import { createHmac } from 'node:crypto';

/**
 * Reloj de la pregunta del dia "relampago": cae a una hora sorpresa, llega un
 * push a todo el campus y quien contesta en los primeros minutos sale "a
 * tiempo". Funciones puras para poder probarlas sin base de datos.
 */

export const ZONA_CAMPUS = 'America/Mexico_City';

/** Cuanto dura "a tiempo" despues de que cae la pregunta. */
export const VENTANA_MS = 2 * 60_000;

/** Entre las 10:00 y las 20:00 del campus: ni de madrugada ni en la noche. */
const PRIMER_MINUTO = 10 * 60;
const MINUTOS_POSIBLES = 10 * 60;

/** Si el servidor estuvo caido cuando tocaba, un push tardio ya no sirve. */
export const AVISO_VIGENTE_MS = 30 * 60_000;

/**
 * Medianoche UTC del dia calendario del campus. La columna `fecha` es
 * `@db.Date` y Prisma la devuelve a medianoche UTC; el corte del dia es el de
 * Mexico, no el del servidor (el contenedor corre en UTC y antes la pregunta
 * cambiaba a las 6 de la tarde).
 */
export function diaCampus(ahora: Date = new Date()): Date {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_CAMPUS,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
  const [anio, mes, dia] = partes.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(anio, mes - 1, dia));
}

/**
 * Diferencia en ms entre la hora del campus y UTC en ese instante. Mexico ya
 * no cambia de horario, pero se calcula en vez de fijar -6 por si vuelve.
 */
function desfaseCampus(instante: Date): number {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_CAMPUS,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(instante);
  const v = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  const comoUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'));
  return comoUtc - Math.floor(instante.getTime() / 60_000) * 60_000;
}

/**
 * Hora en que cae la pregunta de `fecha`. Sale de un HMAC con el secreto del
 * servidor: es fija para ese dia (no cambia entre reinicios ni instancias)
 * pero nadie la adivina leyendo el codigo.
 */
export function horaSorpresa(fecha: Date, secreto: string): Date {
  const dia = fecha.toISOString().slice(0, 10);
  const minuto =
    PRIMER_MINUTO +
    (createHmac('sha256', secreto).update(`pregunta:${dia}`).digest().readUInt32BE(0) %
      MINUTOS_POSIBLES);
  const comoSiFueraUtc = new Date(fecha.getTime() + minuto * 60_000);
  return new Date(comoSiFueraUtc.getTime() - desfaseCampus(comoSiFueraUtc));
}

/** ¿Una respuesta dada en `cuando` cuenta como "a tiempo"? */
export function esATiempo(abreAt: Date | null, cuando: Date): boolean {
  if (!abreAt) return false;
  const pasado = cuando.getTime() - abreAt.getTime();
  return pasado >= 0 && pasado <= VENTANA_MS;
}
