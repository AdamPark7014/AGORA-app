/**
 * Una persona en chiquito, para filas de avatares: «van Diego, Isabella y 21
 * más», «lo siguen Renata e Isabella». Sale del perfil y nunca lleva el correo
 * ni el id interno.
 */
export interface PersonaResumen {
  handle: string;
  nombre: string;
  fotoUrl: string | null;
}

interface PerfilMinimo {
  handle: string;
  nombre: string;
  apellidos: string;
  fotoUrl: string | null;
}

export const aPersonaResumen = (perfil: PerfilMinimo): PersonaResumen => ({
  handle: perfil.handle,
  nombre: `${perfil.nombre} ${perfil.apellidos}`.trim(),
  fotoUrl: perfil.fotoUrl,
});

export interface FilaAsistente {
  eventoId: string;
  userId: string;
  user: { profile: PerfilMinimo | null };
}

/**
 * Hasta `max` asistentes por evento: primero la gente que sigues (es la que
 * reconoces y la que te convence de ir), luego el resto por orden de llegada.
 * Fuera quien te bloqueó o bloqueaste, tú mismo y cuentas sin perfil.
 */
export function elegirAsistentes(
  filas: FilaAsistente[],
  sigo: ReadonlySet<string>,
  ocultos: ReadonlySet<string>,
  yo: string,
  max = 5,
): Map<string, PersonaResumen[]> {
  const porEvento = new Map<string, FilaAsistente[]>();
  for (const fila of filas) {
    if (fila.userId === yo || ocultos.has(fila.userId) || !fila.user.profile) continue;
    const lista = porEvento.get(fila.eventoId) ?? [];
    lista.push(fila);
    porEvento.set(fila.eventoId, lista);
  }
  const elegidos = new Map<string, PersonaResumen[]>();
  for (const [eventoId, lista] of porEvento) {
    // `sort` es estable: dentro de cada grupo se respeta el orden de llegada.
    const ordenada = [...lista].sort((a, b) => Number(sigo.has(b.userId)) - Number(sigo.has(a.userId)));
    elegidos.set(
      eventoId,
      ordenada.slice(0, max).map((f) => aPersonaResumen(f.user.profile!)),
    );
  }
  return elegidos;
}
