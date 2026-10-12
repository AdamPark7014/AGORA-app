// Antes que nada: deja el .env cargado para todo lo que venga despues.
import './comun/env.js';
// Segundo: el reporte de errores, para que cubra tambien el arranque.
import { reportarError } from './comun/sentry.js';

import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { maestroActivo } from '@agora/auth';
import { usarMensajesEnEspanol } from '@agora/contracts';

import { AppModule } from './app.module.js';
import { CorreoService } from './correo/correo.service.js';
import { mensajeDeProblemas, revisarEntorno } from './comun/entorno.js';
import { ErrorFilter } from './comun/error.filter.js';
import { RegistroInterceptor } from './comun/registro.interceptor.js';

const PUERTO = Number(process.env.API_PORT ?? 4200);

async function arrancar(): Promise<void> {
  // Primero el entorno: si algo falta, que falle el despliegue y no el primer
  // usuario que intente entrar.
  const problemas = revisarEntorno();
  if (problemas.length > 0) throw new Error(mensajeDeProblemas(problemas));

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });

  // Y despues el correo: una llave mal puesta deja la app en pie pero sin
  // forma de que nadie inicie sesion, que es igual de fatal y menos evidente.
  app.get(CorreoService).verificarConfiguracion();

  // Si la puerta trasera esta abierta, que se vea en cada arranque. Un aviso
  // ruidoso es lo unico que evita que se quede puesta por olvido.
  if (
    maestroActivo({
      codigo: process.env.DEV_OTP_MAESTRO,
      correos: process.env.DEV_OTP_CORREOS,
      produccion: process.env.NODE_ENV === 'production',
    })
  ) {
    Logger.warn(
      `CODIGO MAESTRO ACTIVO para: ${process.env.DEV_OTP_CORREOS}. Solo desarrollo — borra DEV_OTP_* antes de desplegar.`,
      'Agora',
    );
  }

  // Los mensajes de validacion que Zod genera solo —los que nadie escribio a
  // mano— salian en ingles y llegaban a la pantalla: un campo vacio pintaba
  // "Required" debajo de la etiqueta.
  usarMensajesEnEspanol();

  // Un solo formato de error para toda la API, y nada de detalles internos en
  // los 500. Ver comun/error.filter.ts.
  app.useGlobalFilters(new ErrorFilter());

  // Anota lo lento y lo que falla. Sin esto no hay forma de investigar un "va
  // lento" en produccion. Ver comun/registro.interceptor.ts.
  app.useGlobalInterceptors(new RegistroInterceptor());

  /**
   * Tope explicito al cuerpo de las peticiones.
   *
   * Express trae 100 kB por omision, pero dejarlo implicito significa que el
   * limite real de la API depende de la version de una dependencia. 256 kB da
   * holgura de sobra: la publicacion mas larga son 2.000 caracteres y las
   * imagenes no van por aqui —suben por `/media`, con su propio limite y
   * validacion de bytes magicos.
   */
  app.useBodyParser('json', { limit: '256kb' });
  app.useBodyParser('urlencoded', { limit: '256kb', extended: true });

  /**
   * Compresion de respuestas.
   *
   * La API devuelve JSON, que comprime alrededor de un 75 %. Una pagina de
   * feed pasa de ~4 kB a ~1 kB. Con ~9,000 personas eso no descarga el
   * servidor —el ancho de banda no es el cuello— pero si a **quien esta con
   * datos moviles en el campus**, que es la mitad del uso real de una red de
   * este tipo.
   *
   * El umbral evita gastar CPU comprimiendo respuestas diminutas, donde las
   * cabeceras del formato pesan mas que lo ahorrado.
   */
  app.use(
    compression({
      threshold: 512,
      /**
       * El flujo de avisos en vivo **no** se comprime.
       *
       * `compression` acumula bytes antes de mandarlos, y eso con SSE
       * significa que el evento se queda en el buffer: el globo de
       * notificaciones dejaria de moverse y nadie sabria por que. La libreria
       * ya lo evita por su cuenta —`text/event-stream` no cuenta como
       * comprimible— pero eso es un detalle de su implementacion, y aqui
       * depende de ello algo que se rompe en silencio. Mejor escrito.
       */
      filter: (req, res) => {
        if (String(res.getHeader('Content-Type')).includes('text/event-stream')) return false;
        return compression.filter(req, res);
      },
    }),
  );

  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Detras de Traefik/Caddy en el VPS. Sin esto, req.ip es la IP del proxy y
  // el limite por IP acaba castigando a todos los usuarios por igual.
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);

  app.use(
    helmet({
      // La API solo devuelve JSON; no necesita politica de contenido de pagina.
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  // La web y el panel son origenes distintos (agora.mx y admin.agora.mx), asi
  // que ambos tienen que estar en la lista. Se enumeran explicitamente en vez
  // de aceptar un comodin: con `credentials: true` un comodin seria abrir la
  // sesion a cualquier sitio.
  const origenes = [
    process.env.NEXT_PUBLIC_WEB_URL ?? 'http://localhost:3200',
    process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3300',
  ];
  app.enableCors({ origin: origenes, credentials: true });

  app.enableShutdownHooks();

  // Red de seguridad: un rechazo que nadie capturo es un bug, pero en Node 22
  // termina el proceso y con el se caen todas las conexiones en vivo. Se
  // registra para arreglarlo y la API sigue de pie.
  process.on('unhandledRejection', (motivo) => {
    reportarError(motivo);
    Logger.error(
      `Promesa rechazada sin capturar: ${motivo instanceof Error ? (motivo.stack ?? motivo.message) : String(motivo)}`,
      'Agora',
    );
  });

  await app.listen(PUERTO);
  Logger.log(
    `API en http://localhost:${PUERTO}/api · entorno ${process.env.NODE_ENV ?? 'development'} · origenes ${origenes.join(', ')}`,
    'Agora',
  );
}

arrancar().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.message : String(error), undefined, 'Agora');
  process.exit(1);
});
