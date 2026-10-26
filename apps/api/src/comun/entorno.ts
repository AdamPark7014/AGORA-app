/**
 * Validacion del entorno al arrancar.
 *
 * Fallar aqui es barato: el despliegue no sube y nadie lo nota. Fallar mas
 * tarde es caro: se cae el primer usuario que intenta entrar, en produccion,
 * y con un error que no dice nada.
 */

export interface ProblemaEntorno {
  readonly variable: string;
  readonly motivo: string;
}

/** Variables sin las cuales la API no puede funcionar en ningun entorno. */
const SIEMPRE = ['DATABASE_URL', 'SESSION_SECRET'] as const;

/** Lo que ademas se exige cuando NODE_ENV=production. */
const SOLO_PRODUCCION = [
  'NEXT_PUBLIC_WEB_URL',
  'COOKIE_DOMAIN',
  'REDIS_URL',
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_URL',
  'MAIL_FROM',
] as const;

/**
 * Un secreto corto es un secreto roto: el HMAC del OTP depende por completo de
 * que SESSION_SECRET no se pueda adivinar ni forzar.
 */
const LARGO_MINIMO_SECRETO = 32;

const llaveMailDeProveedor = (proveedor: string): string | null => {
  if (proveedor === 'brevo') return 'BREVO_API_KEY';
  if (proveedor === 'resend') return 'RESEND_API_KEY';
  return null;
};

export const revisarEntorno = (
  entorno: NodeJS.ProcessEnv = process.env,
): ProblemaEntorno[] => {
  const problemas: ProblemaEntorno[] = [];
  const produccion = entorno.NODE_ENV === 'production';

  for (const variable of SIEMPRE) {
    if (!entorno[variable]) problemas.push({ variable, motivo: 'falta' });
  }

  const secreto = entorno.SESSION_SECRET;
  if (secreto && secreto.length < LARGO_MINIMO_SECRETO) {
    problemas.push({
      variable: 'SESSION_SECRET',
      motivo: `debe tener al menos ${LARGO_MINIMO_SECRETO} caracteres (tiene ${secreto.length})`,
    });
  }

  if (produccion) {
    for (const variable of SOLO_PRODUCCION) {
      if (!entorno[variable]) problemas.push({ variable, motivo: 'falta en produccion' });
    }

    const mailProvider = entorno.MAIL_PROVIDER ?? 'console';
    if (mailProvider === 'console') {
      problemas.push({
        variable: 'MAIL_PROVIDER',
        motivo:
          'no puede ser "console" en produccion: los codigos saldrian en el log. Usa "brevo" o "resend"',
      });
    } else {
      const llave = llaveMailDeProveedor(mailProvider);
      if (!llave) {
        problemas.push({
          variable: 'MAIL_PROVIDER',
          motivo: `valor desconocido "${mailProvider}": usa "brevo" o "resend"`,
        });
      } else if (!entorno[llave]) {
        problemas.push({
          variable: llave,
          motivo: `falta en produccion (MAIL_PROVIDER=${mailProvider})`,
        });
      }
    }

    // Sin token de moderacion se publica sin filtro previo. Es una decision
    // legitima, pero tiene que ser deliberada y no un olvido de configuracion.
    if (!entorno.ANTHROPIC_API_KEY && entorno.MODERACION_OPCIONAL !== 'true') {
      problemas.push({
        variable: 'ANTHROPIC_API_KEY',
        motivo:
          'falta: sin ella se publica sin moderacion previa. Si es a proposito, pon MODERACION_OPCIONAL=true',
      });
    }
    // El token es de la puerta unica (pia_agora_…), no una llave de Anthropic:
    // sin la URL de la puerta el SDK lo manda a api.anthropic.com, falla y
    // todo cae en la cola humana sin que nadie se entere.
    if (entorno.ANTHROPIC_API_KEY && !entorno.ANTHROPIC_BASE_URL) {
      problemas.push({
        variable: 'ANTHROPIC_BASE_URL',
        motivo: 'falta: el token de moderacion solo sirve contra la puerta (http://puerta-ia:8080)',
      });
    }

    // La puerta trasera de desarrollo no puede existir en produccion. La
    // libreria ya la ignora ahi, pero si alguien dejo las variables puestas es
    // señal de que el .env de produccion se copio del de desarrollo — y eso
    // suele traer mas cosas que no deberian estar.
    if (entorno.DEV_OTP_MAESTRO || entorno.DEV_OTP_CORREOS) {
      problemas.push({
        variable: 'DEV_OTP_MAESTRO / DEV_OTP_CORREOS',
        motivo:
          'no pueden existir en produccion: son la puerta trasera de desarrollo. Borralas del .env',
      });
    }

    if (entorno.NEXT_PUBLIC_WEB_URL?.startsWith('http://')) {
      problemas.push({
        variable: 'NEXT_PUBLIC_WEB_URL',
        motivo: 'debe ser https en produccion: la cookie de sesion viaja con secure',
      });
    }
  }

  return problemas;
};

export const mensajeDeProblemas = (problemas: ProblemaEntorno[]): string =>
  [
    'Configuracion invalida. Revisa tu .env contra .env.example:',
    ...problemas.map((p) => `  - ${p.variable}: ${p.motivo}`),
  ].join('\n');
