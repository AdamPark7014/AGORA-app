/**
 * Datos de demostracion para beta: usuarios, feed, eventos, marketplace, etc.
 *
 * Idempotente: upsert por correo/handle; publicaciones y demas entidades se
 * reconocen por texto o titulo estable para no duplicar al re-correr el seed.
 */

import {
  CARRERAS,
  comunidadesDelPerfil,
  extraerHashtags,
  SLUG_COMUNIDAD_CAMPUS_UDLAP,
} from '@agora/shared';
import {
  CategoriaAnuncio,
  PrismaClient,
  RespuestaAsistencia,
  SentidoAventon,
  TipoEvento,
  TipoNotificacion,
  TipoReaccion,
} from '@prisma/client';

// ---------------------------------------------------------------------------
// Personajes
// ---------------------------------------------------------------------------

interface Personaje {
  readonly email: string;
  readonly handle: string;
  readonly nombre: string;
  readonly apellidos: string;
  readonly carrera: string;
  readonly generacion: number;
  readonly colegio?: string;
  readonly bio?: string;
  readonly intereses?: string[];
}

const PERSONAJES: readonly Personaje[] = [
  {
    email: 'prueba.uno@udlap.mx',
    handle: 'renata.mv',
    nombre: 'Renata',
    apellidos: 'Márquez',
    carrera: 'ing-sistemas-computacionales',
    generacion: 2024,
    colegio: 'cain-murray',
    bio: 'LIS. Vivo en la biblioteca en época de parciales.',
    intereses: ['programación', 'café', 'anime'],
  },
  {
    email: 'prueba.dos@udlap.mx',
    handle: 'diego.tr',
    nombre: 'Diego',
    apellidos: 'Terán',
    carrera: 'ing-sistemas-computacionales',
    generacion: 2023,
    bio: 'Conmuto desde Puebla todos los días. Pregúntame por aventones.',
    intereses: ['fútbol', 'música', 'aventones'],
  },
  {
    email: 'prueba.tres@udlap.mx',
    handle: 'ximena.oc',
    nombre: 'Ximena',
    apellidos: 'Ocampo',
    carrera: 'derecho',
    generacion: 2024,
    colegio: 'ray-lindley',
    bio: 'Derecho. Debate y café, en ese orden.',
    intereses: ['debate', 'cine', 'voluntariado'],
  },
  {
    email: 'demo.sofia.martinez@udlap.mx',
    handle: 'sofia.mtz',
    nombre: 'Sofía',
    apellidos: 'Martínez',
    carrera: 'psicologia-clinica',
    generacion: 2025,
    colegio: 'ignacio-bernal',
    bio: 'Psicología clínica. Siempre con termo de té.',
    intereses: ['psicología', 'yoga', 'lectura'],
  },
  {
    email: 'demo.carlos.hernandez@udlap.mx',
    handle: 'carlos.hdz',
    nombre: 'Carlos',
    apellidos: 'Hernández',
    carrera: 'ing-industrial',
    generacion: 2022,
    colegio: 'jose-gaos',
    bio: 'Industrial. Organizo torneos de FIFA en el colegio.',
    intereses: ['fifa', 'logística', 'tacos'],
  },
  {
    email: 'demo.valentina.lopez@udlap.mx',
    handle: 'vale.lopez',
    nombre: 'Valentina',
    apellidos: 'López',
    carrera: 'comunicacion-produccion-medios',
    generacion: 2023,
    colegio: 'ray-lindley',
    bio: 'Comunicación. Grabo podcasts en el estudio del campus.',
    intereses: ['podcast', 'fotografía', 'redes'],
  },
  {
    email: 'demo.mateo.sanchez@udlap.mx',
    handle: 'mateo.snc',
    nombre: 'Mateo',
    apellidos: 'Sánchez',
    carrera: 'ing-mecatronica',
    generacion: 2025,
    colegio: 'cain-murray',
    bio: 'Mecatrónica. Armo robots en mi tiempo libre.',
    intereses: ['robótica', 'arduino', 'café'],
  },
  {
    email: 'demo.isabella.ruiz@udlap.mx',
    handle: 'isa.ruiz',
    nombre: 'Isabella',
    apellidos: 'Ruiz',
    carrera: 'arquitectura',
    generacion: 2022,
    colegio: 'ignacio-bernal',
    bio: 'Arquitectura. Colecciono maquetas de edificios.',
    intereses: ['diseño', 'viajes', 'sketch'],
  },
  {
    email: 'demo.santiago.morales@udlap.mx',
    handle: 'santi.mor',
    nombre: 'Santiago',
    apellidos: 'Morales',
    carrera: 'administracion-empresas',
    generacion: 2020,
    bio: 'ADE. Egresado en camino, buscando prácticas.',
    intereses: ['emprendimiento', 'finanzas', 'networking'],
  },
  {
    email: 'demo.lucia.vega@udlap.mx',
    handle: 'lucia.vga',
    nombre: 'Lucía',
    apellidos: 'Vega',
    carrera: 'biologia',
    generacion: 2024,
    colegio: 'jose-gaos',
    bio: 'Biología. Investigación en laboratorio los fines de semana.',
    intereses: ['ciencia', 'naturaleza', 'senderismo'],
  },
  {
    email: 'demo.emilio.castillo@udlap.mx',
    handle: 'emilio.cst',
    nombre: 'Emilio',
    apellidos: 'Castillo',
    carrera: 'ciencia-datos',
    generacion: 2025,
    bio: 'Ciencia de datos. Python es mi segundo idioma.',
    intereses: ['python', 'ml', 'chess'],
  },
  {
    email: 'demo.paula.ortiz@udlap.mx',
    handle: 'paula.ort',
    nombre: 'Paula',
    apellidos: 'Ortiz',
    carrera: 'mercadotecnia',
    generacion: 2023,
    colegio: 'cain-murray',
    bio: 'Mercadotecnia. Siempre con ideas para campañas del campus.',
    intereses: ['branding', 'tiktok', 'eventos'],
  },
  {
    email: 'demo.fernando.jimenez@udlap.mx',
    handle: 'fer.jim',
    nombre: 'Fernando',
    apellidos: 'Jiménez',
    carrera: 'fisica',
    generacion: 2021,
    colegio: 'ray-lindley',
    bio: 'Física. Explico relatividad en fiestas (no me invitan ya).',
    intereses: ['física', 'astronomía', 'videojuegos'],
  },
  {
    email: 'demo.ana.cruz@udlap.mx',
    handle: 'ana.cruz',
    nombre: 'Ana',
    apellidos: 'Cruz',
    carrera: 'enfermeria',
    generacion: 2024,
    colegio: 'ignacio-bernal',
    bio: 'Enfermería. Turnos de práctica y mucho café.',
    intereses: ['salud', 'voluntariado', 'running'],
  },
  {
    email: 'demo.roberto.mendoza@udlap.mx',
    handle: 'roberto.mnd',
    nombre: 'Roberto',
    apellidos: 'Mendoza',
    carrera: 'relaciones-internacionales',
    generacion: 2022,
    colegio: 'jose-gaos',
    bio: 'RI. Modelo ONU y debates los viernes.',
    intereses: ['política', 'idiomas', 'debate'],
  },
  {
    email: 'demo.daniela.reyes@udlap.mx',
    handle: 'dani.reyes',
    nombre: 'Daniela',
    apellidos: 'Reyes',
    carrera: 'diseno-informacion-visual',
    generacion: 2025,
    colegio: 'cain-murray',
    bio: 'Diseño visual. Illustrator abierto 24/7.',
    intereses: ['diseño', 'ilustración', 'tipografía'],
  },
  {
    email: 'demo.luis.navarro@udlap.mx',
    handle: 'luis.nav',
    nombre: 'Luis',
    apellidos: 'Navarro',
    carrera: 'ing-civil',
    generacion: 2020,
    bio: 'Civil. Practico en obra los sábados.',
    intereses: ['construcción', 'fútbol', 'cerveza artesanal'],
  },
  {
    email: 'demo.gabriela.herrera@udlap.mx',
    handle: 'gaby.hrr',
    nombre: 'Gabriela',
    apellidos: 'Herrera',
    carrera: 'actuaria',
    generacion: 2023,
    colegio: 'ray-lindley',
    bio: 'Actuaría. Los números no mienten, la gente sí.',
    intereses: ['estadística', 'excel', 'series'],
  },
  {
    email: 'demo.alejandro.vargas@udlap.mx',
    handle: 'alex.vrg',
    nombre: 'Alejandro',
    apellidos: 'Vargas',
    carrera: 'banca-inversiones',
    generacion: 2024,
    colegio: 'jose-gaos',
    bio: 'Banca e inversiones. Trading paper desde el 2023.',
    intereses: ['finanzas', 'bolsa', 'economía'],
  },
  {
    email: 'demo.camila.garcia@udlap.mx',
    handle: 'cami.garcia',
    nombre: 'Camila',
    apellidos: 'García',
    carrera: 'medico-cirujano',
    generacion: 2021,
    colegio: 'cain-murray',
    bio: 'Medicina. Parciales cada dos semanas, ayuda.',
    intereses: ['medicina', 'anatomía', 'café'],
  },
];

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------

