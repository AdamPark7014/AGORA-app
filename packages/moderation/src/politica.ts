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
}

/**
 * Categorias de la API omni-moderation de OpenAI mapeadas a lineas rojas.
 *
 * Deliberadamente NO se mapean 'hate' ni 'harassment' genericos a retirada:
 * en un campus, "el profesor de calculo es un inutil" dispara harassment y es
 * exactamente el discurso que este producto existe para permitir. Solo el
 * acoso con objetivo individual y sostenido cuenta, y eso lo decide una
 * persona viendo el historial, no un clasificador viendo un texto suelto.
 */
export const CATEGORIA_A_LINEA_ROJA: Readonly<Record<string, LineaRoja>> = {
  'sexual/minors': LINEAS_ROJAS.INTIMIDAD_SEXUAL,
  'violence/graphic': LINEAS_ROJAS.AMENAZA_VIOLENCIA,
  'harassment/threatening': LINEAS_ROJAS.AMENAZA_VIOLENCIA,
  'hate/threatening': LINEAS_ROJAS.AMENAZA_VIOLENCIA,
  'self-harm/instructions': LINEAS_ROJAS.AMENAZA_VIOLENCIA,
};

/**
 * Categorias que solo justifican una mirada humana, nunca retirada automatica.
 */
export const CATEGORIAS_A_REVISAR: readonly string[] = [
  'harassment',
  'hate',
  'sexual',
  'self-harm',
  'violence',
];

/**
 * Umbral alto a proposito. Un falso positivo aqui borra el discurso legitimo
 * de un alumno, que es peor para este producto que dejar pasar un caso a la
 * cola humana.
 */
export const UMBRAL_LINEA_ROJA = 0.85;

/** Umbral para pedir revision humana. Mas laxo: encolar no le cuesta a nadie. */
export const UMBRAL_REVISION = 0.6;

export interface PuntajesModeracion {
  readonly [categoria: string]: number;
}

/**
 * Decide que hacer con un contenido a partir de los puntajes del clasificador.
 * Funcion pura: sin red, sin base de datos. Asi se puede probar contra un
 * corpus de casos en espanol sin gastar una sola llamada.
 */
export const decidir = (puntajes: PuntajesModeracion): Veredicto => {
  for (const [categoria, linea] of Object.entries(CATEGORIA_A_LINEA_ROJA)) {
    const puntaje = puntajes[categoria] ?? 0;
    if (puntaje >= UMBRAL_LINEA_ROJA) {
      return {
        decision: DECISIONES.RETIRAR,
        lineaRoja: linea,
        motivo: LINEA_ROJA_EXPLICACION[linea],
      };
    }
  }

  // Las categorias de linea roja tambien cuentan para la revision humana. Sin
  // esto, un puntaje de amenaza de 0.84 se publicaba sin que nadie lo mirara:
  // quedaba por debajo del umbral de retirada y su clave ('harassment/
  // threatening') no coincide con las categorias genericas de abajo. Justo el
  // caso que mas necesita ojos humanos era el que se escapaba.
  const aRevisar = [...Object.keys(CATEGORIA_A_LINEA_ROJA), ...CATEGORIAS_A_REVISAR];

  for (const categoria of aRevisar) {
    if ((puntajes[categoria] ?? 0) >= UMBRAL_REVISION) {
      return {
        decision: DECISIONES.PUBLICAR_Y_ENCOLAR,
        motivo: 'Publicado. Un moderador lo revisara.',
      };
    }
  }

  return { decision: DECISIONES.PUBLICAR };
};
