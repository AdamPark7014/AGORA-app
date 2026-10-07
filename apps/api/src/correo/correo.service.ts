import { randomUUID } from 'node:crypto';

import { Injectable, Logger, Optional, ServiceUnavailableException } from '@nestjs/common';
import {
  PROVEEDORES,
  VARIABLE_LLAVE,
  enviarCorreo,
  plantillaCodigo,
  type Proveedor,
} from '@agora/correo';
import { TTL_CODIGO_MS } from '@agora/auth';

import { EntregaService } from './entrega.service.js';

/**
 * Envio del codigo de acceso.
 *
 * Tres modos: `brevo` y `resend` para produccion, `console` para desarrollo.
 * El modo consola no es un atajo perezoso — permite probar el flujo completo
 * sin dominio verificado — pero **esta prohibido en produccion** y el arranque
 * falla si alguien lo deja puesto por descuido.
 */
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);

  constructor(@Optional() private readonly entrega?: EntregaService) {}

  private get proveedor(): string {
    return process.env.MAIL_PROVIDER ?? 'console';
  }

  private get esProduccion(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /** El proveedor de envio real, ya validado. Lanza si no se reconoce. */
  private proveedorEnvio(): Proveedor {
    const elegido = this.proveedor;
    if (!PROVEEDORES.includes(elegido as Proveedor)) {
      throw new Error(
        `MAIL_PROVIDER desconocido: ${elegido}. Usa ${PROVEEDORES.join(', ')} o "console".`,
      );
    }
    return elegido as Proveedor;
  }

  /**
   * Manda el codigo. Devuelve el id de seguimiento de la entrega (ver
   * EntregaService), o null si no hay nada que seguir (modo consola).
   */
  async enviarCodigo(destino: string, codigo: string): Promise<string | null> {
    const minutos = Math.round(TTL_CODIGO_MS / 60_000);

    if (this.proveedor === 'console') {
      // El codigo en el log es exactamente lo que no debe pasar en produccion.
      // main.ts ya impide arrancar asi, pero se repite la guarda aqui: una
      // fuga de codigos no puede depender de un solo control.
      if (this.esProduccion) {
        throw new Error('MAIL_PROVIDER=console esta prohibido en produccion.');
      }
      this.logger.warn(`[desarrollo] codigo para ${destino}: ${codigo}`);
      return null;
    }

    const proveedor = this.proveedorEnvio();
    const contenido = plantillaCodigo(codigo, { minutos });

    try {
      const { id, intentos } = await enviarCorreo(proveedor, {
        apiKey: process.env[VARIABLE_LLAVE[proveedor]] ?? '',
        from: process.env.MAIL_FROM ?? '',
        to: destino,
        contenido,
        // Una clave por envio: los reintentos internos la comparten, pero dos
        // solicitudes distintas del usuario son dos correos distintos.
        claveIdempotencia: randomUUID(),
      });

      // Se registra el destino y el id del mensaje, nunca el codigo: el log de
      // produccion no es un lugar seguro para credenciales de un solo uso.
      this.logger.log(
        `Codigo enviado a ${enmascarar(destino)} via ${proveedor} (id ${id}, ${intentos} intento(s))`,
      );

      if (!this.entrega || id === 'sin-id') return null;
      return this.entrega.registrar(id, destino, proveedor);
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo enviar a ${enmascarar(destino)}: ${detalle}`);

      // Al usuario no se le cuenta que fallo el proveedor ni por que: se le
      // dice que reintente. El detalle vive en el log, donde sirve.
      throw new ServiceUnavailableException(
        'No pudimos enviar el código ahora mismo. Intenta de nuevo en un minuto.',
      );
    }
  }

  /**
   * Comprueba la configuracion sin mandar nada.
   *
   * Se llama al arrancar: es preferible que el despliegue falle a que falle el
   * primer usuario que intenta entrar.
   */
  verificarConfiguracion(): void {
    if (this.proveedor === 'console') {
      if (this.esProduccion) {
        throw new Error(
          'MAIL_PROVIDER=console esta prohibido en produccion. Usa "resend".',
        );
      }
      this.logger.warn(
        'MAIL_PROVIDER=console: los codigos salen en este log, no por correo.',
      );
      return;
    }

    const proveedor = this.proveedorEnvio();

    const faltantes = [VARIABLE_LLAVE[proveedor], 'MAIL_FROM'].filter((v) => !process.env[v]);
    if (faltantes.length > 0) {
      throw new Error(`MAIL_PROVIDER=${proveedor} requiere: ${faltantes.join(', ')}.`);
    }

    const from = process.env.MAIL_FROM!;
    // Resend acepta "Nombre <buzon@dominio>" o "buzon@dominio". Cualquier otra
    // cosa la rechaza con un 422 que solo se ve cuando ya fallo un usuario.
    if (!/^([^<>]*<\s*[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+\s*>|[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/.test(from)) {
      throw new Error(`MAIL_FROM no parece un remitente valido: ${from}`);
    }
  }
}

/** Deja el correo reconocible en el log sin escribirlo completo. */
const enmascarar = (email: string): string => {
  const [buzon = '', dominio = ''] = email.split('@');
  const visible = buzon.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(buzon.length - 2, 1))}@${dominio}`;
};
