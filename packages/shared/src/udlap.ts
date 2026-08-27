/**
 * Catalogo institucional de la UDLAP.
 *
 * Fuente: Catalogo Institucional 2024, udlap.mx. 5 escuelas, 52 licenciaturas,
 * 4 colegios residenciales.
 *
 * Esto NO es decoracion: es el grafo social del campus. Cada alumno pertenece a
 * su escuela, su departamento, su carrera, su generacion y su colegio, asi que
 * al completar el perfil queda automaticamente en ~5 comunidades sin que nadie
 * las cree a mano. Es la razon por la que un usuario nuevo nunca ve el feed
 * vacio.
 */

export const ESCUELAS = {
  ARTES_HUMANIDADES: 'artes-humanidades',
  CIENCIAS: 'ciencias',
  CIENCIAS_SOCIALES: 'ciencias-sociales',
  INGENIERIA: 'ingenieria',
  NEGOCIOS_ECONOMIA: 'negocios-economia',
} as const;

export type EscuelaKey = (typeof ESCUELAS)[keyof typeof ESCUELAS];
export const ALL_ESCUELAS = Object.values(ESCUELAS);

export const ESCUELA_LABELS: Record<EscuelaKey, string> = {
  'artes-humanidades': 'Escuela de Artes y Humanidades',
  ciencias: 'Escuela de Ciencias',
  'ciencias-sociales': 'Escuela de Ciencias Sociales',
  ingenieria: 'Escuela de Ingenieria',
  'negocios-economia': 'Escuela de Negocios y Economia',
};

export interface Departamento {
  readonly slug: string;
  readonly nombre: string;
  readonly escuela: EscuelaKey;
}

export const DEPARTAMENTOS: readonly Departamento[] = [
  // Artes y Humanidades
  { slug: 'arquitectura', nombre: 'Arquitectura', escuela: 'artes-humanidades' },
  { slug: 'artes', nombre: 'Artes', escuela: 'artes-humanidades' },
  { slug: 'lenguas', nombre: 'Lenguas', escuela: 'artes-humanidades' },
  { slug: 'letras-humanidades', nombre: 'Letras y Humanidades', escuela: 'artes-humanidades' },
  { slug: 'diseno', nombre: 'Diseno', escuela: 'artes-humanidades' },
  // Ciencias
  { slug: 'actuaria-fisica-matematicas', nombre: 'Actuaria, Fisica y Matematicas', escuela: 'ciencias' },
  { slug: 'ciencias-quimico-biologicas', nombre: 'Ciencias Quimico Biologicas', escuela: 'ciencias' },
  { slug: 'ciencias-salud', nombre: 'Ciencias de la Salud', escuela: 'ciencias' },
  // Ciencias Sociales
  { slug: 'antropologia', nombre: 'Antropologia', escuela: 'ciencias-sociales' },
  { slug: 'ri-ciencia-politica', nombre: 'Relaciones Internacionales y Ciencia Politica', escuela: 'ciencias-sociales' },
  { slug: 'ciencias-comunicacion', nombre: 'Ciencias de la Comunicacion', escuela: 'ciencias-sociales' },
  { slug: 'derecho', nombre: 'Derecho', escuela: 'ciencias-sociales' },
  { slug: 'ciencias-educacion', nombre: 'Ciencias de la Educacion', escuela: 'ciencias-sociales' },
  { slug: 'psicologia', nombre: 'Psicologia', escuela: 'ciencias-sociales' },
  // Ingenieria
  { slug: 'computacion-electronica-mecatronica', nombre: 'Computacion, Electronica y Mecatronica', escuela: 'ingenieria' },
  { slug: 'civil-ambiental', nombre: 'Ingenieria Civil y Ambiental', escuela: 'ingenieria' },
  { slug: 'industrial-mecanica', nombre: 'Ingenieria Industrial y Mecanica', escuela: 'ingenieria' },
  // Negocios y Economia
  { slug: 'administracion-empresas', nombre: 'Administracion de Empresas', escuela: 'negocios-economia' },
  { slug: 'mercadotecnia', nombre: 'Mercadotecnia', escuela: 'negocios-economia' },
  { slug: 'negocios-internacionales', nombre: 'Administracion de Negocios Internacionales', escuela: 'negocios-economia' },
  { slug: 'economia', nombre: 'Economia', escuela: 'negocios-economia' },
  { slug: 'finanzas-contaduria', nombre: 'Finanzas y Contaduria', escuela: 'negocios-economia' },
  { slug: 'turismo', nombre: 'Turismo', escuela: 'negocios-economia' },
  { slug: 'banca-inversiones', nombre: 'Banca e Inversiones', escuela: 'negocios-economia' },
];

