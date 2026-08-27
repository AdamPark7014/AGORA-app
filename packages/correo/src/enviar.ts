/**
 * Envio de correo con la politica de reintentos que produccion necesita.
 *
 * Hay dos proveedores porque son dos cuentas que ya existen: Resend y Brevo.
 * La politica de reintentos, el timeout y el manejo de errores son identicos en
 * ambos; lo unico que cambia es como se arma la peticion. Por eso el bucle vive
 * una sola vez y cada proveedor solo aporta su constructor.
 *
 * Lo que importa es distinguir dos tipos de fallo:
 *
 *  - Los que se arreglan solos esperando: 429 (limite de tasa), 5xx (caida
 *    momentanea del proveedor) y errores de red. Se reintentan.
 *  - Los que no: 401 (llave mal), 403, 422 (remitente sin verificar). Un
 *    reintento solo gasta tiempo y le hace creer al usuario que su codigo
 *    viene en camino cuando nunca va a llegar. Se fallan de inmediato.
 */

import type { ContenidoCorreo } from './plantilla.js';

const ENDPOINT_RESEND = 'https://api.resend.com/emails';
const ENDPOINT_BREVO = 'https://api.brevo.com/v3/smtp/email';

export type Proveedor = 'resend' | 'brevo';

export const PROVEEDORES: readonly Proveedor[] = ['resend', 'brevo'];

/** Nombre de la variable de entorno con la llave, por proveedor. */
export const VARIABLE_LLAVE: Record<Proveedor, string> = {
  resend: 'RESEND_API_KEY',
  brevo: 'BREVO_API_KEY',
};

export interface OpcionesEnvio {
  readonly apiKey: string;
  /** "Nombre <buzon@dominio>" o "buzon@dominio". */
  readonly from: string;
  readonly to: string;
  readonly contenido: ContenidoCorreo;
  /** Misma clave en todos los intentos del mismo envio. */
  readonly claveIdempotencia: string;
  readonly maxIntentos?: number;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
  /** Inyectable para no dormir de verdad en las pruebas. */
  readonly dormir?: (ms: number) => Promise<void>;
}

export class ErrorCorreo extends Error {
  constructor(
    mensaje: string,
    readonly estado: number | null,
    readonly reintentable: boolean,
  ) {
    super(mensaje);
    this.name = 'ErrorCorreo';
  }
}

/** 429, 408 y 5xx se reintentan; el resto de los 4xx no se arregla esperando. */
export const esReintentable = (estado: number): boolean =>
  estado === 429 || estado === 408 || estado >= 500;

/** Espera exponencial: 400 ms, 800 ms, 1600 ms... */
export const esperaMs = (intento: number): number => 400 * 2 ** (intento - 1);

const dormirReal = (ms: number): Promise<void> =>
  new Promise((resolver) => setTimeout(resolver, ms));

export interface RemitenteSeparado {
  readonly nombre: string | null;
  readonly email: string;
}

/**
 * Separa "Agora <hola@dominio.mx>" en nombre y buzon.
 *
 * Resend acepta la cadena entera, pero Brevo exige `{ name, email }` en campos
 * distintos. Se normaliza aqui para que MAIL_FROM se escriba igual sin importar
 * el proveedor: cambiar de uno a otro es tocar una variable, no reescribir el
 * `.env`.
 */
