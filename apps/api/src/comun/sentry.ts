import * as Sentry from '@sentry/node';

/**
 * Reporte de errores a Sentry.
 *
 * Hasta ahora un 500 en produccion solo quedaba en el log del contenedor, y
 * nadie lo leia hasta que un usuario se quejaba. Con `SENTRY_DSN` puesto, cada
 * fallo nuestro llega con su `trazaId` (el mismo que ve el usuario) y su ruta.
 * Sin la variable no hace nada: desarrollo y CI siguen igual.
 *
 * Nada de datos personales: sin cookies, sin cabeceras, sin cuerpo. El token
 * de sesion viaja en cookie y en `Authorization`, y el cuerpo puede llevar
 * mensajes privados o el correo de alguien.
 */
const dsn = process.env.SENTRY_DSN?.trim();
export const sentryActivo = Boolean(dsn);

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    ...(process.env.APP_VERSION ? { release: process.env.APP_VERSION } : {}),
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(evento) {
      if (evento.request) {
        delete evento.request.cookies;
        delete evento.request.headers;
        delete evento.request.data;
      }
      delete evento.user;
      return evento;
    },
  });
}

/** Manda un fallo nuestro a Sentry, si esta configurado. */
export function reportarError(error: unknown, contexto: { trazaId?: string; ruta?: string } = {}): void {
  if (!sentryActivo) return;
  Sentry.captureException(error, {
    tags: contexto.trazaId ? { trazaId: contexto.trazaId } : undefined,
    extra: contexto.ruta ? { ruta: contexto.ruta } : undefined,
  });
}
