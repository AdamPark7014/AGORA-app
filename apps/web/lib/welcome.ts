/** Paridad con `seen_welcome` nativo — primera visita post-login/registro. */
export const CLAVE_WELCOME = 'agora-welcome-visto';

export function welcomeVisto(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(CLAVE_WELCOME) === '1';
  } catch {
    return true;
  }
}

export function marcarWelcomeVisto(): void {
  try {
    localStorage.setItem(CLAVE_WELCOME, '1');
  } catch {
    // localStorage bloqueado: no bloquear el flujo.
  }
}

/** Origen ficticio: solo sirve para que `URL` resuelva rutas relativas. */
const ORIGEN_LOCAL = 'https://agora.invalid';

/**
 * El `?siguiente=` que deja el middleware al mandar al login. Solo rutas de
 * esta misma app: cualquier cosa que el navegador resuelva fuera de nuestro
 * origen es un redirect abierto para phishing con nuestro dominio.
 *
 * No basta con mirar el prefijo: el navegador descarta tabuladores y saltos
 * de linea al interpretar una URL, asi que `/\t/evil.com` pasa un
 * `startsWith('//')` y termina en `https://evil.com/`. Por eso se rechaza todo
 * caracter de control y toda barra invertida, y se resuelve con `URL` igual
 * que lo hara el navegador.
 */
export function siguienteSeguro(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(valor)) return null;

  let url: URL;
  try {
    url = new URL(valor, ORIGEN_LOCAL);
  } catch {
    return null;
  }
  if (url.origin !== ORIGEN_LOCAL) return null;

  // `/..//evil.com` se normaliza a la ruta `//evil.com`: dentro de nuestro
  // origen para `URL`, pero otro dominio en cuanto se navega a ella.
  const ruta = url.pathname;
  if (ruta.startsWith('//')) return null;
  if (ruta === '/' || ruta.startsWith('/registro') || ruta.startsWith('/bienvenida')) return null;
  return `${ruta}${url.search}${url.hash}`;
}

export function destinoTrasLogin(tienePerfil: boolean, siguiente?: string | null): string {
  if (!tienePerfil) return '/registro';
  return siguienteSeguro(siguiente) ?? (welcomeVisto() ? '/feed' : '/bienvenida');
}

/** `?siguiente=` de la URL actual, ya validado. */
export function siguienteDeUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return siguienteSeguro(new URLSearchParams(window.location.search).get('siguiente'));
}
