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

export function destinoTrasLogin(tienePerfil: boolean): string {
  if (!tienePerfil) return '/registro';
  return welcomeVisto() ? '/feed' : '/bienvenida';
}
