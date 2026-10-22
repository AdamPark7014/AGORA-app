/**
 * Registro con correo personal cuando el código al buzón UDLAP no llega.
 *
 * Outlook de la UDLAP a veces tarda horas o manda el código a cuarentena. Para
 * no dejar a nadie fuera, quien no lo recibe puede registrarse con un código a
 * su correo personal, siempre que Microsoft confirme que su buzón @udlap.mx
 * existe. La cuenta queda «pendiente de UDLAP» y tiene un plazo para confirmar
 * el buzón institucional; al vencer, solo puede entrar a confirmarlo.
 *
 * El buzón UDLAP sigue siendo la raíz de confianza: confirmarlo borra el
 * correo personal y la contraseña y cierra las demás sesiones. Si alguien se
 * registró con el correo de otra persona, su dueño la recupera al confirmar.
 */

/** Días para confirmar el correo UDLAP tras registrarse con el personal. */
export const PLAZO_UDLAP_DIAS = 30;
export const PLAZO_UDLAP_MS = PLAZO_UDLAP_DIAS * 24 * 60 * 60 * 1000;

/** Fecha límite para confirmar el UDLAP. Null si no hay nada pendiente. */
export const vencimientoUdlap = (pendienteDesde: Date | null): Date | null =>
  pendienteDesde ? new Date(pendienteDesde.getTime() + PLAZO_UDLAP_MS) : null;

/** true si la cuenta sigue sin confirmar su UDLAP y ya pasó el plazo. */
export const udlapVencida = (pendienteDesde: Date | null, ahora: Date): boolean => {
  const vence = vencimientoUdlap(pendienteDesde);
  return vence !== null && vence.getTime() <= ahora.getTime();
};

/** Días que quedan (redondeados hacia arriba, nunca negativos). Null si no hay pendiente. */
export const diasParaConfirmarUdlap = (pendienteDesde: Date | null, ahora: Date): number | null => {
  const vence = vencimientoUdlap(pendienteDesde);
  if (!vence) return null;
  return Math.max(0, Math.ceil((vence.getTime() - ahora.getTime()) / (24 * 60 * 60 * 1000)));
};

/**
 * Lo que responde Microsoft sobre un buzón (`GetCredentialType` → `IfExistsResult`).
 * 0 existe en el tenant; 5 y 6 existen en otro proveedor de identidad; 1 no existe.
 * Cualquier otra cosa (estrangulado, error) no dice nada.
 */
export const RESULTADO_BUZON = {
  EXISTE: 'existe',
  NO_EXISTE: 'no_existe',
  DESCONOCIDO: 'desconocido',
} as const;
export type ResultadoBuzon = (typeof RESULTADO_BUZON)[keyof typeof RESULTADO_BUZON];

export const interpretarIfExists = (
  ifExistsResult: unknown,
  throttleStatus: unknown,
): ResultadoBuzon => {
  if (throttleStatus === 1) return RESULTADO_BUZON.DESCONOCIDO;
  if (ifExistsResult === 0 || ifExistsResult === 5 || ifExistsResult === 6) return RESULTADO_BUZON.EXISTE;
  if (ifExistsResult === 1) return RESULTADO_BUZON.NO_EXISTE;
  return RESULTADO_BUZON.DESCONOCIDO;
};