export interface Carrera {
  readonly slug: string;
  readonly nombre: string;
  readonly escuela: EscuelaKey;
  /**
   * Departamento al que pertenece la carrera.
   *
   * Se deriva de aqui y NO se le pregunta al alumno: muy poca gente sabe a que
   * departamento pertenece su licenciatura, y si se pregunta la mayoria lo deja
   * vacio y la comunidad del departamento nace muerta.
   *
   * Algunas asignaciones son inferencia a partir del nombre del departamento y
   * no estan verificadas contra el catalogo oficial. Si alguna esta mal, se
   * corrige aqui y el seed la reaplica.
   */
  readonly departamento: string;
}

/** Las 52 licenciaturas e ingenierias del catalogo institucional 2024. */
export const CARRERAS: readonly Carrera[] = [
  // Artes y Humanidades (11)
  { slug: 'animacion-digital', nombre: 'Animacion Digital', escuela: 'artes-humanidades' , departamento: 'diseno' },
  { slug: 'arquitectura', nombre: 'Arquitectura', escuela: 'artes-humanidades' , departamento: 'arquitectura' },
  { slug: 'arquitectura-interiores', nombre: 'Arquitectura de Interiores', escuela: 'artes-humanidades' , departamento: 'arquitectura' },
  { slug: 'artes-plasticas', nombre: 'Artes Plasticas', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'danza', nombre: 'Danza', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'diseno-informacion-visual', nombre: 'Diseno de Informacion Visual', escuela: 'artes-humanidades' , departamento: 'diseno' },
  { slug: 'historia-arte-curaduria', nombre: 'Historia del Arte y Curaduria', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'idiomas', nombre: 'Idiomas', escuela: 'artes-humanidades' , departamento: 'lenguas' },
  { slug: 'literatura', nombre: 'Literatura', escuela: 'artes-humanidades' , departamento: 'letras-humanidades' },
  { slug: 'musica', nombre: 'Musica', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'teatro', nombre: 'Teatro', escuela: 'artes-humanidades' , departamento: 'artes' },
  // Ciencias Sociales (10)
  { slug: 'antropologia', nombre: 'Antropologia', escuela: 'ciencias-sociales' , departamento: 'antropologia' },
  { slug: 'ciencia-politica', nombre: 'Ciencia Politica', escuela: 'ciencias-sociales' , departamento: 'ri-ciencia-politica' },
  { slug: 'comunicacion-produccion-medios', nombre: 'Comunicacion y Produccion de Medios', escuela: 'ciencias-sociales' , departamento: 'ciencias-comunicacion' },
  { slug: 'comunicacion-relaciones-publicas', nombre: 'Comunicacion y Relaciones Publicas', escuela: 'ciencias-sociales' , departamento: 'ciencias-comunicacion' },
  { slug: 'derecho', nombre: 'Derecho', escuela: 'ciencias-sociales' , departamento: 'derecho' },
  { slug: 'pedagogia', nombre: 'Pedagogia', escuela: 'ciencias-sociales' , departamento: 'ciencias-educacion' },
  { slug: 'psicologia-clinica', nombre: 'Psicologia Clinica', escuela: 'ciencias-sociales' , departamento: 'psicologia' },
  { slug: 'psicologia-organizacional', nombre: 'Psicologia Organizacional', escuela: 'ciencias-sociales' , departamento: 'psicologia' },
  { slug: 'relaciones-internacionales', nombre: 'Relaciones Internacionales', escuela: 'ciencias-sociales' , departamento: 'ri-ciencia-politica' },
  { slug: 'relaciones-multiculturales', nombre: 'Relaciones Multiculturales', escuela: 'ciencias-sociales' , departamento: 'ri-ciencia-politica' },
  // Ciencias (11)
  { slug: 'actuaria', nombre: 'Actuaria', escuela: 'ciencias' , departamento: 'actuaria-fisica-matematicas' },
  { slug: 'biologia', nombre: 'Biologia', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  { slug: 'bioquimica-clinica', nombre: 'Bioquimica Clinica', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  { slug: 'ciencia-datos', nombre: 'Ciencia de Datos', escuela: 'ciencias' , departamento: 'actuaria-fisica-matematicas' },
  { slug: 'ciencias-nutricion', nombre: 'Ciencias de la Nutricion', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'cirujano-dentista', nombre: 'Cirujano Dentista', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'enfermeria', nombre: 'Enfermeria', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'fisica', nombre: 'Fisica', escuela: 'ciencias' , departamento: 'actuaria-fisica-matematicas' },
  { slug: 'medico-cirujano', nombre: 'Medico Cirujano', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'nanotecnologia', nombre: 'Nanotecnologia e Ingenieria Molecular', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  { slug: 'quimico-farmaceutico-biologo', nombre: 'Quimico Farmaceutico Biologo', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  // Ingenieria (12)
  { slug: 'ing-ambiental', nombre: 'Ingenieria Ambiental', escuela: 'ingenieria' , departamento: 'civil-ambiental' },
  { slug: 'ing-biomedica', nombre: 'Ingenieria Biomedica', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-civil', nombre: 'Ingenieria Civil', escuela: 'ingenieria' , departamento: 'civil-ambiental' },
  { slug: 'ing-energia', nombre: 'Ingenieria en Energia', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-industrias-alimentarias', nombre: 'Ingenieria en Industrias Alimentarias', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-logistica', nombre: 'Ingenieria en Logistica y Cadena de Suministros', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-robotica-telecomunicaciones', nombre: 'Ingenieria en Robotica y Telecomunicaciones', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-sistemas-computacionales', nombre: 'Ingenieria en Sistemas Computacionales', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-industrial', nombre: 'Ingenieria Industrial', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-mecanica', nombre: 'Ingenieria Mecanica', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-mecatronica', nombre: 'Ingenieria Mecatronica', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-quimica', nombre: 'Ingenieria Quimica', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  // Negocios y Economia (8)
  { slug: 'administracion-empresas', nombre: 'Administracion de Empresas', escuela: 'negocios-economia' , departamento: 'administracion-empresas' },
  { slug: 'administracion-hoteles-restaurantes', nombre: 'Administracion de Hoteles y Restaurantes', escuela: 'negocios-economia' , departamento: 'turismo' },
  { slug: 'administracion-negocios-internacionales', nombre: 'Administracion de Negocios Internacionales', escuela: 'negocios-economia' , departamento: 'negocios-internacionales' },
  { slug: 'artes-culinarias', nombre: 'Artes Culinarias', escuela: 'negocios-economia' , departamento: 'turismo' },
  { slug: 'banca-inversiones', nombre: 'Banca e Inversiones', escuela: 'negocios-economia' , departamento: 'banca-inversiones' },
  { slug: 'economia', nombre: 'Economia', escuela: 'negocios-economia' , departamento: 'economia' },
  { slug: 'estrategias-financieras-contaduria', nombre: 'Estrategias Financieras y Contaduria Publica', escuela: 'negocios-economia' , departamento: 'finanzas-contaduria' },
  { slug: 'mercadotecnia', nombre: 'Mercadotecnia', escuela: 'negocios-economia' , departamento: 'mercadotecnia' },
];

/** Los 4 colegios residenciales. Eje social fuerte: ahi se vive. */
export const COLEGIOS_RESIDENCIALES = [
  { slug: 'cain-murray', nombre: 'Cain Murray' },
  { slug: 'ray-lindley', nombre: 'Ray Lindley' },
  { slug: 'ignacio-bernal', nombre: 'Ignacio Bernal' },
  { slug: 'jose-gaos', nombre: 'Jose Gaos' },
] as const;

export type ColegioSlug = (typeof COLEGIOS_RESIDENCIALES)[number]['slug'];

/** Dominio institucional: la unica puerta de entrada a la red. */
export const UDLAP_EMAIL_DOMAIN = 'udlap.mx';

export const carrerasPorEscuela = (escuela: EscuelaKey): readonly Carrera[] =>
  CARRERAS.filter((c) => c.escuela === escuela);

export const buscarCarrera = (slug: string): Carrera | undefined =>
  CARRERAS.find((c) => c.slug === slug);

export const departamentosPorEscuela = (escuela: EscuelaKey): readonly Departamento[] =>
  DEPARTAMENTOS.filter((d) => d.escuela === escuela);