interface Publicacion {
  readonly autor: string;
  readonly comunidad: string;
  readonly texto: string;
  readonly haceMinutos: number;
  readonly encuesta?: { pregunta: string; opciones: string[] };
}

const PUBLICACIONES: readonly Publicacion[] = [
  {
    autor: 'renata.mv',
    comunidad: 'carrera:ing-sistemas-computacionales',
    texto:
      'El parcial de Estructuras estuvo imposible. ¿Alguien entendió el ejercicio 4? Llevo dos horas y sigo igual. #parciales #lis',
    haceMinutos: 12,
  },
  {
    autor: 'diego.tr',
    comunidad: 'carrera:ing-sistemas-computacionales',
    texto:
      'Armé un repo con los apuntes de Arquitecturas hasta el parcial 2, por si a alguien le sirve. Está en Verilog, no en VHDL, ojo. #apuntes #arquitecturas',
    haceMinutos: 47,
  },
  {
    autor: 'ximena.oc',
    comunidad: 'generacion:2024',
    texto:
      '¿Cuándo armamos la reunión de generación? Propongo esta semana antes de que empiecen los finales. #generacion2024',
    haceMinutos: 95,
    encuesta: { pregunta: '¿Qué día nos vemos?', opciones: ['Jueves', 'Viernes', 'Sabado'] },
  },
  {
    autor: 'diego.tr',
    comunidad: 'generacion:2023',
    texto:
      'Aviso: mañana el transporte de las 7:00 sale de la otra puerta. Me enteré por pura suerte, no lo anunciaron en ningún lado. #transporte',
    haceMinutos: 160,
  },
  {
    autor: 'renata.mv',
    comunidad: 'colegio:cain-murray',
    texto:
      '¿A alguien más se le fue el agua caliente en el piso 3? Ya reporté, pero quiero saber si soy solo yo. #cainmurray',
    haceMinutos: 220,
  },
  {
    autor: 'sofia.mtz',
    comunidad: 'carrera:psicologia-clinica',
    texto:
      'Alguien tiene los apuntes de Psicopatología I? Se me olvidó el folder en casa y tengo exposición mañana. #psicologia #ayuda',
    haceMinutos: 35,
  },
  {
    autor: 'carlos.hdz',
    comunidad: 'colegio:jose-gaos',
    texto:
      'Torneo de FIFA en el salón del colegio el viernes a las 8pm. Inscripciones abiertas, traigan control propio. #fifa #josegaos',
    haceMinutos: 180,
  },
  {
    autor: 'vale.lopez',
    comunidad: 'carrera:comunicacion-produccion-medios',
    texto:
      'Busco voces para un podcast sobre vida universitaria. Si te late hablar en micrófono, mándame DM. #podcast #comunicacion',
    haceMinutos: 300,
  },
  {
    autor: 'mateo.snc',
    comunidad: 'carrera:ing-mecatronica',
    texto:
      'Terminé el prototipo del brazo robótico para el proyecto final. Aún le falta calibración pero ya mueve los 6 ejes. #robotica #mecatronica',
    haceMinutos: 420,
  },
  {
    autor: 'isa.ruiz',
    comunidad: 'carrera:arquitectura',
    texto:
      '¿Alguien sabe si la plotter de la escuela ya funciona? Tengo entrega de lámina el lunes. #arquitectura #plotter',
    haceMinutos: 90,
  },
  {
    autor: 'santi.mor',
    comunidad: 'carrera:administracion-empresas',
    texto:
      'Compañía buscando practicantes en finanzas corporativas. Si conocen a alguien de ADE 2020-2022 pásenle el dato. #practicas #ade',
    haceMinutos: 1440,
  },
  {
    autor: 'lucia.vga',
    comunidad: 'carrera:biologia',
    texto:
      'Salida de campo al volcán el próximo sábado. Faltan 3 lugares, traigan botas y termo. #biologia #campo',
    haceMinutos: 2880,
  },
  {
    autor: 'emilio.cst',
    comunidad: 'carrera:ciencia-datos',
    texto:
      'Comparto mi notebook de análisis del dataset del profe. Tiene visualizaciones en matplotlib que quedaron bonitas. #datascience #python',
    haceMinutos: 600,
  },
  {
    autor: 'paula.ort',
    comunidad: 'generacion:2023',
    texto:
      '¿Quién va al concierto de la banda en el auditorio? Armemos grupo para ir juntos. #concierto #campus',
    haceMinutos: 720,
  },
  {
    autor: 'fer.jim',
    comunidad: 'carrera:fisica',
    texto:
      'La demostración de ondas en el laboratorio hoy estuvo increíble. Nunca había visto interferencia tan clara. #fisica #lab',
    haceMinutos: 480,
  },
  {
    autor: 'ana.cruz',
    comunidad: 'carrera:enfermeria',
    texto:
      'Recordatorio: la clínica del campus tiene vacuna de influenza gratis esta semana. Pasen antes de parciales. #salud #enfermeria',
    haceMinutos: 360,
  },
  {
    autor: 'roberto.mnd',
    comunidad: 'carrera:relaciones-internacionales',
    texto:
      'Debate abierto sobre política exterior mañana en el salón 204. Todos invitados, traigan argumentos. #debate #ri',
    haceMinutos: 540,
  },
  {
    autor: 'dani.reyes',
    comunidad: 'carrera:diseno-informacion-visual',
    texto:
      'Subí mi portafolio de branding al perfil. Feedback bienvenido, especialmente sobre tipografía. #diseno #portafolio',
    haceMinutos: 200,
  },
  {
    autor: 'luis.nav',
    comunidad: 'carrera:ing-civil',
    texto:
      'Alguien de civil que haya hecho prácticas en Puebla? Quiero saber cómo es el ambiente en obra. #civil #practicas',
    haceMinutos: 1200,
  },
  {
    autor: 'gaby.hrr',
    comunidad: 'carrera:actuaria',
    texto:
      'El profe de Probabilidad dijo que el examen final será take-home. ¿Alguien más no le cree? #actuaria #finales',
    haceMinutos: 150,
  },
  {
    autor: 'alex.vrg',
    comunidad: 'carrera:banca-inversiones',
    texto:
      'Club de inversiones: reunión el miércoles para analizar el reporte trimestral. Nuevos bienvenidos. #inversiones #finanzas',
    haceMinutos: 800,
  },
  {
    autor: 'cami.garcia',
    comunidad: 'carrera:medico-cirujano',
    texto:
      'Grupo de estudio de Anatomía los domingos en la biblioteca. Ya somos 8, caben 4 más. #medicina #anatomia',
    haceMinutos: 960,
  },
  {
    autor: 'diego.tr',
    comunidad: 'universidad:udlap',
    texto:
      '¿Saben si el comedor ya tiene opción vegana fija? Llevo dos semanas preguntando y nadie sabe. #comedor #udlap',
    haceMinutos: 240,
  },
  {
    autor: 'renata.mv',
    comunidad: 'generacion:2024',
    texto:
      'Fotos del evento de integración de ayer en mi perfil. Taggeen si salen. #integracion #gen2024',
    haceMinutos: 1440,
  },
  {
    autor: 'ximena.oc',
    comunidad: 'colegio:ray-lindley',
    texto:
      'El wifi del colegio lleva 3 días intermitente. ¿Alguien ya reportó a TI? #wifi #raylindley',
    haceMinutos: 180,
  },
];

