/**
 * OTP al correo institucional. Camino B del plan (1.4): no necesita permiso de
 * nadie y funciona el dia 1. Es lo que hizo thefacebook en 2004 y lo que hace
 * Fizz hoy.
 *
 * Decision criptografica que importa: el codigo se guarda como HMAC-SHA256 con
 * un secreto de servidor, no como hash simple ni como bcrypt.
 *
 *   - Un hash simple (SHA-256 pelon) no sirve: solo hay 10^6 codigos posibles,
 *     asi que cualquiera con un volcado de la base los recorre en segundos.
 *   - bcrypt tampoco resuelve el fondo — el espacio sigue siendo 10^6 — y de
 *     paso mete un costo alto en cada verificacion.
 *   - El HMAC con un secreto que vive FUERA de la base si: quien roba la base
 *     no tiene la llave, y sin la llave no puede precomputar nada.
 */

import { createHmac, randomInt, randomBytes, timingSafeEqual } from 'node:crypto';

/** 6 digitos: suficiente con TTL corto y limite de intentos. */
export const LONGITUD_CODIGO = 6;

/** Diez minutos. Lo bastante para cambiar de app y volver, no mas. */
export const TTL_CODIGO_MS = 10 * 60 * 1000;

/**
 * Cinco intentos por codigo. Con 10^6 combinaciones y este limite, adivinar
 * tiene probabilidad 5 en un millon antes de que el codigo muera.
 */
export const MAX_INTENTOS = 5;

/** No mas de un codigo por minuto al mismo buzon. */
export const ESPERA_ENTRE_ENVIOS_MS = 60 * 1000;

/** Tope diario por buzon: frena el uso del endpoint como maquina de spam. */
export const MAX_ENVIOS_DIA = 10;

/**
 * Genera un codigo de 6 digitos con randomInt (CSPRNG), no con Math.random.
 * Se rellena con ceros a la izquierda para que "004821" sea un codigo valido
 * y el espacio real sea de un millon, no de novecientos mil.
 */
export const generarCodigo = (): string =>
  String(randomInt(0, 10 ** LONGITUD_CODIGO)).padStart(LONGITUD_CODIGO, '0');

/**
 * HMAC del codigo con el secreto del servidor. El correo entra en el mensaje
 * para que el hash de un codigo no sea reutilizable en otra cuenta.
 */
export const hashCodigo = (codigo: string, email: string, secreto: string): string => {
  if (!secreto) throw new Error('Falta el secreto del servidor para el OTP.');
  return createHmac('sha256', secreto).update(`${email.toLowerCase()}:${codigo}`).digest('hex');
};

/** Comparacion en tiempo constante: no filtrar informacion por la duracion. */
export const compararHash = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

export interface CodigoGuardado {
  readonly codeHash: string;
  readonly expiresAt: Date;
  readonly consumedAt: Date | null;
  readonly intentos: number;
}

export const RESULTADO_OTP = {
  VALIDO: 'valido',
  EXPIRADO: 'expirado',
  YA_USADO: 'ya_usado',
  SIN_INTENTOS: 'sin_intentos',
  INCORRECTO: 'incorrecto',
} as const;

export type ResultadoOtp = (typeof RESULTADO_OTP)[keyof typeof RESULTADO_OTP];

/**
 * Verifica un codigo contra lo guardado. Funcion pura: recibe el estado y la
 * hora, no toca base ni reloj. Asi se puede probar el vencimiento sin esperar
 * diez minutos.
 *
 * El orden importa: primero se descartan expirado, usado y sin intentos, y solo
 * al final se compara. Comparar antes gastaria un intento contra un codigo que
 * de todos modos no servia.
 */
