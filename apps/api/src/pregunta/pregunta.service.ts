import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service.js';
import { GamificacionService } from '../gamificacion/gamificacion.service.js';
import { PushService } from '../push/push.service.js';
import { enSegundoPlano } from '../comun/segundo-plano.js';
import {
  AVISO_VIGENTE_MS,
  VENTANA_MS,
  diaCampus,
  esATiempo,
  horaSorpresa,
} from './relampago.js';

/**
 * Pregunta del día.
 *
 * Es la mecánica de hábito del producto: un motivo para abrir la app **hoy**,
 * que cuesta un toque y genera contexto compartido. Todo el mundo contestó lo
 * mismo, así que hay de qué hablar.
 *
 * Las preguntas viven en código y no en un panel: son parte del tono del
 * producto, y escribirlas bien importa más que poder cambiarlas rápido.
 *
 * Desde octubre de 2026 cae a una hora sorpresa (como BeReal): a esa hora
 * llega un push a todo el campus y quien contesta en los dos minutos
 * siguientes sale "a tiempo". Se puede contestar tarde, pero no cuenta igual.
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

/** Cuantos push se mandan a la vez al caer la pregunta. */
const PUSH_EN_PARALELO = 20;

@Injectable()
export class PreguntaService {
  private readonly log = new Logger('Pregunta');

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
    private readonly push: PushService,
  ) {}

  private get secreto(): string {
    return process.env.SESSION_SECRET ?? 'agora-desarrollo';
  }

  /** El dia del campus, como lo guarda la columna `@db.Date`. */
  private hoy(): Date {
    return diaCampus();
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
          abreAt: horaSorpresa(fecha, this.secreto),
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
    const ahora = new Date();

    const [respuestas, mia] = await Promise.all([
      this.prisma.respuestaPregunta.groupBy({
        by: ['opcion'],
        where: { preguntaId: pregunta.id },
        _count: { _all: true },
      }),
      this.prisma.respuestaPregunta.findUnique({
        where: { preguntaId_userId: { preguntaId: pregunta.id, userId } },
        select: { opcion: true, aTiempo: true },
      }),
    ]);

    const conteo = new Map(respuestas.map((r) => [r.opcion, r._count._all]));
    const total = respuestas.reduce((suma, r) => suma + r._count._all, 0);

    // Lo de la carrera y los "a tiempo" tambien se revela solo al contestar.
    const [miCarrera, totalATiempo] = mia
      ? await Promise.all([
          this.resultadosDeMiCarrera(pregunta.id, userId),
          this.prisma.respuestaPregunta.count({
            where: { preguntaId: pregunta.id, aTiempo: true },
          }),
        ])
      : [null, null];

    const abreAt = pregunta.abreAt;
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
      // Campos de la hora sorpresa. Las apps nativas que no los conocen los
      // ignoran y siguen mostrando la pregunta todo el dia, como antes.
      abreAt: abreAt?.toISOString() ?? null,
      aTiempoHasta: abreAt ? new Date(abreAt.getTime() + VENTANA_MS).toISOString() : null,
      abierta: !abreAt || abreAt <= ahora,
      aTiempo: mia ? mia.aTiempo : null,
      totalATiempo,
      miCarrera,
    };
  }

  /** Votos por opcion de la gente de mi carrera, para "tu carrera vs el campus". */
  private async resultadosDeMiCarrera(preguntaId: string, userId: string) {
    const perfil = await this.prisma.profile.findUnique({
      where: { userId },
      select: { carreraId: true, carrera: { select: { nombre: true } } },
    });
    if (!perfil?.carreraId || !perfil.carrera) return null;

    const filas = await this.prisma.respuestaPregunta.groupBy({
      by: ['opcion'],
      where: { preguntaId, user: { profile: { carreraId: perfil.carreraId } } },
      _count: { _all: true },
    });
    return {
      nombre: perfil.carrera.nombre,
      total: filas.reduce((suma, f) => suma + f._count._all, 0),
      votos: Object.fromEntries(filas.map((f) => [f.opcion, f._count._all])) as Record<number, number>,
    };
  }

  /** Responder es un interruptor con cambio: se puede rectificar. */
  async responder(userId: string, preguntaId: string, opcion: number) {
    const pregunta = await this.prisma.preguntaDelDia.findUnique({
      where: { id: preguntaId },
      select: { id: true, opciones: true, fecha: true, abreAt: true },
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
      create: { preguntaId, userId, opcion, aTiempo: esATiempo(pregunta.abreAt, new Date()) },
    });

    const nuevasInsignias = await this.gamificacion.evaluarBadges(userId);
    const resultado = await this.hoyPara(userId);

    return nuevasInsignias.length > 0 ? { ...resultado, nuevasInsignias } : resultado;
  }

  /**
   * Cada minuto: si ya cayo la pregunta de hoy y no se ha avisado, avisa.
   * Crear la pregunta aqui tambien hace que exista aunque nadie abra la app.
   */
  @Cron('* * * * *', { name: 'pregunta-relampago' })
  async avisarSiCayo(ahora: Date = new Date()): Promise<number> {
    const universidades = await this.prisma.university.findMany({ select: { id: true } });
    let avisadas = 0;
    for (const { id } of universidades) {
      const pregunta = await this.deHoy(id);
      const abreAt = pregunta.abreAt;
      if (!abreAt || pregunta.avisadaAt || abreAt > ahora) continue;
      if (ahora.getTime() - abreAt.getTime() > AVISO_VIGENTE_MS) continue;

      // Solo una instancia gana el aviso.
      const tomado = await this.prisma.preguntaDelDia.updateMany({
        where: { id: pregunta.id, avisadaAt: null },
        data: { avisadaAt: ahora },
      });
      if (tomado.count !== 1) continue;

      avisadas += 1;
      enSegundoPlano(this.avisarATodos(id, pregunta.texto), this.log, 'push de la pregunta del dia');
    }
    return avisadas;
  }

  private async avisarATodos(universityId: string, texto: string): Promise<void> {
    const destinatarios = await this.prisma.user.findMany({
      where: {
        universityId,
        estado: 'ACTIVO',
        profile: { avisoPregunta: true },
        pushSubscriptions: { some: {} },
      },
      select: { id: true },
    });

    const aviso = {
      titulo: '⚡ Cayó la pregunta del día',
      cuerpo: `${texto} Tienes 2 minutos para contestar a tiempo.`,
      url: '/feed',
      tipo: 'PREGUNTA',
    };
    for (let i = 0; i < destinatarios.length; i += PUSH_EN_PARALELO) {
      await Promise.allSettled(
        destinatarios.slice(i, i + PUSH_EN_PARALELO).map((d) => this.push.enviar(d.id, aviso)),
      );
    }
    this.log.log(`Pregunta del dia avisada a ${destinatarios.length} personas.`);
  }
}
