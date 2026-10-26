/**
 * Politica de contenido de Agora.
 *
 * Regla que define el caracter del producto (plan 2.1): esto es un lugar donde
 * se puede decir lo que se piensa. Criticar profesores, materias y a la
 * administracion, quejarse, opinar de politica, humor negro, desacuerdo duro y
 * groserias NO se tocan. Esa es la razon de existir frente a un canal
 * institucional.
 *
 * Solo cinco cosas cruzan la linea roja. Todo lo demas, como mucho, se encola
 * para que lo mire una persona.
 */

export const LINEAS_ROJAS = {
  INTIMIDAD_SEXUAL: 'intimidad_sexual',
  DATOS_PERSONALES: 'datos_personales',
  AMENAZA_VIOLENCIA: 'amenaza_violencia',
  ACOSO_DIRIGIDO: 'acoso_dirigido',
  SUPLANTACION: 'suplantacion',
} as const;

export type LineaRoja = (typeof LINEAS_ROJAS)[keyof typeof LINEAS_ROJAS];

export const LINEA_ROJA_EXPLICACION: Record<LineaRoja, string> = {
  intimidad_sexual:
    'Contenido intimo sexual sin consentimiento. Es delito en Mexico (Ley Olimpia, 3 a 6 anos de prision).',
  datos_personales:
    'Datos personales de otra persona: direccion, telefono, matricula u horario.',
  amenaza_violencia: 'Amenaza de violencia contra una persona identificable.',
  acoso_dirigido: 'Acoso dirigido y sostenido contra un usuario concreto.',
  suplantacion: 'Hacerse pasar por otra persona.',
};

/** Que hacer con un contenido despues de evaluarlo. */
export const DECISIONES = {
  /** Se publica. El caso normal, incluida la critica dura. */
  PUBLICAR: 'publicar',
  /** Se publica pero un humano lo revisa. La IA nunca borra por su cuenta. */
  PUBLICAR_Y_ENCOLAR: 'publicar_y_encolar',
  /** Unico caso de retirada automatica: linea roja clara. */
  RETIRAR: 'retirar',
} as const;

export type Decision = (typeof DECISIONES)[keyof typeof DECISIONES];

export interface Veredicto {
  readonly decision: Decision;
  readonly lineaRoja?: LineaRoja;
  /** Texto que ve el autor. Siempre presente si no se publica sin mas. */
  readonly motivo?: string;
  /** Por que lo marco el clasificador, para quien modera (nunca se le muestra al autor). */
  readonly razonIA?: string;
}

/**
 * Lo que devuelve el clasificador con salida estructurada. `linea_roja` es
 * `'ninguna'` cuando no aplica: un valor mas en el enum es mas facil de
 * garantizar que un null en el esquema.
 */
export interface Clasificacion {
  readonly decision: 'publicar' | 'revisar' | 'retirar';
  readonly linea_roja: LineaRoja | 'ninguna';
  readonly razon: string;
}

const LISTA_LINEAS_ROJAS = Object.values(LINEAS_ROJAS) as readonly string[];

/** `true` si el valor es una clasificacion completa y con valores del esquema. */
export const esClasificacion = (valor: unknown): valor is Clasificacion => {
  if (!valor || typeof valor !== 'object') return false;
  const c = valor as Record<string, unknown>;
  return (
    (c.decision === 'publicar' || c.decision === 'revisar' || c.decision === 'retirar') &&
    typeof c.linea_roja === 'string' &&
    (c.linea_roja === 'ninguna' || LISTA_LINEAS_ROJAS.includes(c.linea_roja)) &&
    typeof c.razon === 'string'
  );
};

/**
 * Traduce la clasificacion al veredicto de la politica. Funcion pura: se
 * prueba sin red.
 *
 * Retirar exige una linea roja nombrada. Si el clasificador pide retirar sin
 * decir cual, no se borra nada: pasa a revision humana. Un falso positivo aqui
 * borra el discurso legitimo de un alumno, que es peor para este producto que
 * dejar un caso en la cola.
 */
export const veredictoDe = (c: Clasificacion): Veredicto => {
  const razonIA = c.razon.trim() || undefined;
  if (c.decision === 'retirar' && c.linea_roja !== 'ninguna') {
    return {
      decision: DECISIONES.RETIRAR,
      lineaRoja: c.linea_roja,
      motivo: LINEA_ROJA_EXPLICACION[c.linea_roja],
      razonIA,
    };
  }
  if (c.decision === 'retirar' || c.decision === 'revisar') {
    return {
      decision: DECISIONES.PUBLICAR_Y_ENCOLAR,
      motivo: 'Publicado. Un moderador lo revisara.',
      razonIA,
    };
  }
  return { decision: DECISIONES.PUBLICAR };
};