export const separarRemitente = (from: string): RemitenteSeparado => {
  const conNombre = /^\s*(.*?)\s*<\s*([^\s<>]+@[^\s<>]+)\s*>\s*$/.exec(from);
  if (conNombre) {
    const nombre = conNombre[1]!.replace(/^["']|["']$/g, '').trim();
    return { nombre: nombre || null, email: conNombre[2]! };
  }
  return { nombre: null, email: from.trim() };
};

export interface ResultadoEnvio {
  readonly id: string;
  readonly intentos: number;
  readonly proveedor: Proveedor;
}

interface Peticion {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
  /** De donde sacar el id del mensaje en la respuesta del proveedor. */
  readonly campoId: string;
}

const peticionResend = (o: OpcionesEnvio): Peticion => ({
  url: ENDPOINT_RESEND,
  headers: {
    'content-type': 'application/json',
    authorization: `Bearer ${o.apiKey}`,
    // Si el primer envio llego pero la respuesta se perdio, el reintento no
    // genera un segundo correo.
    'Idempotency-Key': o.claveIdempotencia,
  },
  body: {
    from: o.from,
    to: [o.to],
    subject: o.contenido.asunto,
    html: o.contenido.html,
    text: o.contenido.texto,
  },
  campoId: 'id',
});

const peticionBrevo = (o: OpcionesEnvio): Peticion => {
  const remitente = separarRemitente(o.from);
  return {
    url: ENDPOINT_BREVO,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'api-key': o.apiKey,
    },
    body: {
      sender: remitente.nombre
        ? { name: remitente.nombre, email: remitente.email }
        : { email: remitente.email },
      to: [{ email: o.to }],
      subject: o.contenido.asunto,
      htmlContent: o.contenido.html,
      textContent: o.contenido.texto,
      // Brevo no tiene cabecera de idempotencia. Se manda como etiqueta para
      // poder rastrear en su panel si un reintento llego a duplicar un envio.
      tags: [`otp-${o.claveIdempotencia}`],
    },
    campoId: 'messageId',
  };
};

const CONSTRUCTORES: Record<Proveedor, (o: OpcionesEnvio) => Peticion> = {
  resend: peticionResend,
  brevo: peticionBrevo,
};

export const enviarCorreo = async (
  proveedor: Proveedor,
  opciones: OpcionesEnvio,
): Promise<ResultadoEnvio> => {
  const {
    apiKey,
    from,
    maxIntentos = 3,
    timeoutMs = 8000,
    fetchImpl = fetch,
    dormir = dormirReal,
  } = opciones;

  if (!apiKey) throw new ErrorCorreo(`Falta ${VARIABLE_LLAVE[proveedor]}.`, null, false);
  if (!from) throw new ErrorCorreo('Falta MAIL_FROM.', null, false);

  const peticion = CONSTRUCTORES[proveedor](opciones);
  let ultimo: ErrorCorreo | null = null;

  for (let intento = 1; intento <= maxIntentos; intento += 1) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), timeoutMs);

    try {
      const respuesta = await fetchImpl(peticion.url, {
        method: 'POST',
        headers: peticion.headers,
        body: JSON.stringify(peticion.body),
        signal: control.signal,
      });

      if (respuesta.ok) {
        const datos = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
        const id = datos[peticion.campoId];
        return { id: typeof id === 'string' ? id : 'sin-id', intentos: intento, proveedor };
      }

      // El cuerpo del error explica la causa real (dominio sin verificar,
      // remitente invalido). Se conserva porque sin el, depurar entregabilidad
      // es adivinar.
      const detalle = await respuesta.text().catch(() => '');
      ultimo = new ErrorCorreo(
        `${proveedor} respondio ${respuesta.status}: ${detalle.slice(0, 300)}`,
        respuesta.status,
        esReintentable(respuesta.status),
      );

      if (!ultimo.reintentable) throw ultimo;
    } catch (error) {
      if (error instanceof ErrorCorreo) {
        if (!error.reintentable) throw error;
        ultimo = error;
      } else {
        // Red caida o timeout: transitorio por definicion.
        const mensaje = error instanceof Error ? error.message : String(error);
        ultimo = new ErrorCorreo(`Fallo de red al enviar: ${mensaje}`, null, true);
      }
    } finally {
      clearTimeout(temporizador);
    }

    if (intento < maxIntentos) await dormir(esperaMs(intento));
  }

  throw ultimo ?? new ErrorCorreo('No se pudo enviar el correo.', null, true);
};

/** Atajo. Equivale a `enviarCorreo('resend', ...)`. */
export const enviarConResend = (opciones: OpcionesEnvio): Promise<ResultadoEnvio> =>
  enviarCorreo('resend', opciones);