interface ComentarioSeed {
  readonly postTexto: string;
  readonly autor: string;
  readonly texto: string;
  readonly haceMinutos: number;
}

const COMENTARIOS: readonly ComentarioSeed[] = [
  {
    postTexto: PUBLICACIONES[0]!.texto,
    autor: 'diego.tr',
    texto: 'El 4 era con árboles AVL. Revisa el ejemplo de la clase 12.',
    haceMinutos: 8,
  },
  {
    postTexto: PUBLICACIONES[0]!.texto,
    autor: 'mateo.snc',
    texto: 'Yo también me atoré ahí. Encontré un video en YouTube que lo explica bien.',
    haceMinutos: 5,
  },
  {
    postTexto: PUBLICACIONES[0]!.texto,
    autor: 'emilio.cst',
    texto: 'Si quieren armamos sesión de estudio mañana en la biblio.',
    haceMinutos: 3,
  },
  {
    postTexto: PUBLICACIONES[1]!.texto,
    autor: 'renata.mv',
    texto: '¡Gracias! Justo lo que necesitaba para el parcial.',
    haceMinutos: 30,
  },
  {
    postTexto: PUBLICACIONES[1]!.texto,
    autor: 'mateo.snc',
    texto: '¿Tienes los ejercicios resueltos del capítulo 5?',
    haceMinutos: 25,
  },
  {
    postTexto: PUBLICACIONES[2]!.texto,
    autor: 'renata.mv',
    texto: 'Viernes me funciona mejor, después de clases.',
    haceMinutos: 60,
  },
  {
    postTexto: PUBLICACIONES[2]!.texto,
    autor: 'paula.ort',
    texto: 'Yo voto sábado, tengo parcial el jueves.',
    haceMinutos: 50,
  },
  {
    postTexto: PUBLICACIONES[6]!.texto,
    autor: 'carlos.hdz',
    texto: 'Cuenta conmigo. ¿Hay premio o solo gloria?',
    haceMinutos: 120,
  },
  {
    postTexto: PUBLICACIONES[6]!.texto,
    autor: 'alex.vrg',
    texto: 'Apuntado. Traigo mi control.',
    haceMinutos: 100,
  },
  {
    postTexto: PUBLICACIONES[8]!.texto,
    autor: 'diego.tr',
    texto: 'Se ve brutal. ¿Puedo verlo en persona?',
    haceMinutos: 300,
  },
  {
    postTexto: PUBLICACIONES[11]!.texto,
    autor: 'lucia.vga',
    texto: 'Yo voy. ¿A qué hora salimos del campus?',
    haceMinutos: 2000,
  },
  {
    postTexto: PUBLICACIONES[11]!.texto,
    autor: 'fer.jim',
    texto: 'Suena interesante, aunque no soy de biología me late el volcán.',
    haceMinutos: 1900,
  },
  {
    postTexto: PUBLICACIONES[21]!.texto,
    autor: 'ana.cruz',
    texto: 'Me apunto. ¿Llevan atlas o es digital?',
    haceMinutos: 800,
  },
  {
    postTexto: PUBLICACIONES[21]!.texto,
    autor: 'sofia.mtz',
    texto: 'Mi roomie de medicina dice que sí hay espacio.',
    haceMinutos: 750,
  },
  {
    postTexto: PUBLICACIONES[22]!.texto,
    autor: 'paula.ort',
    texto: 'Pregunté en cafetería y dijeron que sí, pero solo un plato al día.',
    haceMinutos: 200,
  },
];

