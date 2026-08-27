import { Prisma } from '@agora/db';
import { esStaff } from '@agora/rbac';

/**
 * Como se ve una publicacion desde fuera.
 *
 * Esto estaba escrito **tres veces**: dos en `posts.service` (feed y detalle)
 * y una en `guardados.service`, las tres con el mismo `include` copiado y un
 * `aVista(post: any)` que aceptaba cualquier cosa. Con `any`, quitar un campo
 * del `include` compilaba igual y el cliente recibia `undefined` sin que nada
 * avisara.
 *
 * Ahora la forma vive en un sitio: el `include` y el tipo salen del mismo
 * sitio, asi que cambiar uno sin el otro es un error de compilacion.
 */

/**
 * Lo que hay que traer de la base para poder pintar una publicacion.
 *
 * Es funcion y no constante porque `reactions` se filtra por quien mira: solo
 * interesa **tu** reaccion, no las nueve mil.
 */
export const incluirVistaPost = (userId: string) =>
  ({
    author: {
      select: {
        roles: true,
        profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
      },
    },
    community: { select: { slug: true, nombre: true } },
    media: true,
    poll: {
      include: {
        options: { orderBy: { orden: 'asc' }, include: { _count: { select: { votes: true } } } },
      },
    },
    reactions: { where: { userId }, select: { tipo: true } },
  }) satisfies Prisma.PostInclude;

/** La publicacion tal y como la devuelve Prisma con el `include` de arriba. */
export type PostConRelaciones = Prisma.PostGetPayload<{
  include: ReturnType<typeof incluirVistaPost>;
}>;

/** Un archivo adjunto, ya resuelto si es video o no. */
export interface MediaVista {
  url: string;
  mime: string;
  esVideo: boolean;
}

/** La publicacion tal y como la recibe el cliente. */
export interface VistaPost {
  id: string;
  texto: string;
  estado: string;
  createdAt: Date;
  miGuardado: boolean;
  autor: {
    handle: string;
    nombre: string;
    fotoUrl: string | null;
    verificado: boolean;
  } | null;
  comunidad: { slug: string; nombre: string };
  media: MediaVista[];
  encuesta: {
    pregunta: string;
    opciones: Array<{ id: string; texto: string; votos: number }>;
  } | null;
  numComments: number;
  numReactions: number;
  miReaccion: string | null;
}

/**
 * Pasa una publicacion de la base a lo que ve el cliente.
 *
 * Aqui se decide que **no** sale: el `authorId` crudo, el `communityId`, las
 * marcas de moderacion. Un `select` que se lleve algo de mas no filtra nada
 * mientras el mapeo pase por esta funcion.
 */
export function aVistaPost(post: PostConRelaciones, miGuardado: boolean): VistaPost {
  return {
    id: post.id,
    texto: post.texto,
    estado: post.estado,
    createdAt: post.createdAt,
    miGuardado,
    autor: post.author.profile
      ? {
          handle: post.author.profile.handle,
          nombre: `${post.author.profile.nombre} ${post.author.profile.apellidos}`,
          fotoUrl: post.author.profile.fotoUrl,
          verificado: esStaff(post.author.roles),
        }
      : null,
    comunidad: { slug: post.community.slug, nombre: post.community.nombre },
    media: post.media.map((m) => ({
      url: m.url,
      mime: m.mime,
      esVideo: m.mime.startsWith('video/'),
    })),
    encuesta: post.poll
      ? {
          pregunta: post.poll.pregunta,
          opciones: post.poll.options.map((o) => ({
            id: o.id,
            texto: o.texto,
            votos: o._count.votes,
          })),
        }
      : null,
    numComments: post.numComments,
    numReactions: post.numReactions,
    miReaccion: post.reactions[0]?.tipo ?? null,
  };
}
