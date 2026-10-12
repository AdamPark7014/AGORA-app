import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MAX_INTENTOS,
  RESULTADO_ENVIO,
  RESULTADO_OTP,
  generarCodigo,
  generarTokenSesion,
  hashCodigo,
  hashTokenSesion,
  puedeEnviar,
  RESULTADO_MAESTRO,
  verificarMaestro,
  vencimientoDesde,
  vencimientoSesion,
  verificarCodigo,
} from '@agora/auth';
import type { EstadoUsuario } from '@agora/db';
import { comunidadesDelPerfil, SLUG_COMUNIDAD_CAMPUS_UDLAP } from '@agora/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { CorreoService } from '../correo/correo.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly correo: CorreoService,
  ) {}

  /** Nombre y foto para el encabezado sin cargar todo el perfil. */
  async resumenPerfil(perfilId: string) {
    return this.prisma.profile.findUnique({
      where: { id: perfilId },
      select: { nombre: true, apellidos: true, fotoUrl: true },
    });
  }

  /** Configuracion de la puerta trasera de desarrollo. Ver @agora/auth. */
  private get configMaestro() {
    return {
      codigo: process.env.DEV_OTP_MAESTRO,
      correos: process.env.DEV_OTP_CORREOS,
      produccion: process.env.NODE_ENV === 'production',
    };
  }

  private get secreto(): string {
    const secreto = process.env.SESSION_SECRET;
    if (!secreto) throw new Error('Falta SESSION_SECRET.');
    return secreto;
  }

  /**
   * Manda un codigo al buzon institucional.
   *
   * Devuelve siempre lo mismo exista o no la cuenta: si respondiera distinto,
   * cualquiera podria usar este endpoint para averiguar quien tiene cuenta en
   * Agora, que es justo el tipo de fuga que un campus pequeno no perdona.
   *
   * Devuelve el id de seguimiento de la entrega (o null). Tampoco filtra nada:
   * todo correo del dominio recibe uno, tenga cuenta o no.
   */
  async solicitarCodigo(email: string, ahora = new Date()): Promise<string | null> {
    const universidad = await this.prisma.university.findFirst({
      where: { emailDomain: email.split('@')[1], activa: true },
    });
    if (!universidad) throw new BadRequestException('Ese dominio no esta habilitado.');

    const usuario = await this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, universityId: universidad.id },
    });

    const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const [ultimo, enviosUltimas24h] = await Promise.all([
      this.prisma.otpCode.findFirst({
        where: { userId: usuario.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.otpCode.count({ where: { userId: usuario.id, createdAt: { gte: hace24h } } }),
    ]);

    const permiso = puedeEnviar(
      { ultimoEnvioAt: ultimo?.createdAt ?? null, enviosUltimas24h },
      ahora,
    );
    if (permiso === RESULTADO_ENVIO.DEMASIADO_PRONTO) {
      throw new HttpException(
        'Espera un minuto antes de pedir otro codigo.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (permiso === RESULTADO_ENVIO.TOPE_DIARIO) {
      throw new HttpException(
        'Demasiados intentos hoy. Intenta manana.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const codigo = generarCodigo();
    await this.prisma.otpCode.create({
      data: {
        userId: usuario.id,
        codeHash: hashCodigo(codigo, email, this.secreto),
        expiresAt: vencimientoDesde(ahora),
      },
    });

    return (await this.correo.enviarCodigo(email, codigo)) ?? null;
  }

  /**
   * Canjea el codigo por una sesion. Devuelve el token en claro una sola vez;
   * en la base solo queda su hash.
   */
  async verificarCodigo(
    email: string,
    codigo: string,
    contexto: { userAgent?: string; ip?: string },
    ahora = new Date(),
  ): Promise<{ token: string; expiraEn: Date; tienePerfil: boolean }> {
    // El codigo maestro se revisa antes que nada: en desarrollo permite entrar
    // sin haber pedido codigo, que es justo lo que lo hace util.
    const maestro = verificarMaestro(codigo, email, this.configMaestro);
    if (maestro === RESULTADO_MAESTRO.VALIDO) {
      this.logger.warn(
        `Entrada con CODIGO MAESTRO de desarrollo para ${email}. Esto no existe en produccion.`,
      );
      return this.abrirSesion(await this.usuarioParaMaestro(email), contexto, ahora);
    }

    const usuario = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: { select: { id: true } } },
    });
    if (!usuario) throw new UnauthorizedException('Codigo invalido o vencido.');

    const guardado = await this.prisma.otpCode.findFirst({
      where: { userId: usuario.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!guardado) throw new UnauthorizedException('Codigo invalido o vencido.');

    const resultado = verificarCodigo(codigo, email, guardado, this.secreto, ahora);
    // Mensaje unico: distinguir "vencido" de "incorrecto" le dice a un
    // atacante si acerto el codigo pero llego tarde.
    const invalido = new UnauthorizedException('Codigo invalido o vencido.');

    // Expirado, usado o sin intentos ya no sirven de nada: no se descuenta
    // nada, que solo castigaria al usuario legitimo.
    if (resultado !== RESULTADO_OTP.VALIDO && resultado !== RESULTADO_OTP.INCORRECTO) {
      throw invalido;
    }

    // El intento se reserva en la base *antes* de dar por bueno nada. Leer
    // `intentos` arriba y escribir despues dejaba una ventana: cien
    // verificaciones en paralelo leian todas "0 de 5" y el tope desaparecia.
    // Con la condicion en el WHERE solo pasan las que de verdad caben.
    const reservado = await this.prisma.otpCode.updateMany({
      where: { id: guardado.id, consumedAt: null, intentos: { lt: MAX_INTENTOS } },
      data: { intentos: { increment: 1 } },
    });
    if (reservado.count !== 1 || resultado === RESULTADO_OTP.INCORRECTO) throw invalido;

    // Mismo motivo: dos canjes simultaneos del mismo codigo, solo uno gana.
    const consumido = await this.prisma.otpCode.updateMany({
      where: { id: guardado.id, consumedAt: null },
      data: { consumedAt: ahora },
    });
    if (consumido.count !== 1) throw invalido;

    return this.abrirSesion(usuario, contexto, ahora);
  }

  /** Busca o crea el usuario del codigo maestro. Solo se llama en desarrollo. */
  private async usuarioParaMaestro(email: string) {
    const universidad = await this.prisma.university.findFirst({
      where: { emailDomain: email.split('@')[1], activa: true },
    });
    if (!universidad) throw new BadRequestException('Ese dominio no esta habilitado.');

    return this.prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, universityId: universidad.id },
      include: { profile: { select: { id: true } } },
    });
  }

  /**
   * Crea la sesion. Compartida por el camino normal y por el maestro: si una
   * sesion de desarrollo se construyera distinto, se estaria probando algo que
   * no es lo que corre en produccion.
   */
  private async abrirSesion(
    usuario: {
      id: string;
      estado: EstadoUsuario;
      emailVerifiedAt: Date | null;
      profile: { id: string } | null;
    },
    contexto: { userAgent?: string; ip?: string },
    ahora: Date,
  ): Promise<{ token: string; expiraEn: Date; tienePerfil: boolean }> {
    const token = generarTokenSesion();
    const expiraEn = vencimientoSesion(ahora);

    // Una suspension la levanta la moderacion, no volver a pedir el codigo:
    // antes entrar de nuevo ponia la cuenta en ACTIVO. La sesion se crea igual
    // (SesionGuard la rechaza en todo salvo darse de baja).
    const estado: EstadoUsuario =
      usuario.estado === 'SUSPENDIDO' ? 'SUSPENDIDO' : usuario.profile ? 'ACTIVO' : 'PENDIENTE';

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: usuario.id },
        data: {
          emailVerifiedAt: usuario.emailVerifiedAt ?? ahora,
          estado,
          lastSeenAt: ahora,
        },
      }),
      this.prisma.session.create({
        data: {
          userId: usuario.id,
          tokenHash: hashTokenSesion(token),
          expiresAt: expiraEn,
          userAgent: contexto.userAgent?.slice(0, 300),
          ip: contexto.ip,
        },
      }),
    ]);

    return { token, expiraEn, tienePerfil: Boolean(usuario.profile) };
  }

  async cerrarSesion(token: string, ahora = new Date()): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: hashTokenSesion(token), revokedAt: null },
      data: { revokedAt: ahora },
    });
  }

  /** Todos los verificados pertenecen a la plaza general del campus. */
  /**
   * Id de la comunidad de campus, recordado tras la primera consulta.
   *
   * Es una fila que se siembra una vez y no cambia en la vida del proceso.
   * Pedirla a la base en cada carga del feed era una consulta por cada
   * desplazamiento de cada persona, para leer siempre lo mismo.
   */
  private idCampus: string | null | undefined;

  /**
   * Mete a alguien en la comunidad de campus si aun no esta.
   *
   * Esto se llama **desde el feed**, que es la ruta mas transitada de la app,
   * y antes hacia dos cosas caras ahi: buscar la comunidad y lanzar un
   * `upsert` — o sea, una **escritura** — en cada carga. Con gente
   * desplazandose, eso es una escritura por pagina de feed para no cambiar
   * nada el 99.99 % de las veces.
   *
   * Ahora la comunidad se recuerda en memoria y la pertenencia se **lee**
   * primero, que va por indice unico y no toca el registro de escritura. Solo
   * se escribe cuando de verdad falta.
   */
  async asegurarMembresiaCampus(userId: string): Promise<void> {
    if (this.idCampus === undefined) {
      const comunidad = await this.prisma.community.findFirst({
        where: { slug: SLUG_COMUNIDAD_CAMPUS_UDLAP },
        select: { id: true },
      });
      this.idCampus = comunidad?.id ?? null;
    }
    const communityId = this.idCampus;
    if (!communityId) return;

    const yaEsta = await this.prisma.membership.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { userId: true },
    });
    if (yaEsta) return;

    // `upsert` y no `create`: dos peticiones simultaneas de la misma persona
    // pueden llegar aqui a la vez y una create perderia con un choque de
    // clave unica.
    await this.prisma.membership.upsert({
      where: { userId_communityId: { userId, communityId } },
      create: { userId, communityId, automatica: true },
      update: {},
    });
  }

  /** Comunidades derivadas del perfil. Se recalcula al crear o editar perfil. */
  async sincronizarComunidades(userId: string): Promise<number> {
    const perfil = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        carrera: { include: { escuela: true } },
        departamento: true,
        colegio: true,
      },
    });
    if (!perfil) return 0;

    const slugs = [
      ...comunidadesDelPerfil({
        escuela: perfil.carrera?.escuela.slug,
        departamento: perfil.departamento?.slug,
        carrera: perfil.carrera?.slug,
        generacion: perfil.generacion ?? undefined,
        colegio: perfil.colegio?.slug,
      }),
      SLUG_COMUNIDAD_CAMPUS_UDLAP,
    ];

    const comunidades = await this.prisma.community.findMany({
      where: { slug: { in: slugs } },
      select: { id: true },
    });

    await this.prisma.membership.createMany({
      data: comunidades.map((c) => ({ userId, communityId: c.id, automatica: true })),
      skipDuplicates: true,
    });

    return comunidades.length;
  }
}
