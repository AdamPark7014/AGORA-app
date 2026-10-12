import type { PrismaService } from '../prisma/prisma.service.js';

type ConBloqueos = Pick<PrismaService, 'block'>;

/**
 * ¿Hay un bloqueo (no un silencio) entre estas dos personas, en cualquier
 * sentido? Un bloqueo corta el contacto en los dos: ni mensajes ni seguir.
 */
export async function hayBloqueo(prisma: ConBloqueos, a: string, b: string): Promise<boolean> {
  const registro = await prisma.block.findFirst({
    where: {
      soloSilencio: false,
      OR: [
        { bloqueadorId: a, bloqueadoId: b },
        { bloqueadorId: b, bloqueadoId: a },
      ],
    },
    select: { id: true },
  });
  return registro !== null;
}

/**
 * A quien no ve `userId` en listas (feed, hashtags, comentarios): a quien
 * bloqueo o silencio, y a quien lo bloqueo. Silenciar es unilateral: el
 * silenciado sigue viendo a quien lo silencio y no se entera.
 */
export async function ocultosPara(prisma: ConBloqueos, userId: string): Promise<Set<string>> {
  const bloqueos = await prisma.block.findMany({
    where: { OR: [{ bloqueadorId: userId }, { bloqueadoId: userId, soloSilencio: false }] },
    select: { bloqueadorId: true, bloqueadoId: true },
  });
  return new Set(
    bloqueos.flatMap((b) => [b.bloqueadorId, b.bloqueadoId]).filter((id) => id !== userId),
  );
}

/**
 * ¿Debe callarse un aviso de `actor` para `destinatario`?
 *
 * Si el destinatario bloqueo **o silencio** al actor, no quiere saber de el:
 * nada de "te menciono" ni "te comento". Y si el actor bloqueo al
 * destinatario, tampoco tiene sentido avisar de nada suyo. El unico caso que
 * no calla es que el actor haya silenciado al destinatario: silenciar es
 * unilateral y el otro no se entera.
 */
export async function callarAvisoDe(
  prisma: ConBloqueos,
  destinatario: string,
  actor: string,
): Promise<boolean> {
  const registro = await prisma.block.findFirst({
    where: {
      OR: [
        { bloqueadorId: destinatario, bloqueadoId: actor },
        { bloqueadorId: actor, bloqueadoId: destinatario, soloSilencio: false },
      ],
    },
    select: { id: true },
  });
  return registro !== null;
}