export const verificarCodigo = (
  codigoIngresado: string,
  email: string,
  guardado: CodigoGuardado,
  secreto: string,
  ahora: Date,
): ResultadoOtp => {
  if (guardado.consumedAt !== null) return RESULTADO_OTP.YA_USADO;
  if (guardado.expiresAt.getTime() <= ahora.getTime()) return RESULTADO_OTP.EXPIRADO;
  if (guardado.intentos >= MAX_INTENTOS) return RESULTADO_OTP.SIN_INTENTOS;

  const hash = hashCodigo(codigoIngresado, email, secreto);
  return compararHash(hash, guardado.codeHash) ? RESULTADO_OTP.VALIDO : RESULTADO_OTP.INCORRECTO;
};

export interface HistorialEnvios {
  /** Envio mas reciente a este buzon, si lo hay. */
  readonly ultimoEnvioAt: Date | null;
  /** Cuantos van en las ultimas 24 horas. */
  readonly enviosUltimas24h: number;
}

export const RESULTADO_ENVIO = {
  PERMITIDO: 'permitido',
  DEMASIADO_PRONTO: 'demasiado_pronto',
  TOPE_DIARIO: 'tope_diario',
} as const;

export type ResultadoEnvio = (typeof RESULTADO_ENVIO)[keyof typeof RESULTADO_ENVIO];

/**
 * Limite de envio. Sin esto el endpoint es una maquina de spam contra los
 * buzones @udlap.mx, y el precio es que Microsoft bloquee el dominio del
 * remitente — es decir, que nadie pueda entrar nunca mas.
 */
export const puedeEnviar = (historial: HistorialEnvios, ahora: Date): ResultadoEnvio => {
  if (historial.enviosUltimas24h >= MAX_ENVIOS_DIA) return RESULTADO_ENVIO.TOPE_DIARIO;
  if (historial.ultimoEnvioAt) {
    const transcurrido = ahora.getTime() - historial.ultimoEnvioAt.getTime();
    if (transcurrido < ESPERA_ENTRE_ENVIOS_MS) return RESULTADO_ENVIO.DEMASIADO_PRONTO;
  }
  return RESULTADO_ENVIO.PERMITIDO;
};

export const vencimientoDesde = (ahora: Date): Date => new Date(ahora.getTime() + TTL_CODIGO_MS);

// ---------------------------------------------------------------------------
// Sesiones
// ---------------------------------------------------------------------------

/**
 * 180 dias, y se renueva sola con el uso (ver `debeRenovarse`): quien entra
 * seguido no vuelve a pedir el codigo nunca. El correo es para registrarse, no
 * para cada visita. Solo caduca tras medio año sin abrir la app.
 */
export const TTL_SESION_MS = 180 * 24 * 60 * 60 * 1000;

/** Una renovacion por dia como maximo: no escribir en la base en cada peticion. */
export const RENOVAR_SESION_CADA_MS = 24 * 60 * 60 * 1000;

export const debeRenovarse = (expiresAt: Date, ahora: Date): boolean =>
  expiresAt.getTime() - ahora.getTime() < TTL_SESION_MS - RENOVAR_SESION_CADA_MS;

/**
 * Token de sesion de 256 bits. Se entrega al cliente en claro una sola vez y
 * en la base solo queda su hash: un volcado no permite suplantar a nadie.
 */
export const generarTokenSesion = (): string => randomBytes(32).toString('base64url');

/**
 * El token de sesion si se hashea con SHA-256 a secas y no con HMAC: aqui el
 * espacio son 2^256 valores, asi que no hay nada que precomputar. El pepper
 * solo hacia falta para los 10^6 codigos del OTP.
 */
export const hashTokenSesion = (token: string): string =>
  createHmac('sha256', 'agora.session').update(token).digest('hex');

export const vencimientoSesion = (ahora: Date): Date => new Date(ahora.getTime() + TTL_SESION_MS);

export interface SesionGuardada {
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export const sesionVigente = (sesion: SesionGuardada, ahora: Date): boolean =>
  sesion.revokedAt === null && sesion.expiresAt.getTime() > ahora.getTime();
