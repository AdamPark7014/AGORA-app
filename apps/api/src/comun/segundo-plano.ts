import type { Logger } from '@nestjs/common';

/**
 * Lanza trabajo que no debe frenar la respuesta (avisos, hashtags) sin dejar
 * una promesa suelta.
 *
 * Un `void algo()` que falla es un rechazo sin capturar, y en Node 22 eso
 * termina el proceso: un tropiezo puntual de la base al mandar un aviso
 * reiniciaba la API entera y cortaba todas las conexiones en vivo. Aqui el
 * fallo se registra y la peticion sigue su curso.
 */
export function enSegundoPlano(promesa: Promise<unknown>, logger: Logger, que: string): void {
  promesa.catch((error: unknown) => {
    logger.warn(`${que} fallo: ${error instanceof Error ? error.message : String(error)}`);
  });
}