interface ReaccionSeed {
  readonly postTexto: string;
  readonly usuario: string;
  readonly tipo: TipoReaccion;
}

const REACCIONES: readonly ReaccionSeed[] = [
  { postTexto: PUBLICACIONES[0]!.texto, usuario: 'diego.tr', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[0]!.texto, usuario: 'mateo.snc', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[0]!.texto, usuario: 'emilio.cst', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[1]!.texto, usuario: 'renata.mv', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[1]!.texto, usuario: 'mateo.snc', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[2]!.texto, usuario: 'renata.mv', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[2]!.texto, usuario: 'diego.tr', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[2]!.texto, usuario: 'paula.ort', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[6]!.texto, usuario: 'alex.vrg', tipo: 'ME_RIO' },
  { postTexto: PUBLICACIONES[6]!.texto, usuario: 'carlos.hdz', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[8]!.texto, usuario: 'diego.tr', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[8]!.texto, usuario: 'renata.mv', tipo: 'NO_MAMES' },
  { postTexto: PUBLICACIONES[11]!.texto, usuario: 'fer.jim', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[11]!.texto, usuario: 'lucia.vga', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[15]!.texto, usuario: 'ana.cruz', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[15]!.texto, usuario: 'cami.garcia', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[15]!.texto, usuario: 'sofia.mtz', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[21]!.texto, usuario: 'ana.cruz', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[21]!.texto, usuario: 'sofia.mtz', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[22]!.texto, usuario: 'dani.reyes', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[22]!.texto, usuario: 'vale.lopez', tipo: 'ME_LATE' },
  { postTexto: PUBLICACIONES[4]!.texto, usuario: 'paula.ort', tipo: 'APOYO' },
  { postTexto: PUBLICACIONES[4]!.texto, usuario: 'isa.ruiz', tipo: 'ME_RIO' },
];

interface EventoDemo {
  readonly autor: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly tipo: TipoEvento;
  readonly lugar: string;
  readonly enDias: number;
  readonly hora: number;
  readonly costoMxn?: number;
  readonly cupo?: number;
  readonly comunidad?: string;
  readonly asistentes: readonly { handle: string; respuesta: RespuestaAsistencia }[];
}

const EVENTOS: readonly EventoDemo[] = [
  {
    autor: 'ximena.oc',
    titulo: 'Fiesta de fin de parciales',
    descripcion:
      'Sobrevivimos la semana 9. Traigan lo que quieran tomar, hay bocinas y alberca. Avisen si se van a quedar a dormir.',
    tipo: 'FIESTA',
    lugar: 'Casa en Lomas de Angelópolis',
    enDias: 2,
    hora: 22,
    costoMxn: 150,
    cupo: 40,
    asistentes: [
      { handle: 'renata.mv', respuesta: 'VOY' },
      { handle: 'diego.tr', respuesta: 'VOY' },
      { handle: 'paula.ort', respuesta: 'ME_INTERESA' },
      { handle: 'carlos.hdz', respuesta: 'VOY' },
      { handle: 'alex.vrg', respuesta: 'ME_INTERESA' },
    ],
  },
  {
    autor: 'diego.tr',
    titulo: 'Repaso abierto de Arquitecturas',
    descripcion:
      'Voy a repasar segmentación y riesgos en el pipeline antes del parcial. Llevo mis apuntes en Verilog.',
    tipo: 'ACADEMICO',
    lugar: 'Biblioteca, sala de estudio 3',
    enDias: 1,
    hora: 17,
    costoMxn: 0,
    comunidad: 'carrera:ing-sistemas-computacionales',
    asistentes: [
      { handle: 'renata.mv', respuesta: 'VOY' },
      { handle: 'mateo.snc', respuesta: 'VOY' },
      { handle: 'emilio.cst', respuesta: 'ME_INTERESA' },
    ],
  },
  {
    autor: 'renata.mv',
    titulo: 'Cascarita de fútbol, generación 2024',
    descripcion: 'Equipos mixtos, se arma cuando lleguemos. Traigan playera clara y oscura.',
    tipo: 'DEPORTIVO',
    lugar: 'Canchas de pasto sintético',
    enDias: 4,
    hora: 19,
    costoMxn: 0,
    comunidad: 'generacion:2024',
    asistentes: [
      { handle: 'diego.tr', respuesta: 'VOY' },
      { handle: 'ximena.oc', respuesta: 'VOY' },
      { handle: 'carlos.hdz', respuesta: 'VOY' },
      { handle: 'ana.cruz', respuesta: 'ME_INTERESA' },
      { handle: 'luis.nav', respuesta: 'VOY' },
      { handle: 'fer.jim', respuesta: 'ME_INTERESA' },
    ],
  },
];

interface AnuncioDemo {
  readonly vendedor: string;
  readonly titulo: string;
  readonly descripcion: string;
  readonly categoria: CategoriaAnuncio;
  readonly precioMxn: number;
}

