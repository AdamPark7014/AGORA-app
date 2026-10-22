/**
 * Un evento como archivo .ics (RFC 5545) para «Agregar a mi calendario».
 *
 * Los estudiantes viven en Google Calendar y en el Calendario del iPhone: si el
 * evento no está ahí, no existe. Sin dependencias: el formato es texto con
 * reglas fijas (CRLF, escapar `\ ; ,` y saltos, líneas de 75 octetos como
 * máximo). Las horas van en UTC con `Z`, así cada calendario las muestra en su
 * zona sin que tengamos que mandar un VTIMEZONE.
 */

export interface EventoCalendario {
  id: string;
  titulo: string;
  descripcion: string;
  lugar: string;
  inicioAt: Date;
  finAt: Date | null;
}

/** Sin hora de fin, el evento dura dos horas: lo típico de algo del campus. */
export const DURACION_POR_OMISION_MS = 2 * 60 * 60_000;
const SITIO = 'https://udlagora.com';

const fechaIcs = (fecha: Date): string => fecha.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export const escaparIcs = (texto: string): string =>
  texto.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Parte una línea en trozos de 75 octetos como máximo sin cortar un carácter UTF-8 a la mitad. */
export const plegarLinea = (linea: string): string => {
  const trozos: string[] = [];
  let actual = '';
  let octetos = 0;
  for (const caracter of linea) {
    const tam = Buffer.byteLength(caracter, 'utf8');
    const limite = trozos.length === 0 ? 75 : 74; // las de continuación empiezan con un espacio
    if (octetos + tam > limite) {
      trozos.push(actual);
      actual = '';
      octetos = 0;
    }
    actual += caracter;
    octetos += tam;
  }
  trozos.push(actual);
  return trozos.join('\r\n ');
};

export function icsDeEvento(evento: EventoCalendario, ahora: Date = new Date()): string {
  const fin = evento.finAt ?? new Date(evento.inicioAt.getTime() + DURACION_POR_OMISION_MS);
  const url = `${SITIO}/eventos/${evento.id}`;
  const descripcion = `${evento.descripcion}\n\n${url}`;
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Zynora Tek//Agora//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${evento.id}@udlagora.com`,
    `DTSTAMP:${fechaIcs(ahora)}`,
    `DTSTART:${fechaIcs(evento.inicioAt)}`,
    `DTEND:${fechaIcs(fin)}`,
    `SUMMARY:${escaparIcs(evento.titulo)}`,
    `LOCATION:${escaparIcs(evento.lugar)}`,
    `DESCRIPTION:${escaparIcs(descripcion)}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escaparIcs(evento.titulo)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lineas.map(plegarLinea).join('\r\n')}\r\n`;
}
