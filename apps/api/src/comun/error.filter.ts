import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@agora/db';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/**
 * Una sola forma de error para toda la API.
 *
 * Antes convivian dos. `ZodPipe` devolvia `{ mensaje, errores }` y las
 * excepciones de Nest `{ message, error, statusCode }`, asi que el cliente
 * tenia que probar tres campos distintos para averiguar que decirle al
 * usuario — y su propio comentario lo admitia. Cualquier endpoint nuevo podia
 * inventarse una cuarta.
 *
 * Aqui todo sale igual:
 *
 * ```json
 * { "mensaje": "...", "errores": [{ "campo": "...", "mensaje": "..." }] }
 * ```
 *
 * `errores` solo aparece cuando hay detalle por campo que valga la pena
 * pintar junto al formulario.
 *
 * Lo otro que arregla: **un fallo inesperado ya no se cuenta**. Antes un error
 * de Prisma subia hasta el manejador por omision de Nest, que responde con el
 * mensaje de la excepcion — y el mensaje de Prisma trae nombres de tabla, de
 * columna y a veces el valor que choco. Eso es un mapa del esquema servido a
 * cualquiera. Ahora el 500 dice lo minimo y lleva un `trazaId` que aparece
 * tambien en el registro del servidor, para poder cruzarlos.
 */
export interface CuerpoError {
  readonly mensaje: string;
  readonly errores?: ReadonlyArray<{ campo: string; mensaje: string }>;
  /** Solo en 500: el identificador con el que buscar el fallo en el registro. */
  readonly trazaId?: string;
}

/**
 * Errores del analizador de cuerpo de Express, traducidos.
 *
 * Estos no son fallos nuestros: son peticiones mal formadas. Sin esto, mandar
 * 3 MB de JSON devolvia **500** con `trazaId` y quedaba escrito en el registro
 * como si fuera un bug del servidor — que ademas es una forma barata de
 * inundar el log. Y un JSON truncado contestaba con el texto del analizador en
 * ingles: "Unexpected end of JSON input".
 */
const POR_TIPO_CUERPO: Record<string, { estado: HttpStatus; mensaje: string }> = {
  'entity.too.large': {
    estado: HttpStatus.PAYLOAD_TOO_LARGE,
    mensaje: 'Lo que mandaste es demasiado grande.',
  },
  'entity.parse.failed': {
    estado: HttpStatus.BAD_REQUEST,
    mensaje: 'El cuerpo de la peticion no es JSON valido.',
  },
  'encoding.unsupported': {
    estado: HttpStatus.UNSUPPORTED_MEDIA_TYPE,
    mensaje: 'Codificacion no soportada.',
  },
  'request.aborted': {
    estado: HttpStatus.BAD_REQUEST,
    mensaje: 'La peticion se corto antes de terminar.',
  },
};

/**
 * `true` si el error viene del analizador de cuerpo y no de nuestro codigo.
 *
 * Se reconoce por su firma: `type` de texto y un `status` numerico. Aparte
 * para poder probarlo sin levantar Express.
 */
export function tipoDeCuerpo(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const e = error as { type?: unknown; status?: unknown; statusCode?: unknown };
  if (typeof e.type !== 'string') return null;
  if (typeof e.status !== 'number' && typeof e.statusCode !== 'number') return null;
  return e.type;
}

/**
 * `true` si el 400 viene de que el cuerpo no era JSON.
 *
 * Se mira el texto porque no queda otra: Nest envuelve el `SyntaxError` del
 * analizador en un `BadRequestException` y **no conserva el original** ni en
 * `cause` ni en ningun campo. Lo que si es estable son los mensajes de
 * `JSON.parse` de Node, que estan en el motor y no se traducen.
 *
 * El riesgo de un falso positivo es bajo y el dano seria minimo: cambiar un
 * mensaje de error por otro mas generico. A cambio, el usuario deja de leer
 * "Unexpected end of JSON input" en una app que por lo demas habla espanol.
 */
export function pareceJsonRoto(estado: number, mensaje: string): boolean {
  if (estado !== 400) return false;
  return /(Unexpected|Expected).+JSON|JSON at position|Unterminated string in JSON/i.test(
    mensaje,
  );
}

