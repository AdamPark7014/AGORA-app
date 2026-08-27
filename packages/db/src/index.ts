export { PrismaClient, Prisma } from '@prisma/client';
export type {
  User,
  Profile,
  University,
  Community,
  Membership,
  Post,
  Comment,
  Reaction,
  Report,
  ModerationAction,
  Evento,
  Aventon,
  Anuncio,
  Conversation,
  Message,
  Notificacion,
  PreguntaDelDia,
} from '@prisma/client';

/**
 * Enums del esquema. Se reexportan como tipos y no como valores porque el
 * cliente de Prisma los genera como uniones de cadena, no como objetos en
 * tiempo de ejecucion.
 */
export type {
  TipoNotificacion,
  TipoEvento,
  EstadoContenido,
  EstadoReporte,
  MotivoReporte,
  AccionModeracion,
  CategoriaAnuncio,
  EstadoAnuncio,
  SentidoAventon,
  TipoComunidad,
  EstadoUsuario,
  TipoReaccion,
  RespuestaAsistencia,
} from '@prisma/client';
