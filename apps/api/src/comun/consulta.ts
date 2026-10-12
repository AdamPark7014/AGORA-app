/**
 * `?limite=` de la URL a un numero seguro. `Number('abc')` es NaN y llegaba a
 * Prisma como `take: NaN` (un 500); uno negativo invertia el sentido del take.
 */
export function limiteDeConsulta(valor: string | undefined, porDefecto: number, maximo: number): number {
  const n = Number.parseInt(valor ?? '', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, maximo) : porDefecto;
}
