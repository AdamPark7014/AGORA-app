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
  ingenieria: 'Escuela de Ingeniería',
  'negocios-economia': 'Escuela de Negocios y Economía',
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
  { slug: 'diseno', nombre: 'Diseño', escuela: 'artes-humanidades' },
  // Ciencias
  { slug: 'actuaria-fisica-matematicas', nombre: 'Actuaría, Física y Matemáticas', escuela: 'ciencias' },
  { slug: 'ciencias-quimico-biologicas', nombre: 'Ciencias Químico Biológicas', escuela: 'ciencias' },
  { slug: 'ciencias-salud', nombre: 'Ciencias de la Salud', escuela: 'ciencias' },
  // Ciencias Sociales
  { slug: 'antropologia', nombre: 'Antropología', escuela: 'ciencias-sociales' },
  { slug: 'ri-ciencia-politica', nombre: 'Relaciones Internacionales y Ciencia Política', escuela: 'ciencias-sociales' },
  { slug: 'ciencias-comunicacion', nombre: 'Ciencias de la Comunicación', escuela: 'ciencias-sociales' },
  { slug: 'derecho', nombre: 'Derecho', escuela: 'ciencias-sociales' },
  { slug: 'ciencias-educacion', nombre: 'Ciencias de la Educación', escuela: 'ciencias-sociales' },
  { slug: 'psicologia', nombre: 'Psicología', escuela: 'ciencias-sociales' },
  // Ingenieria
  { slug: 'computacion-electronica-mecatronica', nombre: 'Computación, Electrónica y Mecatrónica', escuela: 'ingenieria' },
  { slug: 'civil-ambiental', nombre: 'Ingeniería Civil y Ambiental', escuela: 'ingenieria' },
  { slug: 'industrial-mecanica', nombre: 'Ingeniería Industrial y Mecánica', escuela: 'ingenieria' },
  // Negocios y Economia
  { slug: 'administracion-empresas', nombre: 'Administración de Empresas', escuela: 'negocios-economia' },
  { slug: 'mercadotecnia', nombre: 'Mercadotecnia', escuela: 'negocios-economia' },
  { slug: 'negocios-internacionales', nombre: 'Administración de Negocios Internacionales', escuela: 'negocios-economia' },
  { slug: 'economia', nombre: 'Economía', escuela: 'negocios-economia' },
  { slug: 'finanzas-contaduria', nombre: 'Finanzas y Contaduría', escuela: 'negocios-economia' },
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
  { slug: 'animacion-digital', nombre: 'Animación Digital', escuela: 'artes-humanidades' , departamento: 'diseno' },
  { slug: 'arquitectura', nombre: 'Arquitectura', escuela: 'artes-humanidades' , departamento: 'arquitectura' },
  { slug: 'arquitectura-interiores', nombre: 'Arquitectura de Interiores', escuela: 'artes-humanidades' , departamento: 'arquitectura' },
  { slug: 'artes-plasticas', nombre: 'Artes Plásticas', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'danza', nombre: 'Danza', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'diseno-informacion-visual', nombre: 'Diseño de Información Visual', escuela: 'artes-humanidades' , departamento: 'diseno' },
  { slug: 'historia-arte-curaduria', nombre: 'Historia del Arte y Curaduría', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'idiomas', nombre: 'Idiomas', escuela: 'artes-humanidades' , departamento: 'lenguas' },
  { slug: 'literatura', nombre: 'Literatura', escuela: 'artes-humanidades' , departamento: 'letras-humanidades' },
  { slug: 'musica', nombre: 'Música', escuela: 'artes-humanidades' , departamento: 'artes' },
  { slug: 'teatro', nombre: 'Teatro', escuela: 'artes-humanidades' , departamento: 'artes' },
  // Ciencias Sociales (10)
  { slug: 'antropologia', nombre: 'Antropología', escuela: 'ciencias-sociales' , departamento: 'antropologia' },
  { slug: 'ciencia-politica', nombre: 'Ciencia Política', escuela: 'ciencias-sociales' , departamento: 'ri-ciencia-politica' },
  { slug: 'comunicacion-produccion-medios', nombre: 'Comunicación y Producción de Medios', escuela: 'ciencias-sociales' , departamento: 'ciencias-comunicacion' },
  { slug: 'comunicacion-relaciones-publicas', nombre: 'Comunicación y Relaciones Públicas', escuela: 'ciencias-sociales' , departamento: 'ciencias-comunicacion' },
  { slug: 'derecho', nombre: 'Derecho', escuela: 'ciencias-sociales' , departamento: 'derecho' },
  { slug: 'pedagogia', nombre: 'Pedagogía', escuela: 'ciencias-sociales' , departamento: 'ciencias-educacion' },
  { slug: 'psicologia-clinica', nombre: 'Psicología Clínica', escuela: 'ciencias-sociales' , departamento: 'psicologia' },
  { slug: 'psicologia-organizacional', nombre: 'Psicología Organizacional', escuela: 'ciencias-sociales' , departamento: 'psicologia' },
  { slug: 'relaciones-internacionales', nombre: 'Relaciones Internacionales', escuela: 'ciencias-sociales' , departamento: 'ri-ciencia-politica' },
  { slug: 'relaciones-multiculturales', nombre: 'Relaciones Multiculturales', escuela: 'ciencias-sociales' , departamento: 'ri-ciencia-politica' },
  // Ciencias (11)
  { slug: 'actuaria', nombre: 'Actuaría', escuela: 'ciencias' , departamento: 'actuaria-fisica-matematicas' },
  { slug: 'biologia', nombre: 'Biología', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  { slug: 'bioquimica-clinica', nombre: 'Bioquímica Clínica', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  { slug: 'ciencia-datos', nombre: 'Ciencia de Datos', escuela: 'ciencias' , departamento: 'actuaria-fisica-matematicas' },
  { slug: 'ciencias-nutricion', nombre: 'Ciencias de la Nutrición', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'cirujano-dentista', nombre: 'Cirujano Dentista', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'enfermeria', nombre: 'Enfermería', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'fisica', nombre: 'Física', escuela: 'ciencias' , departamento: 'actuaria-fisica-matematicas' },
  { slug: 'medico-cirujano', nombre: 'Médico Cirujano', escuela: 'ciencias' , departamento: 'ciencias-salud' },
  { slug: 'nanotecnologia', nombre: 'Nanotecnología e Ingeniería Molecular', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  { slug: 'quimico-farmaceutico-biologo', nombre: 'Químico Farmacéutico Biólogo', escuela: 'ciencias' , departamento: 'ciencias-quimico-biologicas' },
  // Ingenieria (12)
  { slug: 'ing-ambiental', nombre: 'Ingeniería Ambiental', escuela: 'ingenieria' , departamento: 'civil-ambiental' },
  { slug: 'ing-biomedica', nombre: 'Ingeniería Biomédica', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-civil', nombre: 'Ingeniería Civil', escuela: 'ingenieria' , departamento: 'civil-ambiental' },
  { slug: 'ing-energia', nombre: 'Ingeniería en Energía', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-industrias-alimentarias', nombre: 'Ingeniería en Industrias Alimentarias', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-logistica', nombre: 'Ingeniería en Logística y Cadena de Suministros', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-robotica-telecomunicaciones', nombre: 'Ingeniería en Robótica y Telecomunicaciones', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-sistemas-computacionales', nombre: 'Ingeniería en Sistemas Computacionales', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-industrial', nombre: 'Ingeniería Industrial', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-mecanica', nombre: 'Ingeniería Mecánica', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  { slug: 'ing-mecatronica', nombre: 'Ingeniería Mecatrónica', escuela: 'ingenieria' , departamento: 'computacion-electronica-mecatronica' },
  { slug: 'ing-quimica', nombre: 'Ingeniería Química', escuela: 'ingenieria' , departamento: 'industrial-mecanica' },
  // Negocios y Economia (8)
  { slug: 'administracion-empresas', nombre: 'Administración de Empresas', escuela: 'negocios-economia' , departamento: 'administracion-empresas' },
  { slug: 'administracion-hoteles-restaurantes', nombre: 'Administración de Hoteles y Restaurantes', escuela: 'negocios-economia' , departamento: 'turismo' },
  { slug: 'administracion-negocios-internacionales', nombre: 'Administración de Negocios Internacionales', escuela: 'negocios-economia' , departamento: 'negocios-internacionales' },
  { slug: 'artes-culinarias', nombre: 'Artes Culinarias', escuela: 'negocios-economia' , departamento: 'turismo' },
  { slug: 'banca-inversiones', nombre: 'Banca e Inversiones', escuela: 'negocios-economia' , departamento: 'banca-inversiones' },
  { slug: 'economia', nombre: 'Economía', escuela: 'negocios-economia' , departamento: 'economia' },
  { slug: 'estrategias-financieras-contaduria', nombre: 'Estrategias Financieras y Contaduría Pública', escuela: 'negocios-economia' , departamento: 'finanzas-contaduria' },
  { slug: 'mercadotecnia', nombre: 'Mercadotecnia', escuela: 'negocios-economia' , departamento: 'mercadotecnia' },
];

/** Los 4 colegios residenciales. Eje social fuerte: ahi se vive. */
export const COLEGIOS_RESIDENCIALES = [
  { slug: 'cain-murray', nombre: 'Cain Murray' },
  { slug: 'ray-lindley', nombre: 'Ray Lindley' },
  { slug: 'ignacio-bernal', nombre: 'Ignacio Bernal' },
  { slug: 'jose-gaos', nombre: 'José Gaos' },
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