/** Errores de Prisma que corresponden a una respuesta concreta, no a un 500. */
const POR_CODIGO_PRISMA: Record<string, { estado: HttpStatus; mensaje: string }> = {
  // Choque de clave unica: alguien repitio un handle, un voto, un guardado.
  P2002: { estado: HttpStatus.CONFLICT, mensaje: 'Eso ya existe.' },
  // Clave foranea: se apunta a algo que no esta.
  P2003: { estado: HttpStatus.BAD_REQUEST, mensaje: 'Falta algo a lo que esto se refiere.' },
  // Registro no encontrado en un update o delete.
  P2025: { estado: HttpStatus.NOT_FOUND, mensaje: 'Eso ya no existe.' },
};

@Catch()
export class ErrorFilter implements ExceptionFilter {
  private readonly log = new Logger('Error');

  catch(excepcion: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { estado, cuerpo, paraRegistro } = this.traducir(excepcion);

    if (paraRegistro) {
      // Se registra el error entero, con la ruta, porque en el cuerpo de la
      // respuesta ya no va nada util para diagnosticar.
      this.log.error(
        `${cuerpo.trazaId}  ${req.method} ${req.originalUrl}  ${paraRegistro.message}`,
        paraRegistro.stack,
      );
    }

    res.status(estado).json(cuerpo);
  }

  private traducir(excepcion: unknown): {
    estado: number;
    cuerpo: CuerpoError;
    paraRegistro?: Error;
  } {
    if (excepcion instanceof HttpException) {
      // Nest envuelve los fallos del analizador de cuerpo en un
      // `BadRequestException` y deja el original en `cause`. Sin mirar ahi, un
      // JSON truncado contesta con el texto del analizador en ingles.
      const tipoEnvuelto = tipoDeCuerpo(excepcion.cause);
      const conocido = tipoEnvuelto ? POR_TIPO_CUERPO[tipoEnvuelto] : undefined;
      if (conocido) return { estado: conocido.estado, cuerpo: { mensaje: conocido.mensaje } };

      const estado = excepcion.getStatus();
      const cuerpo = normalizar(excepcion);
      if (pareceJsonRoto(estado, cuerpo.mensaje)) {
        return { estado, cuerpo: { mensaje: POR_TIPO_CUERPO['entity.parse.failed']!.mensaje } };
      }

      return { estado, cuerpo };
    }

    const tipoCuerpo = tipoDeCuerpo(excepcion);
    if (tipoCuerpo) {
      const conocido = POR_TIPO_CUERPO[tipoCuerpo];
      if (conocido) return { estado: conocido.estado, cuerpo: { mensaje: conocido.mensaje } };
      // Otro error del analizador: sigue siendo culpa del cliente, no un 500.
      return {
        estado: HttpStatus.BAD_REQUEST,
        cuerpo: { mensaje: 'La peticion no se pudo leer.' },
      };
    }

    if (excepcion instanceof Prisma.PrismaClientKnownRequestError) {
      const conocido = POR_CODIGO_PRISMA[excepcion.code];
      if (conocido) return { estado: conocido.estado, cuerpo: { mensaje: conocido.mensaje } };
    }

    // Cualquier otra cosa es un fallo nuestro. Al usuario no le sirve el
    // detalle y a un atacante si.
    const trazaId = randomUUID().slice(0, 8);
    return {
      estado: HttpStatus.INTERNAL_SERVER_ERROR,
      cuerpo: {
        mensaje: 'Algo se rompio de nuestro lado. Vuelve a intentarlo.',
        trazaId,
      },
      paraRegistro: excepcion instanceof Error ? excepcion : new Error(String(excepcion)),
    };
  }
}

/**
 * Lleva cualquier excepcion de Nest a la forma unica.
 *
 * Aparte del filtro para poder probarla: es donde estan todos los casos raros
 * de como Nest empaqueta el cuerpo de una excepcion.
 */
export function normalizar(excepcion: HttpException): CuerpoError {
  const respuesta = excepcion.getResponse();

  if (typeof respuesta === 'string') return { mensaje: respuesta };

  const objeto = respuesta as Record<string, unknown>;

  // Lo que ya produce ZodPipe pasa tal cual.
  if (typeof objeto.mensaje === 'string') {
    return {
      mensaje: objeto.mensaje,
      ...(Array.isArray(objeto.errores)
        ? { errores: objeto.errores as CuerpoError['errores'] }
        : {}),
    };
  }

  // Y las excepciones de Nest: `message` puede ser texto o lista.
  const mensaje = objeto.message;
  if (typeof mensaje === 'string') return { mensaje };
  if (Array.isArray(mensaje) && mensaje.length > 0) {
    return {
      mensaje: String(mensaje[0]),
      errores: mensaje.map((m) => ({ campo: '(raiz)', mensaje: String(m) })),
    };
  }

  return { mensaje: excepcion.message || 'Peticion invalida.' };
}
