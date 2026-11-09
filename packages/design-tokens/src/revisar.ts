import { colores, type Hex, type NombreColor } from './tokens.js';

export type Plataforma = 'web' | 'android' | 'ios';

export interface Diferencia {
  token: NombreColor;
  plataforma: Plataforma;
  nombre: string;
  modo: 'claro' | 'oscuro';
  esperado: Hex;
  encontrado: Hex | null;
}

const hex = (r: number, g: number, b: number): Hex =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Lee `val Nombre get() = par(0xFF.., 0xFF..)` o `Color(0xFF..)` de Color.kt. */
export function leerAndroid(fuente: string, nombre: string): { claro: Hex; oscuro: Hex } | null {
  const linea = new RegExp(`val ${escapar(nombre)}\\b[^\\n]*`).exec(fuente)?.[0];
  if (!linea) return null;
  const valores = [...linea.matchAll(/0xFF([0-9A-Fa-f]{6})/g)].map((m) => `#${m[1]!.toUpperCase()}` as Hex);
  if (valores.length === 0) return null;
  return { claro: valores[0]!, oscuro: valores[1] ?? valores[0]! };
}

/** Lee `static let nombre = dinamico(claro: (r, g, b), oscuro: (r, g, b))` o `fijo((r, g, b))`. */
export function leerIos(fuente: string, nombre: string): { claro: Hex; oscuro: Hex } | null {
  const linea = new RegExp(`static let ${escapar(nombre)} = [^\\n]*`).exec(fuente)?.[0];
  if (!linea) return null;
  const tuplas = [...linea.matchAll(/\((\d+),\s*(\d+),\s*(\d+)\)/g)].map((m) => hex(Number(m[1]), Number(m[2]), Number(m[3])));
  if (tuplas.length === 0) return null;
  return { claro: tuplas[0]!, oscuro: tuplas[1] ?? tuplas[0]! };
}

/** Lee `--nombre: #hex` del primer `:root {` (claro) y de `:root[data-theme='dark'] {` (oscuro). */
export function leerWeb(fuente: string, nombre: string): { claro: Hex | null; oscuro: Hex | null } {
  const bloque = (inicio: string) => {
    const i = fuente.indexOf(inicio);
    if (i < 0) return '';
    return fuente.slice(i, fuente.indexOf('\n}', i));
  };
  const valor = (texto: string) => {
    const m = new RegExp(`--${escapar(nombre)}:\\s*#([0-9a-fA-F]{6})\\b`).exec(texto);
    return m ? (`#${m[1]!.toUpperCase()}` as Hex) : null;
  };
  return { claro: valor(bloque(':root {')), oscuro: valor(bloque(":root[data-theme='dark'] {")) };
}

export function revisar(fuentes: Partial<Record<Plataforma, string>>): Diferencia[] {
  const diferencias: Diferencia[] = [];
  for (const token of Object.keys(colores) as NombreColor[]) {
    const def = colores[token] as (typeof colores)[NombreColor] & Partial<Record<Plataforma, string>>;
    for (const plataforma of ['web', 'android', 'ios'] as const) {
      const nombre = def[plataforma];
      const fuente = fuentes[plataforma];
      if (!nombre || fuente === undefined) continue;
      const leido =
        plataforma === 'web'
          ? leerWeb(fuente, nombre)
          : plataforma === 'android'
            ? leerAndroid(fuente, nombre)
            : leerIos(fuente, nombre);
      for (const modo of ['claro', 'oscuro'] as const) {
        const encontrado = leido?.[modo] ?? null;
        if (encontrado !== def[modo]) {
          diferencias.push({ token, plataforma, nombre, modo, esperado: def[modo], encontrado });
        }
      }
    }
  }
  return diferencias;
}
