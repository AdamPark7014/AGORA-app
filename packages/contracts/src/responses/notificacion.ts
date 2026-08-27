import { z } from 'zod';

const perfilResumenSchema = z.object({
  handle: z.string(),
  nombre: z.string(),
  fotoUrl: z.string().nullable(),
});

const TIPOS_NOTIFICACION = [
  'COMENTARIO',
  'REACCION',
  'MENSAJE',
  'EVENTO_NUEVO',
  'AVENTON_APARTADO',
  'MODERACION',
  'MENCION',
  'SEGUIDOR',
  'INSIGNIA',
  'RETO',
] as const;

/** Item de GET /notificaciones. */
export const notificacionItemSchema = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_NOTIFICACION),
  texto: z.string(),
  url: z.string(),
  leida: z.boolean(),
  createdAt: z.coerce.date(),
  actor: perfilResumenSchema.nullable(),
});

export type NotificacionItem = z.infer<typeof notificacionItemSchema>;
