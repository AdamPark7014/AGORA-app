/**
 * La puerta de entrada a la red: solo correos @udlap.mx.
 *
 * Esta es la decision de producto mas importante que hay (ver plan 1.4).
 * La exclusividad verificada es lo que hizo que dos tercios de Harvard se
 * registrara en thefacebook en dos semanas. Si esta puerta se abre, Agora se
 * convierte en otra red social generica y pierde su unica ventaja.
 */

import { UDLAP_EMAIL_DOMAIN } from './udlap.js';

/**
 * Normaliza un correo para comparacion y almacenamiento: minusculas y sin
 * espacios alrededor. No toca nada mas — el buzon es sensible a mayusculas
 * segun el RFC, pero Microsoft 365 no lo es, y guardar en minusculas evita
 * cuentas duplicadas del mismo alumno.
 */
export const normalizarCorreo = (correo: string): string => correo.trim().toLowerCase();

/**
 * Un correo pertenece a la UDLAP si su dominio es exactamente udlap.mx.
 *
 * Se compara el dominio completo, no un sufijo: "udlap.mx.attacker.com" y
 * "falsoudlap.mx" deben quedar fuera. Esta funcion es la unica autoridad sobre
 * quien puede entrar; no duplicar la logica en otro lado.
 */
export const esCorreoUdlap = (correo: string): boolean => {
  const normalizado = normalizarCorreo(correo);
  const partes = normalizado.split('@');
  if (partes.length !== 2) return false;
  const [buzon, dominio] = partes;
  if (!buzon || !dominio) return false;
  return dominio === UDLAP_EMAIL_DOMAIN;
};

/** El buzon sin el dominio. Base del identificador publico sugerido. */
export const buzonDeCorreo = (correo: string): string | undefined => {
  if (!esCorreoUdlap(correo)) return undefined;
  return normalizarCorreo(correo).split('@')[0];
};

/**
 * Generacion = ano de ingreso. Se pide al usuario, no se adivina del correo:
 * los formatos de matricula cambian con los anos y una suposicion equivocada
 * mete a alguien en la comunidad incorrecta.
 */
export const GENERACION_MIN = 2015;

/** Cota superior razonable: el ano en curso mas uno, para preinscritos. */
export const generacionValida = (generacion: number, anoActual: number): boolean =>
  Number.isInteger(generacion) && generacion >= GENERACION_MIN && generacion <= anoActual + 1;

/**
 * Ejes del grafo social. Cada uno genera una comunidad automatica al
 * completar el perfil (ver plan 6.3).
 */
export const EJES_COMUNIDAD = {
  UNIVERSIDAD: 'universidad',
  ESCUELA: 'escuela',
  DEPARTAMENTO: 'departamento',
  CARRERA: 'carrera',
  GENERACION: 'generacion',
  COLEGIO: 'colegio',
  ORGANIZACION: 'organizacion',
} as const;

export type EjeComunidad = (typeof EJES_COMUNIDAD)[keyof typeof EJES_COMUNIDAD];

/**
 * Slug canonico de una comunidad. Es la clave unica en la base, asi que tiene
 * que ser estable: mismo eje y mismo valor producen siempre el mismo slug.
 */
export const slugComunidad = (eje: EjeComunidad, valor: string | number): string =>
  `${eje}:${String(valor).trim().toLowerCase()}`;

/** Plaza general del campus: egresados, activos y todo el mundo verificado. */
export const SLUG_COMUNIDAD_CAMPUS_UDLAP = slugComunidad(EJES_COMUNIDAD.UNIVERSIDAD, 'udlap');
export const NOMBRE_COMUNIDAD_CAMPUS_UDLAP = 'Toda la UDLAP';

export interface PerfilParaComunidades {
  readonly escuela?: string;
  readonly departamento?: string;
  readonly carrera?: string;
  readonly generacion?: number;
  readonly colegio?: string;
  readonly organizaciones?: readonly string[];
}

/**
 * Deriva las comunidades a las que pertenece un perfil. Sin esto, un usuario
 * nuevo abre la app y ve un feed vacio — que es exactamente donde mueren las
 * redes sociales nuevas.
 */
export const comunidadesDelPerfil = (perfil: PerfilParaComunidades): string[] => {
  const slugs: string[] = [];
  if (perfil.escuela) slugs.push(slugComunidad(EJES_COMUNIDAD.ESCUELA, perfil.escuela));
  if (perfil.departamento) slugs.push(slugComunidad(EJES_COMUNIDAD.DEPARTAMENTO, perfil.departamento));
  if (perfil.carrera) slugs.push(slugComunidad(EJES_COMUNIDAD.CARRERA, perfil.carrera));
  if (perfil.generacion) slugs.push(slugComunidad(EJES_COMUNIDAD.GENERACION, perfil.generacion));
  if (perfil.colegio) slugs.push(slugComunidad(EJES_COMUNIDAD.COLEGIO, perfil.colegio));
  for (const org of perfil.organizaciones ?? []) {
    slugs.push(slugComunidad(EJES_COMUNIDAD.ORGANIZACION, org));
  }
  return [...new Set(slugs)];
};
