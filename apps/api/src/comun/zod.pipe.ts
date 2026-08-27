import { BadRequestException, Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

/**
 * Valida el cuerpo o los parametros contra un contrato de @agora/contracts.
 *
 * Toda entrada pasa por aqui: es el unico borde donde datos de fuera se
 * convierten en datos de dentro. Los mensajes van en espanol porque se
 * muestran tal cual al usuario.
 */
@Injectable()
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(valor: unknown): T {
    const resultado = this.schema.safeParse(valor);
    if (resultado.success) return resultado.data;

    throw new BadRequestException({
      mensaje: 'Datos invalidos.',
      errores: resultado.error.issues.map((issue) => ({
        campo: issue.path.join('.') || '(raiz)',
        mensaje: issue.message,
      })),
    });
  }
}
