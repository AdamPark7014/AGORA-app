import type { Prisma } from '@agora/db';

/** Ventana de horas hacia adelante para eventos que empiezan pronto. */
export function whereEventosEnVivo(
  universityId: string,
  ahora: Date,
  horas: number,
): Prisma.EventoWhereInput {
  const limite = new Date(ahora.getTime() + horas * 60 * 60 * 1000);

  return {
    universityId,
    estado: { in: ['PUBLICADO', 'EN_REVISION'] },
    OR: [
      {
        inicioAt: { lte: ahora },
        OR: [{ finAt: { gte: ahora } }, { finAt: null }],
      },
      {
        inicioAt: { gt: ahora, lte: limite },
      },
    ],
  };
}

export interface EventoEnVivoRow {
  id: string;
  titulo: string;
  inicioAt: Date;
  finAt: Date | null;
  lugar: string;
  vanAIr: number;
}

/** ¿El evento está en curso o arranca dentro de la ventana? */
export function esEventoEnVivo(
  evento: { inicioAt: Date; finAt: Date | null },
  ahora: Date,
  horas: number,
): boolean {
  const limite = new Date(ahora.getTime() + horas * 60 * 60 * 1000);
  const enCurso =
    evento.inicioAt.getTime() <= ahora.getTime() &&
    (evento.finAt === null || evento.finAt.getTime() >= ahora.getTime());
  const proximo =
    evento.inicioAt.getTime() > ahora.getTime() &&
    evento.inicioAt.getTime() <= limite.getTime();
  return enCurso || proximo;
}

export function mapearEventoEnVivo(evento: EventoEnVivoRow, ahora: Date) {
  const enCurso =
    evento.inicioAt.getTime() <= ahora.getTime() &&
    (evento.finAt === null || evento.finAt.getTime() >= ahora.getTime());
  const empiezaEnMinutos = enCurso
    ? 0
    : Math.max(0, Math.round((evento.inicioAt.getTime() - ahora.getTime()) / 60_000));

  return {
    id: evento.id,
    titulo: evento.titulo,
    inicioAt: evento.inicioAt,
    lugar: evento.lugar,
    vanAIr: evento.vanAIr,
    empiezaEnMinutos,
    enCurso,
  };
}
