/** Handles válidos en Ágora: minúsculas, números y guión bajo. */
const MENCION = /@([a-z][a-z0-9_]{2,29})/gi;

/** Extrae handles únicos mencionados en un texto. */
export function extraerMenciones(texto: string): string[] {
  const vistos = new Set<string>();
  for (const m of texto.matchAll(MENCION)) {
    const handle = m[1]?.toLowerCase();
    if (handle) vistos.add(handle);
  }
  return [...vistos];
}

/** Partes de texto plano y menciones para renderizar en la UI. */
export type ParteTexto =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'mencion'; valor: string; handle: string };

export function partirTextoConMenciones(texto: string): ParteTexto[] {
  const partes: ParteTexto[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(MENCION)) {
    const indice = m.index ?? 0;
    if (indice > ultimo) {
      partes.push({ tipo: 'texto', valor: texto.slice(ultimo, indice) });
    }
    partes.push({ tipo: 'mencion', valor: m[0]!, handle: m[1]!.toLowerCase() });
    ultimo = indice + m[0]!.length;
  }
  if (ultimo < texto.length) {
    partes.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  }
  return partes.length > 0 ? partes : [{ tipo: 'texto', valor: texto }];
}
