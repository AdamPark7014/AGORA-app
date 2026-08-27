/**
 * Los mismos tokens que la web, en objeto.
 *
 * No se importan de globals.css porque React Native no entiende CSS; se
 * duplican a proposito y con los valores exactos, para que el naranja de la app
 * y el de la web sean el mismo color y no dos naranjas parecidos.
 */
export const TEMA = {
  naranja: '#e35205',
  naranjaHondo: '#c44404',
  naranjaSuave: '#fff1e9',
  fondo: '#f7f8f9',
  superficie: '#ffffff',
  superficie2: '#f2f3f5',
  borde: '#e3e5e8',
  texto: '#0f1419',
  textoMedio: '#536471',
  textoTenue: '#8b98a5',
  peligro: '#d32f2f',
  radio: 14,
  radioChico: 9,
  /** Minimo comodo de Apple; WCAG 2.2 AA exige 24 como piso. */
  tactil: 44,
} as const;
