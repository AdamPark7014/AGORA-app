import { colores, type Hex, type NombreColor } from './tokens.js';
import { rgb } from './contraste.js';

const AVISO = 'Generado por packages/design-tokens (pnpm --filter @agora/design-tokens generar). No editar a mano.';
const nombres = Object.keys(colores) as NombreColor[];

/** camelCase -> kebab-case para variables CSS. */
export function kebab(nombre: string): string {
  return nombre.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}

/** Variables CSS con el mismo esquema de tema que la web: sistema, o `data-theme` si la persona eligió. */
export function generarCss(): string {
  const bloque = (modo: 'claro' | 'oscuro', sangria: string) =>
    nombres.map((n) => `${sangria}--c-${kebab(n)}: ${colores[n][modo].toLowerCase()};`).join('\n');
  return [
    `/* ${AVISO} */`,
    '',
    ':root {',
    bloque('claro', '  '),
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    "  :root:not([data-theme='light']) {",
    bloque('oscuro', '    '),
    '  }',
    '}',
    '',
    ":root[data-theme='dark'] {",
    bloque('oscuro', '  '),
    '}',
    '',
  ].join('\n');
}

const argb = (hex: Hex) => `0xFF${hex.slice(1).toUpperCase()}`;

/** Objeto Kotlin con pares claro/oscuro en ARGB, listo para `Color(...)` de Compose. */
export function generarKotlin(): string {
  const lineas = nombres.map((n) => {
    const nombre = n.charAt(0).toUpperCase() + n.slice(1);
    return `    /** ${colores[n].uso} */\n    val ${nombre} = Par(${argb(colores[n].claro)}, ${argb(colores[n].oscuro)})`;
  });
  return [
    `// ${AVISO}`,
    'package mx.agora.mobile.nativeapp.ui.theme',
    '',
    'object AgoraTokens {',
    '    data class Par(val claro: Long, val oscuro: Long)',
    '',
    lineas.join('\n\n'),
    '}',
    '',
  ].join('\n');
}

/** Enum Swift con pares claro/oscuro en RGB 0-255, el mismo formato que `AgoraDesign.Colors`. */
export function generarSwift(): string {
  const tupla = (hex: Hex) => `(${rgb(hex).join(', ')})`;
  const lineas = nombres.map(
    (n) =>
      `    /// ${colores[n].uso}\n    static let ${n} = Par(claro: ${tupla(colores[n].claro)}, oscuro: ${tupla(colores[n].oscuro)})`,
  );
  return [
    `// ${AVISO}`,
    '',
    'enum AgoraTokens {',
    '    struct Par {',
    '        let claro: (Int, Int, Int)',
    '        let oscuro: (Int, Int, Int)',
    '    }',
    '',
    lineas.join('\n\n'),
    '}',
    '',
  ].join('\n');
}

export const archivos = {
  'tokens.css': generarCss,
  'AgoraTokens.kt': generarKotlin,
  'AgoraTokens.swift': generarSwift,
} as const;
