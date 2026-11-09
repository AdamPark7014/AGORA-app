/**
 * Fuente única de los colores de Ágora: B «Cholula» (docs/diseno-cholula.md §1, elegida el 28-10-2026).
 *
 * Hasta ahora cada plataforma copiaba la paleta a mano (globals.css, Color.kt, AgoraDesign.swift) y ya no
 * coincidían: la web seguía en la D y Android e iOS se separaban en varios tonos. De aquí salen los archivos
 * de cada plataforma (`pnpm --filter @agora/design-tokens generar`) y el reporte de diferencias (`revisar`).
 * Si cambia un color, se cambia aquí y se regenera; nunca en la plataforma.
 */

export type Hex = `#${string}`;

export interface TokenColor {
  claro: Hex;
  oscuro: Hex;
  uso: string;
  /** Nombre que ya usa cada plataforma hoy, para el reporte de diferencias. */
  web?: string;
  android?: string;
  ios?: string;
}

export const colores = {
  fondo: {
    claro: '#F6F0E7',
    oscuro: '#14100D',
    uso: 'Fondo de pantalla (cantera de día, obsidiana de noche).',
    web: 'fondo',
    android: 'Fondo',
    ios: 'fondo',
  },
  superficie: {
    claro: '#FFFFFF',
    oscuro: '#1E1814',
    uso: 'Tarjetas, boleto, píldoras.',
    web: 'superficie',
    android: 'Superficie',
    ios: 'superficie',
  },
  superficie2: {
    claro: '#EDE4D6',
    oscuro: '#2A221C',
    uso: 'Chips inactivos, cartel neutro, base del esqueleto de carga.',
    web: 'superficie-2',
    android: 'Superficie2',
    ios: 'superficie2',
  },
  tinta: {
    claro: '#1B140F',
    oscuro: '#F6F0E7',
    uso: 'Texto principal.',
    web: 'texto',
    android: 'Texto',
    ios: 'texto',
  },
  secundario: {
    claro: '#6B5D50',
    oscuro: '#C2B4A4',
    uso: 'Texto secundario (>= 4.5:1 sobre fondo y superficie).',
    web: 'texto-medio',
    android: 'TextoMedio',
    ios: 'textoMedio',
  },
  borde: {
    claro: '#E2D6C5',
    oscuro: '#3A2F27',
    uso: 'Bordes de 1.',
    web: 'borde',
    android: 'Borde',
    ios: 'borde',
  },
  bordeSutil: {
    claro: '#EDE4D6',
    oscuro: '#2A221C',
    uso: 'Separadores dentro de una tarjeta.',
    android: 'BordeSutil',
    ios: 'bordeSutil',
  },
  oscuro: {
    claro: '#1B140F',
    oscuro: '#2A221C',
    uso: 'Barras oscuras (acciones del evento, tarjeta de la pregunta).',
    web: 'oscuro',
    android: 'Oscuro',
    ios: 'oscuro',
  },
  naranja: {
    claro: '#E35205',
    oscuro: '#FF6B26',
    uso: 'Marca (Pantone 166 C), terrazas, punto de avisos. No lleva texto blanco encima.',
    web: 'naranja',
    android: 'Naranja',
    ios: 'naranja',
  },
  naranjaSuave: {
    claro: '#FBE6D9',
    oscuro: '#2E1A0F',
    uso: 'Etiquetas y fondo de «PREGUNTA DEL DÍA».',
    web: 'naranja-suave',
    android: 'NaranjaSuave',
    ios: 'naranjaSuave',
  },
  naranjaTinta: {
    claro: '#9A3503',
    oscuro: '#FFB385',
    uso: 'Texto sobre naranjaSuave y #hashtags.',
    web: 'naranja-tinta',
    android: 'NaranjaTinta',
    ios: 'naranjaTinta',
  },
  boton: {
    claro: '#B83C0B',
    oscuro: '#FF7A3D',
    uso: 'Publicar y botones primarios.',
    android: 'Boton',
    ios: 'boton',
  },
  sobreBoton: {
    claro: '#FFFFFF',
    oscuro: '#1A0E07',
    uso: 'Texto sobre boton (>= 4.5:1).',
    android: 'SobreBoton',
    ios: 'sobreBoton',
  },
  talavera: {
    claro: '#1E3A8A',
    oscuro: '#1E3A8A',
    uso: 'Azul Talavera de relleno, con texto blanco.',
    android: 'Talavera',
    ios: 'talavera',
  },
  talaveraTexto: {
    claro: '#1E3A8A',
    oscuro: '#A9C0FF',
    uso: 'Azul Talavera como texto.',
    android: 'TalaveraTexto',
    ios: 'talaveraTexto',
  },
  adobe: {
    claro: '#B5400F',
    oscuro: '#B5400F',
    uso: 'Rojo adobe, con texto blanco.',
    android: 'Adobe',
    ios: 'adobe',
  },
  jade: {
    claro: '#0F766E',
    oscuro: '#0F766E',
    uso: 'Verde jade, con texto blanco.',
    android: 'Jade',
    ios: 'jade',
  },
  maiz: {
    claro: '#E0A82E',
    oscuro: '#E0A82E',
    uso: 'Amarillo maíz, con texto sobreMaiz.',
    android: 'Maiz',
    ios: 'maiz',
  },
  sobreMaiz: {
    claro: '#1B140F',
    oscuro: '#1B140F',
    uso: 'Texto sobre maíz.',
    android: 'SobreMaiz',
    ios: 'sobreMaiz',
  },
  vivo: {
    claro: '#15803D',
    oscuro: '#22C55E',
    uso: 'En vivo / a tiempo.',
    web: 'vivo',
    android: 'Vivo',
    ios: 'vivo',
  },
  exito: {
    claro: '#2A7449',
    oscuro: '#7FC9A8',
    uso: 'Confirmaciones (2A7449 da >= 4.5:1 sobre exitoSuave).',
    android: 'Success',
    ios: 'success',
  },
  peligro: {
    claro: '#C62828',
    oscuro: '#F26161',
    uso: 'Errores y acciones destructivas.',
    web: 'peligro',
    android: 'Danger',
    ios: 'danger',
  },
  peligroSuave: {
    claro: '#FDECEA',
    oscuro: '#3A1414',
    uso: 'Fondo de avisos de error.',
    android: 'DangerSuave',
    ios: 'dangerSuave',
  },
} as const satisfies Record<string, TokenColor>;

export type NombreColor = keyof typeof colores;

/** Pares texto/fondo que deben pasar WCAG AA (4.5:1) en los dos modos. */
export const paresContraste: ReadonlyArray<readonly [texto: NombreColor | '#FFFFFF', fondo: NombreColor]> = [
  ['tinta', 'fondo'],
  ['tinta', 'superficie'],
  ['secundario', 'fondo'],
  ['secundario', 'superficie'],
  ['sobreBoton', 'boton'],
  ['naranjaTinta', 'naranjaSuave'],
  ['talaveraTexto', 'superficie'],
  ['#FFFFFF', 'talavera'],
  ['#FFFFFF', 'adobe'],
  ['#FFFFFF', 'jade'],
  ['sobreMaiz', 'maiz'],
  ['peligro', 'superficie'],
];
