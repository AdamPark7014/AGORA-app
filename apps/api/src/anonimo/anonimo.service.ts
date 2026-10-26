import { randomInt } from 'node:crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DECISIONES, moderarTexto } from '@agora/moderation';

import { PrismaService } from '../prisma/prisma.service.js';
import { moderacionPreviaActiva } from '../comun/moderacion.js';

/**
 * Zona pseudónima — Fase 7 del plan.
 *
 * Las cuatro reglas del plan §1.8, todas aplicadas aquí y no en la interfaz:
 *
 *  1. **Anónimo hacia afuera, identificado hacia adentro.** El `authorId` real
 *     siempre se guarda. El anonimato es frente a otros usuarios, nunca frente
 *     al operador: en México no hay safe harbor y quien aloja comparte
 *     responsabilidad.
 *  2. **Moderación previa obligatoria, no posterior.** Sin `ANTHROPIC_API_KEY` la
 *     zona entera se apaga. Es la única parte del producto donde publicar sin
 *     filtro no es una opción aceptable.
 *  3. **Sin imágenes.** Una foto anónima de una persona es la vía más directa a
 *     la Ley Olimpia, y un clasificador de texto no la ve.
 *  4. **Alias estable**, para que haya hilo y reputación. El anonimato total de
 *     Yik Yak fue justo lo que lo volvió ingobernable.
 */
@Injectable()
export class AnonimoService {
  private readonly logger = new Logger(AnonimoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Palabras del alias. Fauna y colores: neutro, sin género y memorable. */
  private static readonly CRIATURAS = [
    'Quetzal', 'Ajolote', 'Colibrí', 'Jaguar', 'Tucán', 'Coyote', 'Venado',
    'Cacomixtle', 'Tlacuache', 'Zopilote', 'Iguana', 'Correcaminos', 'Puma',
    'Guacamaya', 'Nutria', 'Mapache', 'Búho', 'Ocelote', 'Manatí', 'Vaquita',
  ];

  /** Con moderacion humana (MODERACION_OPCIONAL) la zona puede estar activa sin IA. */
  get habilitada(): boolean {
    return moderacionPreviaActiva() || process.env.MODERACION_OPCIONAL === 'true';
  }

  private exigirHabilitada(): void {
    if (!this.habilitada) {
      throw new ServiceUnavailableException(
        'La zona anónima está apagada: no hay moderación previa configurada.',
      );
    }
  }

  /** Comunidad anónima de la universidad. Se crea sola la primera vez. */
  private async comunidad(universityId: string) {
    const existente = await this.prisma.community.findFirst({
      where: { universityId, tipo: 'ANONIMA' },
    });
    if (existente) return existente;

    return this.prisma.community.create({
      data: {
        universityId,
        tipo: 'ANONIMA',
        slug: 'anonimo',
        nombre: 'Sin nombre',
        descripcion: 'Lo que no te atreves a firmar. Con reglas.',
      },
    });
  }

  /**
   * Alias de una persona. Se crea la primera vez y ya no cambia.
   *
   * El número se sortea hasta encontrar uno libre. Con 20 criaturas y 900
   * números hay 18,000 combinaciones para ~9,000 personas, así que unas pocas
   * vueltas bastan; si aun así no encuentra, se rinde en vez de girar sin fin.
   */
  private async alias(userId: string, universityId: string): Promise<string> {
    const existente = await this.prisma.aliasAnonimo.findUnique({ where: { userId } });
    if (existente) return existente.alias;

    for (let intento = 0; intento < 30; intento += 1) {
      const criatura = AnonimoService.CRIATURAS[randomInt(AnonimoService.CRIATURAS.length)]!;
      const candidato = `${criatura} ${randomInt(100, 1000)}`;
      try {
        const creado = await this.prisma.aliasAnonimo.create({
          data: { userId, universityId, alias: candidato },
        });
        return creado.alias;
      } catch {
        // Alias tomado: se vuelve a sortear.
      }
    }

    throw new BadRequestException('No se pudo asignar un alias. Intenta de nuevo.');
  }

  async miAlias(userId: string) {
    this.exigirHabilitada();
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    return { alias: await this.alias(userId, usuario.universityId) };
  }

  async publicar(userId: string, texto: string) {
    this.exigirHabilitada();

    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true, estado: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');
    if (usuario.estado === 'SUSPENDIDO') {
      throw new ForbiddenException('Tu cuenta está suspendida.');
    }

    let estado: 'PUBLICADO' | 'EN_REVISION' = 'PUBLICADO';
    let aviso: string | null = null;
    let razonIA: string | undefined;

    if (moderacionPreviaActiva()) {
      const veredicto = await moderarTexto(texto, { tipo: 'sin-nombre' });
      if (veredicto.decision === DECISIONES.RETIRAR) {
        throw new BadRequestException(veredicto.motivo ?? 'Eso cruza una línea roja.');
      }
      estado = veredicto.decision === DECISIONES.PUBLICAR_Y_ENCOLAR ? 'EN_REVISION' : 'PUBLICADO';
      aviso = veredicto.motivo ?? null;
      razonIA = veredicto.razonIA;
    }

    const comunidad = await this.comunidad(usuario.universityId);
    const alias = await this.alias(userId, usuario.universityId);

    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        communityId: comunidad.id,
        anonimo: true,
        texto,
        estado,
      },
      select: { id: true, estado: true },
    });

    if (post.estado !== 'PUBLICADO') {
      await this.prisma.moderationAction.create({
        data: {
          postId: post.id,
          accion: 'MARCAR_REVISION',
          automatica: true,
          motivo: razonIA ?? aviso ?? 'Marcado por el clasificador en la zona anónima.',
        },
      });
    }

    return { id: post.id, alias, aviso };
  }

  /**
   * Feed anónimo.
   *
   * El autor real **nunca sale de aquí**: se sustituye por el alias antes de
   * armar la respuesta. Mandarlo al cliente y esconderlo en la interfaz sería
   * anonimato de mentira — cualquiera lo vería en la pestaña de red.
   */
  async feed(userId: string, limite = 30, cursor?: string) {
    this.exigirHabilitada();

    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const comunidad = await this.comunidad(usuario.universityId);

    const posts = await this.prisma.post.findMany({
      where: { communityId: comunidad.id, estado: { in: ['PUBLICADO', 'EN_REVISION'] } },
      include: {
        author: { select: { id: true, aliasAnonimo: { select: { alias: true } } } },
        reactions: { where: { userId }, select: { tipo: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limite + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hayMas = posts.length > limite;
    const pagina = hayMas ? posts.slice(0, limite) : posts;

    return {
      publicaciones: pagina.map((p) => ({
        id: p.id,
        texto: p.texto,
        estado: p.estado,
        createdAt: p.createdAt,
        alias: p.author.aliasAnonimo?.alias ?? 'Alguien',
        // Lo único que se dice del autor es si eres tú, para poder borrarlo.
        esMio: p.author.id === userId,
        numComments: p.numComments,
        numReactions: p.numReactions,
        miReaccion: p.reactions[0]?.tipo ?? null,
      })),
      siguienteCursor: hayMas ? (pagina[pagina.length - 1]?.id ?? null) : null,
    };
  }

  /** Borrar lo propio. El moderador usa la ruta de moderación, con identidad. */
  async borrar(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true, anonimo: true },
    });
    if (!post || !post.anonimo) throw new NotFoundException('Esa publicación no existe.');
    if (post.authorId !== userId) throw new ForbiddenException('No es tuya.');

    await this.prisma.post.update({
      where: { id: postId },
      data: { estado: 'BORRADO_POR_AUTOR' },
    });
  }
}
