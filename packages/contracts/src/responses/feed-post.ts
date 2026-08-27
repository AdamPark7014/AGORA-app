import { z } from 'zod';

const TIPOS_REACCION = ['ME_LATE', 'ME_RIO', 'APOYO', 'NO_MAMES'] as const;

const perfilResumenSchema = z.object({
  handle: z.string(),
  nombre: z.string(),
  fotoUrl: z.string().nullable(),
});

const comunidadResumenSchema = z.object({
  slug: z.string(),
  nombre: z.string(),
});

/** Archivo adjunto en una publicacion del feed. */
export const feedPostMediaSchema = z.object({
  url: z.string(),
  mime: z.string(),
  esVideo: z.boolean(),
});

/** Publicacion tal como la devuelve GET /feed y GET /posts/:id (sin comentarios). */
export const feedPostResponseSchema = z.object({
  id: z.string(),
  texto: z.string(),
  estado: z.string(),
  createdAt: z.coerce.date(),
  miGuardado: z.boolean(),
  autor: perfilResumenSchema
    .extend({ verificado: z.boolean() })
    .nullable(),
  comunidad: comunidadResumenSchema,
  media: z.array(feedPostMediaSchema),
  encuesta: z
    .object({
      pregunta: z.string(),
      opciones: z.array(
        z.object({
          id: z.string(),
          texto: z.string(),
          votos: z.number().int(),
        }),
      ),
    })
    .nullable(),
  numComments: z.number().int(),
  numReactions: z.number().int(),
  miReaccion: z.enum(TIPOS_REACCION).nullable(),
});

export type FeedPostResponse = z.infer<typeof feedPostResponseSchema>;
