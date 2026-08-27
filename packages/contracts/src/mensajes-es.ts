import { z } from 'zod';

/**
 * Los mensajes por omision de Zod, en espanol.
 *
 * Todo el producto habla espanol menos estos, que llegaban tal cual del
 * ingles: un campo vacio en el registro pintaba **"Required"** debajo de la
 * etiqueta. Los mensajes escritos a mano en cada contrato ya estaban bien; el
 * problema eran los que Zod genera solo cuando nadie los escribio.
 *
 * Vive en `@agora/contracts` y no en la API porque los mismos esquemas se
 * validan tambien en la web antes de mandar nada, y ahi el mensaje se lee
 * igual.
 */
const NOMBRES: Partial<Record<string, string>> = {
  string: 'texto',
  number: 'numero',
  boolean: 'si o no',
  date: 'fecha',
  array: 'lista',
  object: 'objeto',
};

const nombre = (tipo: unknown): string => NOMBRES[String(tipo)] ?? String(tipo);

export const mensajesEnEspanol: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'undefined' || issue.received === 'null') {
        return { message: 'Esto es obligatorio.' };
      }
      return { message: `Se esperaba ${nombre(issue.expected)}.` };

    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return {
          message:
            issue.minimum === 1
              ? 'Esto no puede quedar vacio.'
              : `Necesita al menos ${issue.minimum} caracteres.`,
        };
      }
      if (issue.type === 'array') {
        return { message: `Necesita al menos ${issue.minimum} elementos.` };
      }
      return { message: `El minimo es ${issue.minimum}.` };

    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Maximo ${issue.maximum} caracteres.` };
      }
      if (issue.type === 'array') {
        return { message: `Maximo ${issue.maximum} elementos.` };
      }
      return { message: `El maximo es ${issue.maximum}.` };

    case z.ZodIssueCode.invalid_enum_value:
      return { message: 'Esa opcion no es valida.' };

    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') return { message: 'Eso no parece un correo.' };
      if (issue.validation === 'url') return { message: 'Eso no parece una direccion web.' };
      if (issue.validation === 'uuid') return { message: 'Identificador invalido.' };
      return { message: 'El formato no es valido.' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'Esa fecha no es valida.' };

    case z.ZodIssueCode.unrecognized_keys:
      return { message: 'Vienen campos que no se esperaban.' };

    default:
      // Para lo que no se traduce, el mensaje de Zod es mejor que un texto
      // generico inventado: al menos dice algo concreto.
      return { message: ctx.defaultError };
  }
};

/** Enciende los mensajes en espanol para todo el proceso. */
export function usarMensajesEnEspanol(): void {
  z.setErrorMap(mensajesEnEspanol);
}