const ANUNCIOS: readonly AnuncioDemo[] = [
  {
    vendedor: 'renata.mv',
    titulo: 'Cálculo de Stewart 8va edición',
    descripcion: 'Buen estado, sin subrayado. Lo usé solo un semestre.',
    categoria: 'LIBROS',
    precioMxn: 350,
  },
  {
    vendedor: 'diego.tr',
    titulo: 'Laptop Dell Inspiron i5 16GB',
    descripcion: 'Funciona perfecto, batería dura 4h. Incluye cargador original.',
    categoria: 'ELECTRONICA',
    precioMxn: 8500,
  },
  {
    vendedor: 'isa.ruiz',
    titulo: 'Escritorio para cuarto de colegio',
    descripcion: 'Madera, 120x60cm. Hay que recogerlo en Cain Murray.',
    categoria: 'MUEBLES',
    precioMxn: 1200,
  },
  {
    vendedor: 'dani.reyes',
    titulo: 'Servicio de diseño de logos',
    descripcion: 'Estudiante de DIV. Logos para proyectos, startups o eventos del campus.',
    categoria: 'SERVICIOS',
    precioMxn: 500,
  },
  {
    vendedor: 'cami.garcia',
    titulo: 'Bata de laboratorio talla M',
    descripcion: 'Casi nueva, la usé un semestre. Sin manchas.',
    categoria: 'ROPA',
    precioMxn: 200,
  },
];

interface AventonDemo {
  readonly conductor: string;
  readonly sentido: SentidoAventon;
  readonly origen: string;
  readonly destino: string;
  readonly enDias: number;
  readonly hora: number;
  readonly lugares: number;
  readonly cuotaMxn: number;
  readonly nota?: string;
  readonly pasajeros: readonly string[];
}

const AVENTONES: readonly AventonDemo[] = [
  {
    conductor: 'diego.tr',
    sentido: 'A_CAMPUS',
    origen: 'Angelópolis',
    destino: 'UDLAP',
    enDias: 1,
    hora: 7,
    lugares: 3,
    cuotaMxn: 30,
    nota: 'Salgo de Plaza Crystal a las 7:00 en punto.',
    pasajeros: ['renata.mv'],
  },
  {
    conductor: 'carlos.hdz',
    sentido: 'DESDE_CAMPUS',
    origen: 'UDLAP',
    destino: 'Cholula centro',
    enDias: 0,
    hora: 18,
    lugares: 2,
    cuotaMxn: 25,
    nota: 'Paso por el mercado si quieren.',
    pasajeros: ['mateo.snc', 'emilio.cst'],
  },
  {
    conductor: 'luis.nav',
    sentido: 'A_CAMPUS',
    origen: 'Lomas de Angelópolis',
    destino: 'UDLAP',
    enDias: 2,
    hora: 8,
    lugares: 4,
    cuotaMxn: 0,
    nota: 'Gratis, solo buena plática.',
    pasajeros: ['gaby.hrr'],
  },
];

interface ConversacionDemo {
  readonly participantes: readonly [string, string];
  readonly mensajes: readonly { autor: string; texto: string; haceMinutos: number }[];
}

const CONVERSACIONES: readonly ConversacionDemo[] = [
  {
    participantes: ['renata.mv', 'diego.tr'],
    mensajes: [
      { autor: 'diego.tr', texto: 'Oye, ¿vas al repaso de Arquitecturas mañana?', haceMinutos: 60 },
      { autor: 'renata.mv', texto: 'Sí, ahí estaré. ¿Llevas los apuntes del capítulo 5?', haceMinutos: 55 },
      { autor: 'diego.tr', texto: 'Sí, te los paso en la biblio.', haceMinutos: 50 },
    ],
  },
  {
    participantes: ['ximena.oc', 'paula.ort'],
    mensajes: [
      { autor: 'paula.ort', texto: '¿Vas a la fiesta del viernes?', haceMinutos: 120 },
      { autor: 'ximena.oc', texto: 'Obvio. ¿Llevamos algo entre las dos?', haceMinutos: 115 },
      { autor: 'paula.ort', texto: 'Yo llevo hielo y vasos.', haceMinutos: 110 },
    ],
  },
  {
    participantes: ['mateo.snc', 'emilio.cst'],
    mensajes: [
      { autor: 'emilio.cst', texto: 'Vi tu post del brazo robótico. ¿Qué motor usaste?', haceMinutos: 400 },
      { autor: 'mateo.snc', texto: 'Servos MG996R. Funcionan bien para el peso.', haceMinutos: 390 },
      { autor: 'emilio.cst', texto: 'Cool, gracias. Te aviso si armo algo parecido.', haceMinutos: 385 },
    ],
  },
  {
    participantes: ['sofia.mtz', 'ana.cruz'],
    mensajes: [
      { autor: 'sofia.mtz', texto: '¿Sigues buscando grupo de estudio de Anatomía?', haceMinutos: 900 },
      { autor: 'ana.cruz', texto: '¡Sí! Mi roomie me dijo que hay uno los domingos.', haceMinutos: 890 },
    ],
  },
  {
    participantes: ['vale.lopez', 'dani.reyes'],
    mensajes: [
      { autor: 'vale.lopez', texto: 'Vi tu portafolio, está increíble. ¿Harías el arte para mi podcast?', haceMinutos: 150 },
      { autor: 'dani.reyes', texto: 'Claro, mándame el brief por aquí.', haceMinutos: 140 },
    ],
  },
];

interface NotificacionDemo {
  readonly destinatario: string;
  readonly actor: string;
  readonly tipo: TipoNotificacion;
  readonly texto: string;
  readonly url: string;
}

const NOTIFICACIONES: readonly NotificacionDemo[] = [
  {
    destinatario: 'renata.mv',
    actor: 'diego.tr',
    tipo: 'COMENTARIO',
    texto: 'Diego comentó tu publicación',
    url: '/feed',
  },
  {
    destinatario: 'renata.mv',
    actor: 'mateo.snc',
    tipo: 'REACCION',
    texto: 'Mateo reaccionó a tu publicación',
    url: '/feed',
  },
  {
    destinatario: 'diego.tr',
    actor: 'renata.mv',
    tipo: 'MENSAJE',
    texto: 'Renata te envió un mensaje',
    url: '/mensajes',
  },
  {
    destinatario: 'renata.mv',
    actor: 'ximena.oc',
    tipo: 'EVENTO_NUEVO',
    texto: 'Ximena creó un evento: Fiesta de fin de parciales',
    url: '/eventos',
  },
  {
    destinatario: 'diego.tr',
    actor: 'renata.mv',
    tipo: 'AVENTON_APARTADO',
    texto: 'Renata apartó un lugar en tu aventón',
    url: '/aventones',
  },
  {
    destinatario: 'mateo.snc',
    actor: 'emilio.cst',
    tipo: 'MENCION',
    texto: 'Emilio te mencionó en una publicación',
    url: '/feed',
  },
  {
    destinatario: 'dani.reyes',
    actor: 'vale.lopez',
    tipo: 'SEGUIDOR',
    texto: 'Valentina empezó a seguirte',
    url: '/perfil/vale.lopez',
  },
  {
    destinatario: 'carlos.hdz',
    actor: 'alex.vrg',
    tipo: 'REACCION',
    texto: 'Alejandro reaccionó a tu publicación',
    url: '/feed',
  },
];

