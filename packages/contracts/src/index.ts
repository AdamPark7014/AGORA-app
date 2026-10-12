export * from './mensajes-es.js';
export * from './responses/index.js';
/**
 * Contratos compartidos entre web, api y (mas adelante) mobile.
 *
 * Una sola definicion de cada forma de dato, validada con Zod en el borde de
 * la API e inferida como tipo en el cliente. Esto es lo que hace que la Fase 8
 * (Expo) sea agregar un target y no reescribir: el movil consume los mismos
 * contratos.
 */

import { z } from 'zod';
import { esCorreoUdlap, GENERACION_MIN, normalizarCorreo } from '@agora/shared';

// ---------------------------------------------------------------------------
// Identidad
// ---------------------------------------------------------------------------

/**
 * El correo institucional. Unico punto de entrada a la red.
 *
 * La validacion delega en esCorreoUdlap de @agora/shared en vez de repetir un
 * regex: si algun dia cambia la regla de dominio, cambia en un solo lugar.
 */
export const correoUdlapSchema = z
  .string()
  .trim()
  .min(5)
  .max(254)
  .transform(normalizarCorreo)
  .refine(esCorreoUdlap, { message: 'Necesitas un correo @udlap.mx para entrar.' });

export const solicitarOtpSchema = z.object({
  email: correoUdlapSchema,
});
export type SolicitarOtp = z.infer<typeof solicitarOtpSchema>;

export const verificarOtpSchema = z.object({
  email: correoUdlapSchema,
  codigo: z
    .string()
    .trim()
    .regex(/^\d{6}$/, { message: 'El codigo son 6 digitos.' }),
  /**
   * Como quiere el cliente su sesion.
   *
   * `cookie` (por omision) es lo que usa la web: httpOnly, fuera del alcance de
   * cualquier script de la pagina. `token` devuelve la cadena en el cuerpo para
   * que la app nativa la guarde en el llavero del sistema — ahi no hay cookies
   * entre origenes y el token es la unica via.
   *
   * Se pide explicitamente y no se manda siempre: un token en el cuerpo que
   * nadie necesita es superficie de fuga gratis.
   */
  modo: z.enum(['cookie', 'token']).default('cookie'),
});
export type VerificarOtp = z.infer<typeof verificarOtpSchema>;

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

/**
 * Handle publico. Minusculas, numeros, punto y guion bajo.
 *
 * Se prohiben los handles que son solo digitos para que nadie pueda hacerse
 * pasar por una matricula, y se reservan nombres del sistema.
 */
const HANDLES_RESERVADOS = new Set([
  'admin',
  'agora',
  'ayuda',
  'api',
  'moderacion',
  'moderador',
  'soporte',
  'udlap',
  'oficial',
  'staff',
  'root',
]);

export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, { message: 'Minimo 3 caracteres.' })
  .max(20, { message: 'Maximo 20 caracteres.' })
  .regex(/^[a-z0-9._]+$/, { message: 'Solo letras, numeros, punto y guion bajo.' })
  .regex(/^[a-z]/, { message: 'Debe empezar con letra.' })
  .refine((h) => !/^\d+$/.test(h), { message: 'No puede ser solo numeros.' })
  .refine((h) => !HANDLES_RESERVADOS.has(h), { message: 'Ese nombre esta reservado.' });

export const generacionSchema = z
  .number()
  .int({ message: 'La generacion es un ano.' })
  .min(GENERACION_MIN, { message: `Desde ${GENERACION_MIN}.` })
  .max(new Date().getFullYear() + 1, { message: 'Ese ano aun no llega.' });

/** Alcance de un perfil dentro de la red. */
export const VISIBILIDADES_PERFIL = ['UNIVERSIDAD', 'COMUNIDADES'] as const;

