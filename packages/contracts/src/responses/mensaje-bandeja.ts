import { z } from 'zod';

const perfilResumenSchema = z.object({
  handle: z.string(),
  nombre: z.string(),
  fotoUrl: z.string().nullable(),
});

/** Conversacion en GET /mensajes (bandeja de entrada). */
export const mensajeBandejaItemSchema = z.object({
  id: z.string(),
  con: perfilResumenSchema.nullable(),
  ultimoTexto: z.string().nullable(),
  ultimoAt: z.coerce.date(),
  mioElUltimo: z.boolean(),
  noLeidos: z.number().int(),
});

export type MensajeBandejaItem = z.infer<typeof mensajeBandejaItemSchema>;
