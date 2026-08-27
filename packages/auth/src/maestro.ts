/**
 * Codigo maestro de desarrollo.
 *
 * Sirve para entrar sin depender del correo mientras se construye la app. Es,
 * literalmente, una puerta trasera — asi que esta rodeada de candados:
 *
 *  1. Solo funciona si NODE_ENV **no** es "production".
 *  2. Solo para los correos que se listen explicitamente. No hay comodines:
 *     un `*` o un dominio entero convertiria esto en "cualquiera entra".
 *  3. Hay que ponerlo a proposito en dos variables distintas. Olvidar una lo
 *     deja apagado.
 *  4. La validacion de entorno del arranque tumba el proceso si aparece con
 *     NODE_ENV=production.
 *
 * Nada de esto sustituye a lo obvio: cuando el correo real funcione, borra las
 * dos variables del `.env`.
 */

export interface ConfigMaestro {
  /** Valor de DEV_OTP_MAESTRO. */
  readonly codigo: string | undefined;
  /** Valor de DEV_OTP_CORREOS: lista separada por comas. */
  readonly correos: string | undefined;
  /** true cuando NODE_ENV === 'production'. */
  readonly produccion: boolean;
}

export const RESULTADO_MAESTRO = {
  /** Apagado: no hay configuracion, se sigue el camino normal. */
  APAGADO: 'apagado',
  /** Configurado y el codigo y el correo coinciden. */
  VALIDO: 'valido',
  /** Configurado pero no coincide. Se sigue el camino normal. */
  NO_COINCIDE: 'no_coincide',
} as const;

export type ResultadoMaestro =
  (typeof RESULTADO_MAESTRO)[keyof typeof RESULTADO_MAESTRO];

const listaDeCorreos = (crudo: string | undefined): string[] =>
  (crudo ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

/** ¿Esta encendida la puerta trasera? Util para avisar en el arranque. */
export const maestroActivo = (config: ConfigMaestro): boolean =>
  !config.produccion &&
  Boolean(config.codigo) &&
  listaDeCorreos(config.correos).length > 0;

/**
 * Decide si un intento de entrada usa el codigo maestro.
 *
 * Devuelve NO_COINCIDE en vez de lanzar: si alguien escribe mal el codigo,
 * debe caer al camino normal y gastar su intento como cualquiera, no recibir
 * una pista de que existe una puerta trasera.
 */
export const verificarMaestro = (
  codigoIngresado: string,
  email: string,
  config: ConfigMaestro,
): ResultadoMaestro => {
  // En produccion ni se mira la configuracion. Es la primera linea y la unica
  // que importa si todas las demas fallan.
  if (config.produccion) return RESULTADO_MAESTRO.APAGADO;

  const correos = listaDeCorreos(config.correos);
  if (!config.codigo || correos.length === 0) return RESULTADO_MAESTRO.APAGADO;

  // Sin comodines a proposito: '*' o '@udlap.mx' abrirían la red entera.
  if (correos.includes('*') || correos.some((c) => c.startsWith('@'))) {
    throw new Error(
      'DEV_OTP_CORREOS no admite comodines ni dominios: lista los correos completos.',
    );
  }

  const coincide =
    codigoIngresado === config.codigo && correos.includes(email.trim().toLowerCase());

  return coincide ? RESULTADO_MAESTRO.VALIDO : RESULTADO_MAESTRO.NO_COINCIDE;
};
