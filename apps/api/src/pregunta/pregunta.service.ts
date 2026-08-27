import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { GamificacionService } from '../gamificacion/gamificacion.service.js';

/**
 * Pregunta del día.
 *
 * Es la mecánica de hábito del producto: un motivo para abrir la app **hoy**,
 * que cuesta un toque y genera contexto compartido. Todo el mundo contestó lo
 * mismo, así que hay de qué hablar.
 *
 * Las preguntas viven en código y no en un panel: son parte del tono del
 * producto, y escribirlas bien importa más que poder cambiarlas rápido.
 */
const BANCO: ReadonlyArray<{ texto: string; opciones: string[] }> = [
  { texto: '¿Dónde se estudia mejor en el campus?', opciones: ['Biblioteca', 'Cafetería', 'Jardines', 'Mi cuarto'] },
  { texto: '¿A qué hora sales de la U hoy?', opciones: ['Antes de las 2', 'Entre 2 y 5', 'Después de las 5', 'Ni vine'] },
  { texto: '¿Café o energético para sobrevivir la semana?', opciones: ['Café', 'Energético', 'Los dos', 'Ninguno, soy fuerte'] },
  { texto: '¿Cuál es la peor hora para una clase?', opciones: ['7 a.m.', 'Justo a la hora de comer', 'Viernes 6 p.m.', 'Sábado, obvio'] },
  { texto: '¿Cómo llegas normalmente al campus?', opciones: ['Camión UDLAP', 'Coche propio', 'Aventón', 'Transporte público'] },
  { texto: '¿Qué tanto llevas de la tarea que entregas mañana?', opciones: ['Terminada', 'A la mitad', 'La abrí', 'Ni sabía'] },
  { texto: '¿Comida del campus o traes tu lonche?', opciones: ['Comida del campus', 'Traigo lonche', 'Salgo a Cholula', 'No como, sobrevivo'] },
  { texto: '¿Qué prefieres en un equipo de proyecto?', opciones: ['Gente que responde', 'Gente que sabe', 'Amigos', 'Trabajar solo'] },
  { texto: '¿Cuántas materias llevas este semestre?', opciones: ['4 o menos', '5', '6', '7 o más, ayuda'] },
  { texto: '¿Estudias con música?', opciones: ['Siempre', 'Solo instrumental', 'Silencio absoluto', 'Depende de la materia'] },
  { texto: '¿Qué haces el finde en Cholula?', opciones: ['Salir', 'Quedarme a estudiar', 'Me voy a mi casa', 'Depende del dinero'] },
  { texto: '¿Cuál pesa más para elegir clase?', opciones: ['El profesor', 'El horario', 'Que sea fácil', 'Que me interese'] },
  { texto: '¿Llegas puntual a la primera clase?', opciones: ['Siempre', 'Casi siempre', 'Casi nunca', '¿Primera clase?'] },
  { texto: '¿Dónde te has quedado dormido en el campus?', opciones: ['Biblioteca', 'Salón', 'Jardines', 'Nunca, soy digno'] },
];

@Injectable()
export class PreguntaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
  ) {}

  /**
   * El día de hoy como medianoche UTC.
   *
   * La columna es `@db.Date`, y Prisma devuelve esos valores a medianoche UTC.
   * Si aquí se usara medianoche *local*, en México (UTC−6) los dos instantes
   * difieren en 6 horas y la comparación nunca coincide: la pregunta del día
   * se daba por cerrada nada más crearla.
   *
   * Se toma el día del calendario local y se ancla a UTC, para que el corte
   * ocurra a medianoche de aquí y no a las 6 de la tarde del día anterior.
   */
  private hoy(): Date {
    const ahora = new Date();
    return new Date(
      Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0),
    );
  }

  /**
   * Devuelve la pregunta de hoy, creándola si no existe.
   *
   * La elección es determinista a partir de la fecha: no se guarda un puntero
   * ni hace falta un cron. Dos peticiones simultáneas del primer usuario del
   * día podrían intentar crear la misma; por eso el `catch` recupera en vez de
   * fallar — la clave única de (universidad, fecha) hace el resto.
   */
  private async deHoy(universityId: string) {
    const fecha = this.hoy();

    const existente = await this.prisma.preguntaDelDia.findUnique({
      where: { universityId_fecha: { universityId, fecha } },
    });
    if (existente) return existente;

    // Días desde una época fija: avanza de una en una y no se repite hasta
    // agotar el banco.
    const dias = Math.floor(fecha.getTime() / 86_400_000);
    const elegida = BANCO[dias % BANCO.length]!;

    try {
      return await this.prisma.preguntaDelDia.create({
        data: {
          universityId,
          fecha,
          texto: elegida.texto,
          opciones: elegida.opciones,
        },
      });
    } catch {
      // Otra petición ganó la carrera: la suya sirve igual.
      const ganadora = await this.prisma.preguntaDelDia.findUnique({
        where: { universityId_fecha: { universityId, fecha } },
      });
      if (!ganadora) throw new BadRequestException('No se pudo abrir la pregunta de hoy.');
      return ganadora;
    }
  }

  async hoyPara(userId: string) {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { universityId: true },
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado.');

    const pregunta = await this.deHoy(usuario.universityId);

    const [respuestas, mia] = await Promise.all([
      this.prisma.respuestaPregunta.groupBy({
        by: ['opcion'],
        where: { preguntaId: pregunta.id },
        _count: { _all: true },
      }),
      this.prisma.respuestaPregunta.findUnique({
        where: { preguntaId_userId: { preguntaId: pregunta.id, userId } },
        select: { opcion: true },
      }),
    ]);

    const conteo = new Map(respuestas.map((r) => [r.opcion, r._count._all]));
    const total = respuestas.reduce((suma, r) => suma + r._count._all, 0);

    return {
      id: pregunta.id,
      texto: pregunta.texto,
      // Los resultados solo se revelan después de contestar: verlos antes
      // sesga la respuesta y arruina el dato.
      yaRespondi: mia !== null,
      miOpcion: mia?.opcion ?? null,
      total,
      opciones: pregunta.opciones.map((texto, i) => ({
        indice: i,
        texto,
        votos: mia ? (conteo.get(i) ?? 0) : null,
      })),
    };
  }

  /** Responder es un interruptor con cambio: se puede rectificar. */
  async responder(userId: string, preguntaId: string, opcion: number) {
    const pregunta = await this.prisma.preguntaDelDia.findUnique({
      where: { id: preguntaId },
      select: { id: true, opciones: true, fecha: true },
    });
    if (!pregunta) throw new NotFoundException('Esa pregunta no existe.');

    if (opcion < 0 || opcion >= pregunta.opciones.length) {
      throw new BadRequestException('Esa opción no existe.');
    }

    // Solo se contesta la de hoy: dejar contestar las viejas convertiría el
    // histórico en algo que se puede manipular después.
    if (pregunta.fecha.getTime() !== this.hoy().getTime()) {
      throw new BadRequestException('Esa pregunta ya cerró.');
    }

    await this.prisma.respuestaPregunta.upsert({
      where: { preguntaId_userId: { preguntaId, userId } },
      update: { opcion },
      create: { preguntaId, userId, opcion },
    });

    const nuevasInsignias = await this.gamificacion.evaluarBadges(userId);
    const resultado = await this.hoyPara(userId);

    return nuevasInsignias.length > 0 ? { ...resultado, nuevasInsignias } : resultado;
  }
}