export const crearPerfilSchema = z.object({
  handle: handleSchema,
  nombre: z.string().trim().min(2).max(60),
  apellidos: z.string().trim().min(2).max(80),
  bio: z.string().trim().max(280).optional(),
  generacion: generacionSchema,
  carreraSlug: z.string().trim().min(1),
  // El departamento NO se pide: se deriva de la carrera en el servidor.
  colegioSlug: z.string().trim().min(1).optional(),
});
export type CrearPerfil = z.infer<typeof crearPerfilSchema>;

export const editarPerfilSchema = crearPerfilSchema.partial().omit({ handle: true });
export type EditarPerfil = z.infer<typeof editarPerfilSchema>;

// ---------------------------------------------------------------------------
// Directorio — lo unico que da valor con 20 usuarios
// ---------------------------------------------------------------------------

export const buscarDirectorioSchema = z.object({
  q: z.string().trim().max(80).optional(),
  escuela: z.string().trim().optional(),
  carrera: z.string().trim().optional(),
  generacion: z.coerce.number().int().optional(),
  colegio: z.string().trim().optional(),
  cursor: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type BuscarDirectorio = z.infer<typeof buscarDirectorioSchema>;

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------

export const crearPostSchema = z
  .object({
    comunidadSlug: z.string().trim().min(1),
    /**
     * Con imagen o video, el texto puede ir vacio: una foto ya es la
     * publicacion. Sin nada adjunto si hace falta escribir algo.
     */
    texto: z.string().trim().max(2000),
    /** Ids de archivos ya subidos por /media. Hasta 4, como cualquier red. */
    mediaIds: z.array(z.string().trim().min(1)).max(4).default([]),
    encuesta: z
      .object({
        pregunta: z.string().trim().min(1).max(200),
        opciones: z
          .array(z.string().trim().min(1).max(100))
          .min(2, { message: 'Una encuesta necesita al menos 2 opciones.' })
          .max(6, { message: 'Maximo 6 opciones.' }),
      })
      .optional(),
  })
  .refine(
    (p) => !p.encuesta || new Set(p.encuesta.opciones).size === p.encuesta.opciones.length,
    { message: 'Las opciones no pueden repetirse.', path: ['encuesta', 'opciones'] },
  )
  .refine((p) => p.texto.length > 0 || p.mediaIds.length > 0, {
    message: 'Escribe algo o adjunta una foto.',
    path: ['texto'],
  });
export type CrearPost = z.infer<typeof crearPostSchema>;

export const crearComentarioSchema = z.object({
  texto: z.string().trim().min(1).max(1000),
});
export type CrearComentario = z.infer<typeof crearComentarioSchema>;

export const editarPostSchema = z.object({
  texto: z.string().trim().min(1).max(2000),
});
export type EditarPost = z.infer<typeof editarPostSchema>;

export const TIPOS_REACCION = ['ME_LATE', 'ME_RIO', 'APOYO', 'NO_MAMES'] as const;
export const reaccionarSchema = z.object({
  tipo: z.enum(TIPOS_REACCION),
});
export type Reaccionar = z.infer<typeof reaccionarSchema>;

export const feedSchema = z.object({
  comunidadSlug: z.string().trim().optional(),
  siguiendo: z.enum(['true', 'false']).optional(),
  cursor: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type Feed = z.infer<typeof feedSchema>;

export const votarEncuestaSchema = z.object({
  opcionId: z.string().trim().min(1),
});
export type VotarEncuesta = z.infer<typeof votarEncuestaSchema>;

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export const TIPOS_EVENTO = [
  'FIESTA',
  'ACADEMICO',
  'DEPORTIVO',
  'CULTURAL',
  'ORGANIZACION',
  'OTRO',
] as const;

export const crearEventoSchema = z
  .object({
    titulo: z.string().trim().min(3, { message: 'Ponle un titulo.' }).max(120),
    descripcion: z.string().trim().min(1, { message: 'Cuenta de que se trata.' }).max(2000),
    tipo: z.enum(TIPOS_EVENTO).default('OTRO'),
    lugar: z.string().trim().min(2, { message: 'Di donde es.' }).max(200),
    inicioAt: z.coerce.date(),
    finAt: z.coerce.date().optional(),
    /// Pesos enteros. 0 es gratis; omitirlo es "no especificado".
    costoMxn: z.coerce.number().int().min(0).max(100000).optional(),
    cupo: z.coerce.number().int().min(1).max(100000).optional(),
    /// Sin comunidad, el evento es para toda la universidad.
    comunidadSlug: z.string().trim().min(1).optional(),
  })
  .refine((e) => !e.finAt || e.finAt.getTime() > e.inicioAt.getTime(), {
    message: 'El evento no puede terminar antes de empezar.',
    path: ['finAt'],
  });
export type CrearEvento = z.infer<typeof crearEventoSchema>;

export const editarEventoSchema = z
  .object({
    titulo: z.string().trim().min(3, { message: 'Ponle un titulo.' }).max(120).optional(),
    descripcion: z.string().trim().min(1, { message: 'Cuenta de que se trata.' }).max(2000).optional(),
    lugar: z.string().trim().min(2, { message: 'Di donde es.' }).max(200).optional(),
    inicioAt: z.coerce.date().optional(),
    finAt: z.coerce.date().optional(),
  })
  .refine((e) => Object.values(e).some((v) => v !== undefined), {
    message: 'Manda al menos un campo para actualizar.',
  })
  .refine((e) => !e.finAt || !e.inicioAt || e.finAt.getTime() > e.inicioAt.getTime(), {
    message: 'El evento no puede terminar antes de empezar.',
    path: ['finAt'],
  });
export type EditarEvento = z.infer<typeof editarEventoSchema>;

export const RESPUESTAS_ASISTENCIA = ['VOY', 'ME_INTERESA'] as const;

export const responderEventoSchema = z.object({
  respuesta: z.enum(RESPUESTAS_ASISTENCIA),
});
export type ResponderEvento = z.infer<typeof responderEventoSchema>;

export const listarEventosSchema = z.object({
  tipo: z.enum(TIPOS_EVENTO).optional(),
  comunidadSlug: z.string().trim().optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListarEventos = z.infer<typeof listarEventosSchema>;

export const enVivoQuerySchema = z.object({
  horas: z.coerce.number().int().min(1).max(48).default(4),
});
export type EnVivoQuery = z.infer<typeof enVivoQuerySchema>;

export const eventoEnVivoSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  inicioAt: z.coerce.date(),
  lugar: z.string(),
  vanAIr: z.number().int(),
  empiezaEnMinutos: z.number().int(),
  enCurso: z.boolean(),
});
export type EventoEnVivo = z.infer<typeof eventoEnVivoSchema>;

export const enVivoResponseSchema = z.object({
  eventos: z.array(eventoEnVivoSchema),
});
export type EnVivoResponse = z.infer<typeof enVivoResponseSchema>;

// ---------------------------------------------------------------------------
// Retos entre amigos
// ---------------------------------------------------------------------------

export const TIPOS_RETO_AMIGO = ['RACHA', 'SEMANA_PREGUNTA'] as const;
export const ESTADOS_RETO_AMIGO = ['PENDIENTE', 'ACTIVO', 'RECHAZADO'] as const;
export const GANANDO_RETO = ['retador', 'retado', 'empate'] as const;

export const crearRetoSchema = z.object({
  retadoHandle: handleSchema,
  tipo: z.enum(TIPOS_RETO_AMIGO),
});
export type CrearReto = z.infer<typeof crearRetoSchema>;

export const responderRetoSchema = z.object({
  aceptar: z.boolean(),
});
export type ResponderReto = z.infer<typeof responderRetoSchema>;

export const retoAmigoSchema = z.object({
  id: z.string(),
  retador: z.object({ handle: z.string(), nombre: z.string() }),
  retado: z.object({ handle: z.string(), nombre: z.string() }),
  tipo: z.enum(TIPOS_RETO_AMIGO),
  estado: z.enum(ESTADOS_RETO_AMIGO),
  puntajeRetador: z.number().int().nullable(),
  puntajeRetado: z.number().int().nullable(),
  ganando: z.enum(GANANDO_RETO).nullable(),
});
export type RetoAmigo = z.infer<typeof retoAmigoSchema>;

export const retosActivosResponseSchema = z.object({
  pendientes: z.array(retoAmigoSchema),
  activos: z.array(retoAmigoSchema),
});
export type RetosActivosResponse = z.infer<typeof retosActivosResponseSchema>;

export const puedeRetarResponseSchema = z.object({
  puedeRetar: z.boolean(),
  motivo: z.string().optional(),
});
export type PuedeRetarResponse = z.infer<typeof puedeRetarResponseSchema>;

export const retosRankingSemanalEntradaSchema = z.object({
  handle: z.string(),
  nombre: z.string(),
  fotoUrl: z.string().nullable(),
  victorias: z.number().int(),
});
export type RetosRankingSemanalEntrada = z.infer<typeof retosRankingSemanalEntradaSchema>;

export const retosRankingSemanalResponseSchema = z.object({
  entradas: z.array(retosRankingSemanalEntradaSchema),
});
export type RetosRankingSemanalResponse = z.infer<typeof retosRankingSemanalResponseSchema>;

export const RESULTADOS_RETO_HISTORIAL = ['ganaste', 'perdiste', 'empate', 'rechazado'] as const;

export const retoHistorialSchema = retoAmigoSchema.extend({
  createdAt: z.coerce.date(),
  activadoAt: z.coerce.date().nullable().optional(),
  resultado: z.enum(RESULTADOS_RETO_HISTORIAL).nullable(),
});
export type RetoHistorial = z.infer<typeof retoHistorialSchema>;

export const retosHistorialResponseSchema = z.object({
  items: z.array(retoHistorialSchema),
  siguienteCursor: z.string().nullable(),
});
export type RetosHistorialResponse = z.infer<typeof retosHistorialResponseSchema>;

// ---------------------------------------------------------------------------
// Mensajeria
// ---------------------------------------------------------------------------

export const abrirConversacionSchema = z.object({
  handle: handleSchema,
});
export type AbrirConversacion = z.infer<typeof abrirConversacionSchema>;

export const enviarMensajeSchema = z.object({
  texto: z.string().trim().min(1, { message: 'Escribe algo.' }).max(4000),
});
export type EnviarMensaje = z.infer<typeof enviarMensajeSchema>;

export const listarMensajesSchema = z.object({
  cursor: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(100).default(50),
});
export type ListarMensajes = z.infer<typeof listarMensajesSchema>;

// ---------------------------------------------------------------------------
// Aventones
// ---------------------------------------------------------------------------

export const SENTIDOS_AVENTON = ['A_CAMPUS', 'DESDE_CAMPUS'] as const;

export const crearAventonSchema = z.object({
  sentido: z.enum(SENTIDOS_AVENTON),
  origen: z.string().trim().min(2, { message: 'Di de donde sales.' }).max(120),
  destino: z.string().trim().min(2, { message: 'Di a donde llegas.' }).max(120),
  salidaAt: z.coerce.date(),
  lugares: z.coerce.number().int().min(1).max(7),
  /// 0 es gratis. El tope evita que alguien publique un numero absurdo.
  cuotaMxn: z.coerce.number().int().min(0).max(2000).default(0),
  nota: z.string().trim().max(500).optional(),
});
export type CrearAventon = z.infer<typeof crearAventonSchema>;

export const listarAventonesSchema = z.object({
  sentido: z.enum(SENTIDOS_AVENTON).optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListarAventones = z.infer<typeof listarAventonesSchema>;

// ---------------------------------------------------------------------------
// Marketplace
// ---------------------------------------------------------------------------

export const CATEGORIAS_ANUNCIO = [
  'LIBROS',
  'ELECTRONICA',
  'MUEBLES',
  'ROPA',
  'CUARTO',
  'SERVICIOS',
  'OTRO',
] as const;

export const ESTADOS_ANUNCIO = ['DISPONIBLE', 'APARTADO', 'VENDIDO'] as const;

export const crearAnuncioSchema = z.object({
  titulo: z.string().trim().min(3, { message: 'Ponle un titulo.' }).max(120),
  descripcion: z.string().trim().min(1, { message: 'Describe lo que vendes.' }).max(2000),
  categoria: z.enum(CATEGORIAS_ANUNCIO).default('OTRO'),
  precioMxn: z.coerce.number().int().min(0).max(1000000),
  /// Ids de imagenes ya subidas por /media. Se asocian al crear el anuncio.
  imagenIds: z.array(z.string().trim().min(1)).max(6).default([]),
});
export type CrearAnuncio = z.infer<typeof crearAnuncioSchema>;

export const actualizarAnuncioSchema = z
  .object({
    estadoVenta: z.enum(ESTADOS_ANUNCIO).optional(),
    titulo: z.string().trim().min(3, { message: 'Ponle un titulo.' }).max(120).optional(),
    descripcion: z.string().trim().min(1, { message: 'Describe lo que vendes.' }).max(2000).optional(),
    precioMxn: z.coerce.number().int().min(0).max(1000000).optional(),
  })
  .refine((a) => Object.values(a).some((v) => v !== undefined), {
    message: 'Manda al menos un campo para actualizar.',
  });
export type ActualizarAnuncio = z.infer<typeof actualizarAnuncioSchema>;

export const listarAnunciosSchema = z.object({
  categoria: z.enum(CATEGORIAS_ANUNCIO).optional(),
  q: z.string().trim().max(80).optional(),
  cursor: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(50).default(20),
});
export type ListarAnuncios = z.infer<typeof listarAnunciosSchema>;

// ---------------------------------------------------------------------------
// Pregunta del dia y perfil ampliado
// ---------------------------------------------------------------------------

export const responderPreguntaSchema = z.object({
  opcion: z.coerce.number().int().min(0).max(9),
});
export type ResponderPregunta = z.infer<typeof responderPreguntaSchema>;

/**
 * Cumpleanos sin ano, a proposito: sirve para felicitar, no para deducir la
 * edad de nadie. Mes y dia van juntos o ninguno.
 */
export const actualizarPerfilSchema = z
  .object({
    bio: z.string().trim().max(280).optional(),
    fotoMediaId: z.string().trim().min(1).nullable().optional(),
    portadaMediaId: z.string().trim().min(1).nullable().optional(),
    cumpleMes: z.coerce.number().int().min(1).max(12).nullable().optional(),
    cumpleDia: z.coerce.number().int().min(1).max(31).nullable().optional(),
    ciudadOrigen: z.string().trim().max(80).optional(),
    /**
     * Usuario de Instagram sin arroba. Se limpia lo que la gente pega de mas:
     * la URL completa, el arroba, espacios.
     */
    instagram: z
      .string()
      .trim()
      .transform((v) =>
        v
          .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
          .replace(/^@/, '')
          .replace(/\/$/, '')
          .trim(),
      )
      .refine((v) => v === '' || /^[a-zA-Z0-9._]{1,30}$/.test(v), {
        message: 'Ese usuario de Instagram no es valido.',
      })
      .optional(),
    intereses: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    busco: z.string().trim().max(120).optional(),
    visibilidad: z.enum(VISIBILIDADES_PERFIL).optional(),
  })
  .refine(
    (p) =>
      (p.cumpleMes == null && p.cumpleDia == null) ||
      (p.cumpleMes != null && p.cumpleDia != null),
    { message: 'El cumpleanos necesita mes y dia.', path: ['cumpleDia'] },
  )
  .refine(
    (p) => {
      if (p.cumpleMes == null || p.cumpleDia == null) return true;
      // Dias por mes, en anio bisiesto para no rechazar el 29 de febrero.
      const tope = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][p.cumpleMes - 1]!;
      return p.cumpleDia <= tope;
    },
    { message: 'Ese dia no existe en ese mes.', path: ['cumpleDia'] },
  );
export type ActualizarPerfil = z.infer<typeof actualizarPerfilSchema>;

// ---------------------------------------------------------------------------
// Zona pseudonima
// ---------------------------------------------------------------------------

/**
 * Sin imagenes y con tope mas corto que el feed normal.
 *
 * El limite bajo es deliberado: un texto largo acumula detalles que permiten
 * des-anonimizar a quien escribe. 600 caracteres bastan para decir algo y no
 * para contar tu vida.
 */
export const publicarAnonimoSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(1, { message: 'Escribe algo.' })
    .max(600, { message: 'Maximo 600 caracteres.' }),
});
export type PublicarAnonimo = z.infer<typeof publicarAnonimoSchema>;

// ---------------------------------------------------------------------------
// Moderacion
// ---------------------------------------------------------------------------

export const MOTIVOS_REPORTE = [
  'INTIMIDAD_SEXUAL',
  'DATOS_PERSONALES',
  'AMENAZA_VIOLENCIA',
  'ACOSO_DIRIGIDO',
  'SUPLANTACION',
  'OTRO',
] as const;

export const crearReporteSchema = z
  .object({
    postId: z.string().trim().optional(),
    commentId: z.string().trim().optional(),
    motivo: z.enum(MOTIVOS_REPORTE),
    detalle: z.string().trim().max(500).optional(),
  })
  .refine((r) => Boolean(r.postId) !== Boolean(r.commentId), {
    message: 'Un reporte apunta a una publicacion o a un comentario, no a ambos.',
  });
export type CrearReporte = z.infer<typeof crearReporteSchema>;

export const ACCIONES_MODERACION = [
  'SIN_ACCION',
  'RETIRAR_CONTENIDO',
  'RESTAURAR_CONTENIDO',
  'ADVERTIR_USUARIO',
  'SUSPENDER_USUARIO',
  'LEVANTAR_SUSPENSION',
] as const;

export const resolverReporteSchema = z.object({
  accion: z.enum(ACCIONES_MODERACION),
  /**
   * Obligatorio, no opcional. El usuario afectado tiene derecho a saber por
   * que se retiro su contenido; sin motivo escrito esa promesa no se cumple.
   */
  motivo: z.string().trim().min(3, { message: 'Escribe el motivo.' }).max(500),
});
export type ResolverReporte = z.infer<typeof resolverReporteSchema>;

export const decidirMarcadoSchema = z.object({
  accion: z.enum(['RESTAURAR_CONTENIDO', 'RETIRAR_CONTENIDO']),
  motivo: z.string().trim().min(3).max(500),
});
export type DecidirMarcado = z.infer<typeof decidirMarcadoSchema>;

export const retirarPostSchema = z.object({
  motivo: z.string().trim().min(3, { message: 'Escribe el motivo.' }).max(500),
});
export type RetirarPost = z.infer<typeof retirarPostSchema>;

/**
 * Baja de la cuenta. `confirmacion` debe ser el @handle (sin arroba) o, si la
 * cuenta no llego a tener perfil, la palabra ELIMINAR: escribirlo evita que un
 * toque accidental borre la cuenta.
 */
export const eliminarCuentaSchema = z.object({
  confirmacion: z.string().trim().min(1, { message: 'Escribe la confirmación.' }).max(60),
});
export type EliminarCuenta = z.infer<typeof eliminarCuentaSchema>;

export const bloquearSchema = z.object({
  /** true = silenciar (no lo veo), false = bloquear (no nos vemos). */
  soloSilencio: z.boolean().default(false),
});
export type Bloquear = z.infer<typeof bloquearSchema>;

export const buscarGlobalSchema = z.object({
  q: z.string().trim().min(2).max(80),
  tipo: z.enum(['todo', 'personas', 'publicaciones', 'eventos', 'marketplace']).default('todo'),
  limite: z.coerce.number().int().min(1).max(20).default(8),
});
export type BuscarGlobal = z.infer<typeof buscarGlobalSchema>;

export const silenciarComunidadSchema = z.object({
  silenciada: z.boolean(),
});
export type SilenciarComunidad = z.infer<typeof silenciarComunidadSchema>;

/**
 * Servicios de push de los navegadores. La API hace POST al `endpoint` de cada
 * suscripcion: si se aceptara cualquier URL, un usuario podia registrar
 * `http://redis:6379` o una IP interna y usar el servidor para pegarle.
 */
const HOSTS_PUSH = [
  'fcm.googleapis.com', // Chrome, Edge en Android, Opera
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari
] as const;
const SUFIJOS_PUSH = ['.push.apple.com', '.notify.windows.com'] as const;

export const esEndpointPushValido = (valor: string): boolean => {
  let url: URL;
  try {
    url = new URL(valor);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return (
    (HOSTS_PUSH as readonly string[]).includes(host) || SUFIJOS_PUSH.some((s) => host.endsWith(s))
  );
};

export const pushSubscriptionSchema = z.object({
  endpoint: z
    .string()
    .url()
    .max(1000)
    .refine(esEndpointPushValido, 'Ese servicio de notificaciones no es valido.'),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;

export const expoPushTokenSchema = z.object({
  token: z.string().min(10),
});
export type ExpoPushToken = z.infer<typeof expoPushTokenSchema>;

export const fcmPushTokenSchema = z.object({
  token: z.string().min(10),
});
export type FcmPushToken = z.infer<typeof fcmPushTokenSchema>;

export const apnsPushTokenSchema = z.object({
  token: z.string().min(10),
});
export type ApnsPushToken = z.infer<typeof apnsPushTokenSchema>;

/** Evento de producto enviado por web o apps nativas. */
export const analyticsEventoSchema = z.object({
  nombre: z.string().trim().min(1).max(80),
  propiedades: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.union([z.string().datetime({ offset: true }), z.number().int().positive()]).optional(),
});
export type AnalyticsEvento = z.infer<typeof analyticsEventoSchema>;

export const analyticsCrashSchema = z.object({
  mensaje: z.string().trim().min(1).max(2000),
  stack: z.string().max(8000).optional(),
  plataforma: z.enum(['web', 'android', 'ios']),
  version: z.string().max(40).optional(),
});
export type AnalyticsCrash = z.infer<typeof analyticsCrashSchema>;

// ---------------------------------------------------------------------------
// Gamificacion — rachas y badges de campus
// ---------------------------------------------------------------------------

export const BADGE_CODIGOS = [
  'PREGUNTA_7',
  'AVENTONERO',
  'EARLY_BIRD',
  'SOCIAL',
  'SEMANA_PERFECTA',
] as const;
export type BadgeCodigo = (typeof BADGE_CODIGOS)[number];

/** Definiciones de badges otorgables en campus. */
export const BADGES_CAMPUS: Record<
  BadgeCodigo,
  {
    readonly codigo: BadgeCodigo;
    readonly etiqueta: string;
    readonly emoji: string;
    readonly subtitulo: string;
  }
> = {
  PREGUNTA_7: {
    codigo: 'PREGUNTA_7',
    etiqueta: '7 días de pregunta',
    emoji: '💬',
    subtitulo: '7 días respondiendo la pregunta del día',
  },
  AVENTONERO: {
    codigo: 'AVENTONERO',
    etiqueta: 'Conductor de confianza',
    emoji: '🚗',
    subtitulo: '3 aventones ofrecidos',
  },
  EARLY_BIRD: {
    codigo: 'EARLY_BIRD',
    etiqueta: 'Madrugador',
    emoji: '🌅',
    subtitulo: '7 días seguidos',
  },
  SOCIAL: {
    codigo: 'SOCIAL',
    etiqueta: 'Voz del campus',
    emoji: '📣',
    subtitulo: '10 publicaciones en el campus',
  },
  SEMANA_PERFECTA: {
    codigo: 'SEMANA_PERFECTA',
    etiqueta: 'Semana perfecta',
    emoji: '⭐',
    subtitulo: '7/7 preguntas esta semana',
  },
};

/** Copy de celebración al desbloquear una insignia nueva. */
export function mensajeNuevaInsignia(codigo: BadgeCodigo): string {
  const def = BADGES_CAMPUS[codigo];
  return `¡Nueva insignia! ${def.emoji} ${def.etiqueta} — ${def.subtitulo}`;
}

export const gamificacionBadgeSchema = z.object({
  codigo: z.enum(BADGE_CODIGOS),
  etiqueta: z.string(),
  emoji: z.string(),
  otorgadoAt: z.coerce.date(),
});

export const semanaPreguntaSchema = z.object({
  respondidas: z.number().int(),
  meta: z.literal(7),
});
export type SemanaPregunta = z.infer<typeof semanaPreguntaSchema>;

export const retoSemanalSchema = z.object({
  titulo: z.string(),
  progreso: z.number().int(),
  meta: z.literal(7),
  completado: z.boolean(),
});
export type RetoSemanal = z.infer<typeof retoSemanalSchema>;

export const comparacionCampusSchema = z.object({
  promedioRacha: z.number(),
  tuRacha: z.number().int(),
  porEncimaDelPromedio: z.boolean(),
});
export type ComparacionCampus = z.infer<typeof comparacionCampusSchema>;

export const gamificacionResponseSchema = z.object({
  rachaActual: z.number().int(),
  rachaMaxima: z.number().int(),
  badges: z.array(gamificacionBadgeSchema),
  semanaPregunta: semanaPreguntaSchema.optional(),
  retoSemanal: retoSemanalSchema.optional(),
  comparacionCampus: comparacionCampusSchema.optional(),
  /** Duelos activos donde tu puntaje supera al rival (Wave 13). */
  duelosGanados: z.number().int().nonnegative().optional(),
});
export type GamificacionResponse = z.infer<typeof gamificacionResponseSchema>;

export const gamificacionPingResponseSchema = z.object({
  nuevasInsignias: z.array(z.enum(BADGE_CODIGOS)),
  gamificacion: gamificacionResponseSchema,
});
export type GamificacionPingResponse = z.infer<typeof gamificacionPingResponseSchema>;

export const leaderboardEntrySchema = z.object({
  handle: z.string(),
  nombre: z.string(),
  fotoUrl: z.string().nullable(),
  rachaActual: z.number().int(),
});
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;

export const leaderboardResponseSchema = z.object({
  entradas: z.array(leaderboardEntrySchema),
  miPosicion: z.number().int().positive().nullable().optional(),
});
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>;

/** Insignias recién otorgadas en respuestas de acciones (pregunta, publicar, aventón). */
export const nuevasInsigniasOpcionalSchema = z.array(z.enum(BADGE_CODIGOS)).optional();

export const preguntaDelDiaResponseSchema = z.object({
  id: z.string(),
  texto: z.string(),
  yaRespondi: z.boolean(),
  miOpcion: z.number().int().nullable(),
  total: z.number().int(),
  opciones: z.array(
    z.object({
      indice: z.number().int(),
      texto: z.string(),
      votos: z.number().int().nullable(),
    }),
  ),
  nuevasInsignias: nuevasInsigniasOpcionalSchema,
});
export type PreguntaDelDiaResponse = z.infer<typeof preguntaDelDiaResponseSchema>;

export const crearPostResponseSchema = z.object({
  id: z.string(),
  estado: z.string(),
  aviso: z.string().nullable(),
  nuevasInsignias: nuevasInsigniasOpcionalSchema,
});
export type CrearPostResponse = z.infer<typeof crearPostResponseSchema>;

export const crearAventonResponseSchema = z.object({
  id: z.string(),
  nuevasInsignias: nuevasInsigniasOpcionalSchema,
});
export type CrearAventonResponse = z.infer<typeof crearAventonResponseSchema>;
