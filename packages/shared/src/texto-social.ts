/** Partes de texto enriquecido para la UI. */
export type ParteTextoSocial =
  | { tipo: 'texto'; valor: string }
  | { tipo: 'mencion'; valor: string; handle: string }
  | { tipo: 'hashtag'; valor: string; tag: string };

const TOKEN = /(@[a-z][a-z0-9_]{2,29}|#[\p{L}\p{N}_]{2,40})/giu;

export function partirTextoSocial(texto: string): ParteTextoSocial[] {
  const partes: ParteTextoSocial[] = [];
  let ultimo = 0;

  for (const m of texto.matchAll(TOKEN)) {
    const indice = m.index ?? 0;
    if (indice > ultimo) {
      partes.push({ tipo: 'texto', valor: texto.slice(ultimo, indice) });
    }
    const token = m[0]!;
    if (token.startsWith('@')) {
      partes.push({ tipo: 'mencion', valor: token, handle: token.slice(1).toLowerCase() });
    } else {
      partes.push({ tipo: 'hashtag', valor: token, tag: token.slice(1) });
    }
    ultimo = indice + token.length;
  }

  if (ultimo < texto.length) {
    partes.push({ tipo: 'texto', valor: texto.slice(ultimo) });
  }

  return partes.length > 0 ? partes : [{ tipo: 'texto', valor: texto }];
}
