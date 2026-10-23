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
 * Es funcion y no constante porque `reactions` y los `votes` de la encuesta se
 * filtran por quien mira: solo interesa **tu** reaccion y **tu** voto, no los
 * nueve mil. Prisma los trae en la misma tanda que el resto del `include` (una
 * consulta por relacion para toda la pagina, no una por publicacion).
 */
export const incluirVistaPost = (userId: string) =>
  ({
    author: {
      select: {
        roles: true,
        profile: { select: { handle: true, nombre: true, apellidos: true, fotoUrl: true } },
        aliasAnonimo: { select: { alias: true } },
      },
    },
    community: { select: { slug: true, nombre: true } },
    media: true,
    poll: {
      include: {
        options: {
          orderBy: { orden: 'asc' },
          include: {
            _count: { select: { votes: true } },
            votes: { where: { userId }, select: { id: true } },
          },
        },
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
  /**
   * Version de 480 px para listas (feed, perfil, hashtag). `null` si la imagen
   * ya era pequena, es animada o es video: entonces se usa `url`.
   */
  thumbUrl: string | null;
  ancho: number | null;
  alto: number | null;
  mime: string;
  esVideo: boolean;
}

/**
 * Un adjunto de la base a lo que ve el cliente. Unica forma para todas las
 * rutas: la miniatura existia desde el principio pero ninguna la mandaba, y el
 * feed descargaba la foto de 2048 px para pintarla a 300.
 */
export function aMediaVista(m: {
  url: string;
  thumbUrl: string | null;
  ancho: number | null;
  alto: number | null;
  mime: string;
}): MediaVista {
  return {
    url: m.url,
    thumbUrl: m.thumbUrl,
    ancho: m.ancho,
    alto: m.alto,
    mime: m.mime,
    esVideo: m.mime.startsWith('video/'),
  };
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
    /**
     * Id de la opcion que voto quien mira, o `null` si no ha votado. Antes solo
     * lo devolvia `POST posts/:id/votos`: al recargar, la app olvidaba el voto.
     */
    miVoto: string | null;
  } | null;
  numComments: number;
  numReactions: number;
  /** Cuántas de cada reacción: el diseño D las muestra como chips con número. */
  reacciones: ConteoReacciones;
  miReaccion: string | null;
  anonimo: boolean;
  /** Solo en publicaciones anonimas; en las firmadas es `null`. */
  alias: string | null;
}

/**
 * Pasa una publicacion de la base a lo que ve el cliente.
 *
 * Aqui se decide que **no** sale: el `authorId` crudo, el `communityId`, las
 * marcas de moderacion. Un `select` que se lleve algo de mas no filtra nada
 * mientras el mapeo pase por esta funcion.
 *
 * Una publicacion anonima sale sin autor y con el alias, por cualquier ruta
 * (detalle, guardados, feed). El alias solo se manda en las anonimas: en una
 * firmada ligaria a la persona real con su alias.
 */
export const TIPOS_REACCION = ['ME_LATE', 'ME_RIO', 'APOYO', 'NO_MAMES'] as const;
export type ConteoReacciones = Record<(typeof TIPOS_REACCION)[number], number>;

export const sinReacciones = (): ConteoReacciones => ({ ME_LATE: 0, ME_RIO: 0, APOYO: 0, NO_MAMES: 0 });

type ConReacciones = {
  reaction: {
    groupBy(args: {
      by: ['postId', 'tipo'];
      where: { postId: { in: string[] } };
      _count: { _all: true };
    }): PromiseLike<Array<{ postId: string; tipo: string; _count: { _all: number } }>>;
  };
};

/**
 * Reacciones por tipo de varias publicaciones en UNA consulta (`groupBy`), no
 * una por publicación: el feed pide 20 a la vez.
 */
export async function conteosReacciones(
  prisma: ConReacciones,
  postIds: string[],
): Promise<Map<string, ConteoReacciones>> {
  const conteos = new Map<string, ConteoReacciones>();
  if (postIds.length === 0) return conteos;
  const filas = await prisma.reaction.groupBy({
    by: ['postId', 'tipo'],
    where: { postId: { in: postIds } },
    _count: { _all: true },
  });
  for (const fila of filas) {
    const actual = conteos.get(fila.postId) ?? sinReacciones();
    if ((TIPOS_REACCION as readonly string[]).includes(fila.tipo)) {
      actual[fila.tipo as keyof ConteoReacciones] = fila._count._all;
    }
    conteos.set(fila.postId, actual);
  }
  return conteos;
}

export function aVistaPost(
  post: PostConRelaciones,
  miGuardado: boolean,
  reacciones: ConteoReacciones = sinReacciones(),
): VistaPost {
  const anonimo = post.anonimo;
  return {
    id: post.id,
    texto: post.texto,
    estado: post.estado,
    createdAt: post.createdAt,
    miGuardado,
    anonimo,
    alias: anonimo ? (post.author.aliasAnonimo?.alias ?? 'Alguien') : null,
    autor: !anonimo && post.author.profile
      ? {
          handle: post.author.profile.handle,
          nombre: `${post.author.profile.nombre} ${post.author.profile.apellidos}`,
          fotoUrl: post.author.profile.fotoUrl,
          verificado: esStaff(post.author.roles),
        }
      : null,
    comunidad: { slug: post.community.slug, nombre: post.community.nombre },
    media: post.media.map(aMediaVista),
    encuesta: post.poll
      ? {
          pregunta: post.poll.pregunta,
          opciones: post.poll.options.map((o) => ({
            id: o.id,
            texto: o.texto,
            votos: o._count.votes,
          })),
          miVoto: post.poll.options.find((o) => o.votes.length > 0)?.id ?? null,
        }
      : null,
    numComments: post.numComments,
    numReactions: post.numReactions,
    reacciones,
    miReaccion: post.reactions[0]?.tipo ?? null,
  };
}
