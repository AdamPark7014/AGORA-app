import { RESULTADO_BUZON, interpretarIfExists, type ResultadoBuzon } from '@agora/auth';

/**
 * ¿Existe ese buzón @udlap.mx? Se le pregunta a Microsoft, que aloja el correo
 * de la UDLAP: es el mismo endpoint que usa la pantalla de inicio de sesión de
 * Outlook para decidir si pide contraseña. No manda nada al buzón ni inicia
 * sesión; solo dice si la cuenta existe.
 *
 * Es lo que permite registrarse con un correo personal cuando el código no
 * llega, sin abrir la puerta a cuentas inventadas.
 *
 * `VERIFICAR_BUZON_UDLAP=off` lo apaga (desarrollo y CI, donde no hay salida a
 * Microsoft ni buzones reales): entonces todo correo UDLAP «existe».
 */
export type VerificadorBuzon = (email: string) => Promise<ResultadoBuzon>;

const URL_MICROSOFT = 'https://login.microsoftonline.com/common/GetCredentialType';
const ESPERA_MS = 8_000;

export const existeBuzonUdlap: VerificadorBuzon = async (email) => {
  if (process.env.VERIFICAR_BUZON_UDLAP === 'off') return RESULTADO_BUZON.EXISTE;

  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ESPERA_MS);
  try {
    const res = await fetch(URL_MICROSOFT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ Username: email, isOtherIdpSupported: true }),
      signal: control.signal,
    });
    if (!res.ok) return RESULTADO_BUZON.DESCONOCIDO;
    const datos = (await res.json()) as { IfExistsResult?: unknown; ThrottleStatus?: unknown };
    return interpretarIfExists(datos.IfExistsResult, datos.ThrottleStatus);
  } catch {
    // Sin red, tiempo agotado o respuesta rara: no se sabe, y no se adivina.
    return RESULTADO_BUZON.DESCONOCIDO;
  } finally {
    clearTimeout(reloj);
  }
};