const SEGUIDORES: readonly { seguidor: string; seguido: string }[] = [
  { seguidor: 'vale.lopez', seguido: 'dani.reyes' },
  { seguidor: 'renata.mv', seguido: 'diego.tr' },
  { seguidor: 'diego.tr', seguido: 'renata.mv' },
  { seguidor: 'mateo.snc', seguido: 'emilio.cst' },
  { seguidor: 'emilio.cst', seguido: 'mateo.snc' },
  { seguidor: 'ximena.oc', seguido: 'paula.ort' },
  { seguidor: 'ana.cruz', seguido: 'cami.garcia' },
  { seguidor: 'sofia.mtz', seguido: 'ana.cruz' },
  { seguidor: 'carlos.hdz', seguido: 'alex.vrg' },
  { seguidor: 'isa.ruiz', seguido: 'dani.reyes' },
  { seguidor: 'lucia.vga', seguido: 'fer.jim' },
  { seguidor: 'roberto.mnd', seguido: 'gaby.hrr' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const haceMinutos = (minutos: number): Date => new Date(Date.now() - minutos * 60_000);

const claveDirecta = (a: string, b: string): string => [a, b].sort().join(':');

const carreraMeta = (slug: string) => {
  const carrera = CARRERAS.find((c) => c.slug === slug);
  if (!carrera) throw new Error(`Carrera desconocida en demo: ${slug}`);
  return carrera;
};

async function idPorHandle(
  prisma: PrismaClient,
  handle: string,
): Promise<{ userId: string } | null> {
  const perfil = await prisma.profile.findUnique({
    where: { handle },
    select: { userId: true },
  });
  return perfil;
}

async function vincularHashtags(
  prisma: PrismaClient,
  universityId: string,
  postId: string,
  texto: string,
): Promise<void> {
  const tags = extraerHashtags(texto);
  for (const tag of tags) {
    const hashtag = await prisma.hashtag.upsert({
      where: { universityId_tag: { universityId, tag } },
      update: { lastUsedAt: new Date() },
      create: { universityId, tag },
    });
    await prisma.postHashtag.upsert({
      where: { postId_hashtagId: { postId, hashtagId: hashtag.id } },
      update: {},
      create: { postId, hashtagId: hashtag.id },
    });
  }
}

// ---------------------------------------------------------------------------
// Siembra principal
// ---------------------------------------------------------------------------

export async function sembrarDemo(
  prisma: PrismaClient,
  universityId: string,
  superadminEmail: string | null,
): Promise<void> {
  console.log('-- Sembrando demo');

  const conteos = {
    usuarios: 0,
    publicaciones: 0,
    comentarios: 0,
    reacciones: 0,
    hashtags: 0,
    eventos: 0,
    asistencias: 0,
    anuncios: 0,
    aventones: 0,
    asientos: 0,
    conversaciones: 0,
    mensajes: 0,
    notificaciones: 0,
    seguidores: 0,
  };

  // --- Usuarios y perfiles
  for (const p of PERSONAJES) {
    const meta = carreraMeta(p.carrera);
    const carrera = await prisma.carrera.findFirst({
      where: { slug: p.carrera },
      include: { departamento: true },
    });
    if (!carrera) throw new Error(`Carrera no encontrada en BD: ${p.carrera}`);

    const colegio = p.colegio
      ? await prisma.colegioResidencial.findUnique({ where: { slug: p.colegio } })
      : null;

    const usuario = await prisma.user.upsert({
      where: { email: p.email },
      update: { estado: 'ACTIVO' },
      create: {
        email: p.email,
        universityId,
        estado: 'ACTIVO',
        emailVerifiedAt: new Date(),
      },
    });
    conteos.usuarios += 1;

    await prisma.profile.upsert({
      where: { userId: usuario.id },
      update: {
        nombre: p.nombre,
        apellidos: p.apellidos,
        bio: p.bio,
        intereses: p.intereses ?? [],
      },
      create: {
        userId: usuario.id,
        handle: p.handle,
        nombre: p.nombre,
        apellidos: p.apellidos,
        bio: p.bio,
        generacion: p.generacion,
        carreraId: carrera.id,
        departamentoId: carrera.departamentoId,
        colegioId: colegio?.id,
        intereses: p.intereses ?? [],
      },
    });

    const slugs = [
      SLUG_COMUNIDAD_CAMPUS_UDLAP,
      ...comunidadesDelPerfil({
        escuela: meta.escuela,
        departamento: meta.departamento,
        carrera: meta.slug,
        generacion: p.generacion,
        colegio: p.colegio,
      }),
    ];

    const comunidades = await prisma.community.findMany({ where: { slug: { in: slugs } } });
    await prisma.membership.createMany({
      data: comunidades.map((c) => ({ userId: usuario.id, communityId: c.id, automatica: true })),
      skipDuplicates: true,
    });
  }
  console.log(`   demo usuarios: ${conteos.usuarios}`);

  // --- Publicaciones
  const postIds = new Map<string, string>();
  for (const pub of PUBLICACIONES) {
    const perfil = await prisma.profile.findUnique({ where: { handle: pub.autor } });
    const comunidad = await prisma.community.findFirst({ where: { slug: pub.comunidad } });
    if (!perfil || !comunidad) continue;

    const existente = await prisma.post.findFirst({
      where: { authorId: perfil.userId, texto: pub.texto },
    });
    if (existente) {
      postIds.set(pub.texto, existente.id);
      await vincularHashtags(prisma, universityId, existente.id, pub.texto);
      continue;
    }

    const createdAt = haceMinutos(pub.haceMinutos);
    const post = await prisma.post.create({
      data: {
        authorId: perfil.userId,
        communityId: comunidad.id,
        texto: pub.texto,
        createdAt,
        ...(pub.encuesta
          ? {
              poll: {
                create: {
                  pregunta: pub.encuesta.pregunta,
                  options: {
                    create: pub.encuesta.opciones.map((texto, orden) => ({ texto, orden })),
                  },
                },
              },
            }
          : {}),
      },
    });
    postIds.set(pub.texto, post.id);
    await vincularHashtags(prisma, universityId, post.id, pub.texto);
    conteos.publicaciones += 1;
  }
  console.log(`   demo publicaciones: ${conteos.publicaciones} nuevas`);

  // --- Comentarios
  const comentariosPorPost = new Map<string, number>();
  for (const c of COMENTARIOS) {
    const postId = postIds.get(c.postTexto);
    const autor = await idPorHandle(prisma, c.autor);
    if (!postId || !autor) continue;

    const yaExiste = await prisma.comment.findFirst({
      where: { postId, authorId: autor.userId, texto: c.texto },
    });
    if (yaExiste) continue;

    await prisma.comment.create({
      data: {
        postId,
        authorId: autor.userId,
        texto: c.texto,
        createdAt: haceMinutos(c.haceMinutos),
      },
    });
    comentariosPorPost.set(postId, (comentariosPorPost.get(postId) ?? 0) + 1);
    conteos.comentarios += 1;
  }

  // --- Reacciones
  for (const r of REACCIONES) {
    const postId = postIds.get(r.postTexto);
    const usuario = await idPorHandle(prisma, r.usuario);
    if (!postId || !usuario) continue;

    const previa = await prisma.reaction.findUnique({
      where: { postId_userId: { postId, userId: usuario.userId } },
    });
    if (!previa) {
      await prisma.reaction.create({
        data: { postId, userId: usuario.userId, tipo: r.tipo },
      });
      conteos.reacciones += 1;
    }
  }

  // Actualizar contadores denormalizados en posts afectados
  const postsAfectados = new Set([...comentariosPorPost.keys(), ...postIds.values()]);
  for (const postId of postsAfectados) {
    const [numComments, numReactions] = await Promise.all([
      prisma.comment.count({ where: { postId, estado: 'PUBLICADO' } }),
      prisma.reaction.count({ where: { postId } }),
    ]);
    await prisma.post.update({ where: { id: postId }, data: { numComments, numReactions } });
  }
  console.log(`   demo comentarios: ${conteos.comentarios} nuevos`);
  console.log(`   demo reacciones: ${conteos.reacciones} nuevas`);

  conteos.hashtags = await prisma.hashtag.count({ where: { universityId } });
  console.log(`   demo hashtags: ${conteos.hashtags} en universidad`);

  // --- Eventos y asistencias
  for (const ev of EVENTOS) {
    const perfil = await prisma.profile.findUnique({ where: { handle: ev.autor } });
    if (!perfil) continue;

    let evento = await prisma.evento.findFirst({
      where: { autorId: perfil.userId, titulo: ev.titulo },
    });

    if (!evento) {
      const comunidad = ev.comunidad
        ? await prisma.community.findFirst({ where: { slug: ev.comunidad } })
        : null;
      const inicioAt = new Date();
      inicioAt.setDate(inicioAt.getDate() + ev.enDias);
      inicioAt.setHours(ev.hora, 0, 0, 0);

      evento = await prisma.evento.create({
        data: {
          autorId: perfil.userId,
          universityId,
          communityId: comunidad?.id ?? null,
          titulo: ev.titulo,
          descripcion: ev.descripcion,
          tipo: ev.tipo,
          lugar: ev.lugar,
          inicioAt,
          costoMxn: ev.costoMxn,
          cupo: ev.cupo,
        },
      });
      conteos.eventos += 1;
    }

    for (const asist of ev.asistentes) {
      const asistente = await idPorHandle(prisma, asist.handle);
      if (!asistente) continue;
      const previa = await prisma.asistenciaEvento.findUnique({
        where: { eventoId_userId: { eventoId: evento.id, userId: asistente.userId } },
      });
      if (!previa) {
        await prisma.asistenciaEvento.create({
          data: {
            eventoId: evento.id,
            userId: asistente.userId,
            respuesta: asist.respuesta,
          },
        });
        conteos.asistencias += 1;
      }
    }
  }
  console.log(`   demo eventos: ${conteos.eventos} nuevos, asistencias: ${conteos.asistencias}`);

  // --- Marketplace
  for (const an of ANUNCIOS) {
    const vendedor = await idPorHandle(prisma, an.vendedor);
    if (!vendedor) continue;

    const yaExiste = await prisma.anuncio.findFirst({
      where: { vendedorId: vendedor.userId, titulo: an.titulo },
    });
    if (yaExiste) continue;

    await prisma.anuncio.create({
      data: {
        vendedorId: vendedor.userId,
        universityId,
        titulo: an.titulo,
        descripcion: an.descripcion,
        categoria: an.categoria,
        precioMxn: an.precioMxn,
      },
    });
    conteos.anuncios += 1;
  }
  console.log(`   demo anuncios: ${conteos.anuncios} nuevos`);

  // --- Aventones
  for (const av of AVENTONES) {
    const conductor = await idPorHandle(prisma, av.conductor);
    if (!conductor) continue;

    const salidaAt = new Date();
    salidaAt.setDate(salidaAt.getDate() + av.enDias);
    salidaAt.setHours(av.hora, 0, 0, 0);

    let aventon = await prisma.aventon.findFirst({
      where: {
        conductorId: conductor.userId,
        origen: av.origen,
        destino: av.destino,
        salidaAt,
      },
    });

    if (!aventon) {
      aventon = await prisma.aventon.create({
        data: {
          conductorId: conductor.userId,
          universityId,
          sentido: av.sentido,
          origen: av.origen,
          destino: av.destino,
          salidaAt,
          lugares: av.lugares,
          cuotaMxn: av.cuotaMxn,
          nota: av.nota,
        },
      });
      conteos.aventones += 1;
    }

    for (const pasajeroHandle of av.pasajeros) {
      const pasajero = await idPorHandle(prisma, pasajeroHandle);
      if (!pasajero) continue;
      const previo = await prisma.asientoAventon.findUnique({
        where: { aventonId_userId: { aventonId: aventon.id, userId: pasajero.userId } },
      });
      if (!previo) {
        await prisma.asientoAventon.create({
          data: { aventonId: aventon.id, userId: pasajero.userId },
        });
        conteos.asientos += 1;
      }
    }
  }
  console.log(`   demo aventones: ${conteos.aventones} nuevos, asientos: ${conteos.asientos}`);

  // --- Conversaciones DM
  for (const conv of CONVERSACIONES) {
    const [h1, h2] = conv.participantes;
    const p1 = await idPorHandle(prisma, h1);
    const p2 = await idPorHandle(prisma, h2);
    if (!p1 || !p2) continue;

    const clave = claveDirecta(p1.userId, p2.userId);
    let conversacion = await prisma.conversation.findUnique({ where: { claveDirecta: clave } });

    if (!conversacion) {
      conversacion = await prisma.conversation.create({
        data: {
          claveDirecta: clave,
          participantes: {
            create: [{ userId: p1.userId }, { userId: p2.userId }],
          },
        },
      });
      conteos.conversaciones += 1;
    }

    for (const msg of conv.mensajes) {
      const autor = await idPorHandle(prisma, msg.autor);
      if (!autor) continue;

      const yaExiste = await prisma.message.findFirst({
        where: { conversationId: conversacion.id, autorId: autor.userId, texto: msg.texto },
      });
      if (yaExiste) continue;

      await prisma.message.create({
        data: {
          conversationId: conversacion.id,
          autorId: autor.userId,
          texto: msg.texto,
          createdAt: haceMinutos(msg.haceMinutos),
        },
      });
      conteos.mensajes += 1;
    }

    await prisma.conversation.update({
      where: { id: conversacion.id },
      data: { ultimoAt: new Date() },
    });
  }
  console.log(
    `   demo conversaciones: ${conteos.conversaciones} nuevas, mensajes: ${conteos.mensajes}`,
  );

  // --- Seguidores
  for (const s of SEGUIDORES) {
    const seguidor = await idPorHandle(prisma, s.seguidor);
    const seguido = await idPorHandle(prisma, s.seguido);
    if (!seguidor || !seguido) continue;

    await prisma.follow.upsert({
      where: { seguidorId_seguidoId: { seguidorId: seguidor.userId, seguidoId: seguido.userId } },
      update: {},
      create: { seguidorId: seguidor.userId, seguidoId: seguido.userId },
    });
    conteos.seguidores += 1;
  }
  console.log(`   demo seguidores: ${conteos.seguidores}`);

  // --- Notificaciones
  for (const n of NOTIFICACIONES) {
    const destinatario = await idPorHandle(prisma, n.destinatario);
    const actor = await idPorHandle(prisma, n.actor);
    if (!destinatario || !actor) continue;

    const yaExiste = await prisma.notificacion.findFirst({
      where: {
        userId: destinatario.userId,
        tipo: n.tipo,
        texto: n.texto,
        actorId: actor.userId,
      },
    });
    if (yaExiste) continue;

    await prisma.notificacion.create({
      data: {
        userId: destinatario.userId,
        tipo: n.tipo,
        texto: n.texto,
        url: n.url,
        actorId: actor.userId,
        createdAt: haceMinutos(30),
      },
    });
    conteos.notificaciones += 1;
  }
  console.log(`   demo notificaciones: ${conteos.notificaciones} nuevas`);

  // --- Super admin (solo si BOOTSTRAP_SUPERADMIN_EMAIL lo pide)
  if (!superadminEmail) return;
  const fundador = await prisma.user.findUnique({ where: { email: superadminEmail } });
  if (fundador) {
    await prisma.user.update({
      where: { id: fundador.id },
      data: { roles: ['super_admin'] },
    });
    console.log(`   super_admin: ${superadminEmail}`);
    return;
  }
  // En una base nueva (CI, una máquina recién instalada) la cuenta aún no
  // existe y el rol no tenía a quién darse: las e2e de moderación y navegación
  // entraban sin perfil ni rol. Fuera de producción se crea con un perfil
  // mínimo; una cuenta que ya existe nunca se toca más allá del rol.
  if (process.env.NODE_ENV === 'production') return;
  await sembrarFundador(prisma, universityId, superadminEmail);
  console.log(`   super_admin: ${superadminEmail} (cuenta nueva con perfil de demo)`);
}

async function sembrarFundador(
  prisma: PrismaClient,
  universityId: string,
  email: string,
): Promise<void> {
  const carreraSlug = 'ing-sistemas-computacionales';
  const generacion = 2022;
  const carrera = await prisma.carrera.findFirst({ where: { slug: carreraSlug } });
  if (!carrera) throw new Error(`Carrera no encontrada en BD: ${carreraSlug}`);

  const usuario = await prisma.user.create({
    data: {
      email,
      universityId,
      estado: 'ACTIVO',
      emailVerifiedAt: new Date(),
      roles: ['super_admin'],
    },
  });
  // El @ sale del correo, con las reglas de `handleSchema`: letras, números,
  // punto y guion bajo, empieza con letra, máximo 20.
  const local = (email.split('@')[0] ?? '').replace(/[^a-z0-9._]/g, '').slice(0, 20);
  const handle = /^[a-z]/.test(local) && local.length >= 3 ? local : 'equipo.agora';
  await prisma.profile.create({
    data: {
      userId: usuario.id,
      handle,
      nombre: 'Equipo',
      apellidos: 'Ágora',
      generacion,
      carreraId: carrera.id,
      departamentoId: carrera.departamentoId,
    },
  });

  const meta = carreraMeta(carreraSlug);
  const slugs = [
    SLUG_COMUNIDAD_CAMPUS_UDLAP,
    ...comunidadesDelPerfil({
      escuela: meta.escuela,
      departamento: meta.departamento,
      carrera: meta.slug,
      generacion,
    }),
  ];
  const comunidades = await prisma.community.findMany({ where: { slug: { in: slugs } } });
  await prisma.membership.createMany({
    data: comunidades.map((c) => ({ userId: usuario.id, communityId: c.id, automatica: true })),
    skipDuplicates: true,
  });
}
