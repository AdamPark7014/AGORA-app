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

/**
 * El `?siguiente=` que deja el middleware al mandar al login. Solo rutas de
 * esta misma app: `//otro.sitio` o `/\otro.sitio` serian un redirect abierto
 * para phishing con nuestro dominio.
 */
export function siguienteSeguro(valor: string | null | undefined): string | null {
  if (!valor || !valor.startsWith('/')) return null;
  if (valor.startsWith('//') || valor.startsWith('/\\')) return null;
  if (valor === '/' || valor.startsWith('/registro') || valor.startsWith('/bienvenida')) return null;
  return valor;
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
