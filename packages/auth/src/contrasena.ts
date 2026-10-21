/**
 * Contraseña personal: reglas puras, sin base ni reloj.
 *
 * El correo institucional verifica que la cuenta existe **una vez**, al
 * registrarse. Después se entra con correo + contraseña, como en cualquier red
 * social. Lo que vive aquí es la política (largo, bloqueo por intentos, cuándo
 * se puede fijar sin la actual); el hash en sí lo hace la API con argon2id,
 * que es la parte que depende de una libreria nativa.
 */

/** Mínimo razonable sin volverse un castigo en un teléfono. */
export const LONGITUD_MINIMA_CONTRASENA = 8;

/** argon2 acepta más, pero un límite evita cuerpos gigantes a propósito. */
export const LONGITUD_MAXIMA_CONTRASENA = 128;

/** Intentos fallidos seguidos antes de bloquear la entrada con contraseña. */
export const MAX_FALLIDOS_LOGIN = 5;

/**
 * Lo que dura el bloqueo. Quince minutos frena la fuerza bruta (con 5
 * intentos por cuarto de hora, probar un diccionario tarda años) y a una
 * persona real que olvidó su contraseña le queda el camino del código.
 */
export const BLOQUEO_LOGIN_MS = 15 * 60 * 1000;

/**
 * Una sesión abierta con código sirve para fijar una contraseña nueva sin
 * saber la anterior durante este rato. Es el "olvidé mi contraseña": el
 * buzón institucional es la raíz de confianza, igual que al registrarse.
 */
export const VENTANA_CODIGO_RECIENTE_MS = 30 * 60 * 1000;

/**
 * Las que más aparecen en filtraciones y las que cualquiera del campus
 * probaría primero. No sustituye al bloqueo por intentos; lo complementa.
 */
const DEMASIADO_COMUNES: ReadonlySet<string> = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  'password',
  'password1',
  'contrasena',
  'contraseña',
  'contrasena1',
  'qwerty123',
  'qwertyuiop',
  'abcdefgh',
  'abc12345',
  'iloveyou',
  '11111111',
  '00000000',
  'udlap123',
  'udlap1234',
  'udlap2024',
  'udlap2025',
  'udlap2026',
  'agora123',
  'agora1234',
  'cholula1',
  'puebla123',
]);

export const RESULTADO_CONTRASENA = {
  VALIDA: 'valida',
  CORTA: 'corta',
  LARGA: 'larga',
  COMUN: 'comun',
  /** Contiene el buzón del correo (lo primero que probaría alguien). */
  CONTIENE_CORREO: 'contiene_correo',
  /** Un solo carácter repetido: "aaaaaaaa". */
  REPETIDA: 'repetida',
} as const;

export type ResultadoContrasena =
  (typeof RESULTADO_CONTRASENA)[keyof typeof RESULTADO_CONTRASENA];

/** Mensajes para la pantalla, en español y sin tecnicismos. */
export const MENSAJE_CONTRASENA: Record<Exclude<ResultadoContrasena, 'valida'>, string> = {
  corta: `Tu contraseña necesita al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`,
  larga: `Tu contraseña no puede pasar de ${LONGITUD_MAXIMA_CONTRASENA} caracteres.`,
  comun: 'Esa contraseña es de las más usadas del mundo. Elige otra.',
  contiene_correo: 'Tu contraseña no puede incluir tu correo.',
  repetida: 'Tu contraseña no puede ser un solo carácter repetido.',
};

/**
 * Valida una contraseña nueva. Se mide en caracteres Unicode (puntos de
 * código), no en bytes: "ñ" y un emoji cuentan como uno.
 */
export const validarContrasena = (contrasena: string, email: string): ResultadoContrasena => {
  const largo = [...contrasena].length;
  if (largo < LONGITUD_MINIMA_CONTRASENA) return RESULTADO_CONTRASENA.CORTA;
  if (largo > LONGITUD_MAXIMA_CONTRASENA) return RESULTADO_CONTRASENA.LARGA;

  const minusculas = contrasena.toLowerCase();
  if (DEMASIADO_COMUNES.has(minusculas)) return RESULTADO_CONTRASENA.COMUN;
  if (new Set(minusculas).size === 1) return RESULTADO_CONTRASENA.REPETIDA;

  const buzon = email.toLowerCase().split('@')[0] ?? '';
  if (buzon.length >= 4 && minusculas.includes(buzon)) return RESULTADO_CONTRASENA.CONTIENE_CORREO;

  return RESULTADO_CONTRASENA.VALIDA;
};

export interface EstadoLogin {
  readonly loginFallidos: number;
  readonly loginBloqueadoHasta: Date | null;
}

/** true mientras el bloqueo por intentos siga vigente. */
export const loginBloqueado = (estado: EstadoLogin, ahora: Date): boolean =>
  estado.loginBloqueadoHasta !== null && estado.loginBloqueadoHasta.getTime() > ahora.getTime();

/** Minutos que faltan para poder intentar de nuevo (mínimo 1, para el mensaje). */
export const minutosDeBloqueo = (estado: EstadoLogin, ahora: Date): number =>
  Math.max(1, Math.ceil(((estado.loginBloqueadoHasta?.getTime() ?? 0) - ahora.getTime()) / 60_000));

/**
 * Hasta cuándo bloquear después de un fallo más. `fallidos` ya incluye el
 * intento que acaba de fallar. Devuelve null si todavía no toca bloquear.
 */
export const bloqueoTrasFallo = (fallidos: number, ahora: Date): Date | null =>
  fallidos >= MAX_FALLIDOS_LOGIN ? new Date(ahora.getTime() + BLOQUEO_LOGIN_MS) : null;

export interface SesionParaContrasena {
  /** Se abrió canjeando un código al correo (no con contraseña). */
  readonly viaCodigo: boolean;
  readonly createdAt: Date;
}

/**
 * ¿Puede esta sesión fijar una contraseña sin dar la actual?
 *
 *  - Si la cuenta aún no tiene contraseña, sí: todas las sesiones que existen
 *    hoy se abrieron con un código al buzón, así que la sesión ya es la prueba
 *    de que el correo es suyo. Es el camino de migración de quien ya tenía
 *    cuenta.
 *  - Si ya tiene, solo con una sesión recién abierta por código: es el
 *    "olvidé mi contraseña". Una sesión vieja por código no vale, para que
 *    un teléfono prestado hace meses no pueda cambiarla.
 */
export const puedeFijarSinActual = (
  cuenta: { readonly tieneContrasena: boolean },
  sesion: SesionParaContrasena,
  ahora: Date,
): boolean => {
  if (!cuenta.tieneContrasena) return true;
  return sesion.viaCodigo && ahora.getTime() - sesion.createdAt.getTime() <= VENTANA_CODIGO_RECIENTE_MS;
};
