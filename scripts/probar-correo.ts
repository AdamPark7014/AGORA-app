/**
 * Comprueba la configuracion de correo contra el proveedor de verdad.
 *
 *   pnpm correo:probar                  -> solo valida la llave y el remitente
 *   pnpm correo:probar tu@udlap.mx      -> ademas manda un correo de prueba
 *
 * Existe porque `verificarConfiguracion()` del arranque solo comprueba que las
 * variables esten puestas, no que sirvan. Una llave revocada o un remitente sin
 * verificar levantan la API sin problema y fallan despues, cuando ya hay un
 * usuario esperando su codigo. Esto lo detecta antes de desplegar.
 */

import { plantillaCodigo, enviarCorreo, VARIABLE_LLAVE, type Proveedor } from '@agora/correo';

const ENDPOINTS_CUENTA: Record<Proveedor, { url: string; headers: (k: string) => HeadersInit }> = {
  brevo: {
    url: 'https://api.brevo.com/v3/account',
    headers: (k) => ({ 'api-key': k, accept: 'application/json' }),
  },
  resend: {
    url: 'https://api.resend.com/domains',
    headers: (k) => ({ authorization: `Bearer ${k}` }),
  },
};

const rojo = (t: string) => `\x1b[31m${t}\x1b[0m`;
const verde = (t: string) => `\x1b[32m${t}\x1b[0m`;
const gris = (t: string) => `\x1b[90m${t}\x1b[0m`;

async function main(): Promise<void> {
  const proveedor = (process.env.MAIL_PROVIDER ?? 'console') as Proveedor | 'console';
  const destino = process.argv[2];

  if (proveedor === 'console') {
    console.log(gris('MAIL_PROVIDER=console: no hay nada que probar contra un proveedor.'));
    console.log(gris('Los codigos salen en el log de la API.'));
    return;
  }

  if (proveedor !== 'brevo' && proveedor !== 'resend') {
    console.error(rojo(`MAIL_PROVIDER desconocido: ${proveedor}`));
    process.exitCode = 1;
    return;
  }

  const variable = VARIABLE_LLAVE[proveedor];
  const apiKey = process.env[variable];
  const from = process.env.MAIL_FROM;

  console.log(`Proveedor : ${proveedor}`);
  console.log(`Remitente : ${from ?? rojo('(falta MAIL_FROM)')}`);
  console.log(`Llave     : ${apiKey ? `${apiKey.slice(0, 12)}… (${apiKey.length} car.)` : rojo(`(falta ${variable})`)}`);
  console.log('');

  if (!apiKey || !from) {
    console.error(rojo('Faltan variables. Revisa .env contra .env.example.'));
    process.exitCode = 1;
    return;
  }

  // 1. ¿La llave sirve? Una lectura barata basta y no gasta cuota de envio.
  const cuenta = ENDPOINTS_CUENTA[proveedor];
  const respuesta = await fetch(cuenta.url, { headers: cuenta.headers(apiKey) });

  if (!respuesta.ok) {
    console.error(rojo(`✗ La llave no sirve: ${proveedor} respondio ${respuesta.status}.`));
    if (respuesta.status === 401) {
      console.error(gris('  401 = llave invalida o revocada. Genera una nueva en el panel.'));
    }
    process.exitCode = 1;
    return;
  }
  console.log(verde('✓ La llave es valida.'));

  if (!destino) {
    console.log(gris('\nPara mandar un correo de prueba: pnpm correo:probar tu@udlap.mx'));
    return;
  }

  // 2. ¿El remitente esta verificado? Esto solo se sabe intentando enviar.
  console.log(`\nEnviando prueba a ${destino}…`);
  try {
    const { id, intentos } = await enviarCorreo(proveedor, {
      apiKey,
      from,
      to: destino,
      contenido: plantillaCodigo('000000', { minutos: 10 }),
      claveIdempotencia: `prueba-${Date.now()}`,
    });
    console.log(verde(`✓ Enviado (id ${id}, ${intentos} intento(s)). Revisa tu bandeja y spam.`));
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(rojo(`✗ No se pudo enviar: ${mensaje}`));
    if (mensaje.includes('422') || mensaje.includes('403')) {
      console.error(
        gris('  Suele ser el remitente sin verificar. Da de alta el dominio de MAIL_FROM'),
      );
      console.error(gris('  en el panel del proveedor y pon sus registros DKIM/SPF en tu DNS.'));
    }
    process.exitCode = 1;
    return;
  }
}

main().catch((error: unknown) => {
  console.error(rojo(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
