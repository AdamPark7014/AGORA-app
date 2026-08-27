/** Extrae hashtags normalizados (sin #, en minúsculas). */
export function extraerHashtags(texto: string): string[] {
  const tags = new Set<string>();
  for (const m of texto.matchAll(/#([\p{L}\p{N}_]{2,40})/giu)) {
    tags.add(m[1]!.toLowerCase());
  }
  return [...tags];
}
