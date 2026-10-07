/**
 * Cuanto se guarda cada cosa antes de borrarla.
 *
 * Aparte del servicio para poder razonarlo y probarlo sin base de datos: son
 * decisiones de producto y de ley, no detalles tecnicos.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

export const RETENCION = {
  /**
   * Los codigos OTP mueren a los 10 minutos. Se conservan un dia mas para
   * poder investigar un "no me llego el codigo" del mismo dia; pasado eso son
   * lastre en una tabla que se consulta en **cada** inicio de sesion.
   */
  otpMs: 1 * DIA_MS,

  /**
   * Una sesion caducada ya no autentica nada. Se dejan siete dias por si hace
   * falta rastrear un acceso, y despues fuera: `sessions` es la tabla que se
   * lee en cada peticion con sesion, la mas caliente de la API.
   */
  sesionCaducadaMs: 7 * DIA_MS,

  /**
   * Avisos ya leidos. Noventa dias es de sobra para que alguien vuelva a mirar
   * algo del semestre pasado. Los **no leidos no se tocan** por antiguos que
   * sean: borrar algo que la persona nunca vio es perderle informacion.
   */
  notificacionLeidaMs: 90 * DIA_MS,

  /**
   * Archivos subidos que nunca se usaron (formulario abandonado). Un dia da
   * margen a quien deja un borrador abierto; despues ocupan disco y, peor,
   * siguen accesibles por URL aunque la persona creyera que no publico nada.
   */
  mediaHuerfanaMs: 1 * DIA_MS,
} as const;

/** Fecha limite: lo anterior a esto se borra. */
export const limite = (ms: number, ahora = new Date()): Date =>
  new Date(ahora.getTime() - ms);
