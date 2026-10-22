import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MAX_INTENTOS,
  MENSAJE_CONTRASENA,
  RESULTADO_CONTRASENA,
  RESULTADO_ENVIO,
  RESULTADO_OTP,
  bloqueoTrasFallo,
  generarCodigo,
  generarTokenSesion,
  hashCodigo,
  hashTokenSesion,
  loginBloqueado,
  minutosDeBloqueo,
  puedeEnviar,
  puedeFijarSinActual,
  RESULTADO_BUZON,
  RESULTADO_MAESTRO,
  validarContrasena,
  verificarMaestro,
  vencimientoDesde,
  vencimientoSesion,
  verificarCodigo,
  type CodigoGuardado,
  type SesionParaContrasena,
} from '@agora/auth';
import type { EstadoUsuario } from '@agora/db';
import { comunidadesDelPerfil, SLUG_COMUNIDAD_CAMPUS_UDLAP } from '@agora/shared';

import { PrismaService } from '../prisma/prisma.service.js';
import { CorreoService } from '../correo/correo.service.js';
import { hashContrasena, hashSenuelo, verificarContrasena } from './contrasena.js';
import { existeBuzonUdlap, type VerificadorBuzon } from './buzon-udlap.js';

/**
 * Un solo mensaje para correo desconocido, cuenta sin contraseña y contraseña
 * mal: distinguirlos diria quien tiene cuenta en Agora, y en un campus
 * pequeño eso es justo lo que no se puede filtrar. Quien aun no tiene
 * contraseña sigue el camino del codigo, que la pantalla ofrece al lado.
 */
export const MENSAJE_ENTRADA_INVALIDA =
  'Correo o contraseña incorrectos. Si es tu primera vez o aún no tienes contraseña, entra con un código a tu correo.';

export const MENSAJE_CODIGO_INVALIDO = 'Codigo invalido o vencido.';

export interface SesionAbierta {
  readonly token: string;
  readonly expiraEn: Date;
  readonly tienePerfil: boolean;
  readonly tieneContrasena: boolean;
  /** Registrada con correo personal: le falta confirmar su buzón UDLAP. */
  readonly udlapPendiente: boolean;
}

interface OpcionesSesion {
  /** Se abrio canjeando un codigo (true) o con contraseña (false). */
  readonly viaCodigo: boolean;
  /** "Recordarme": medio año renovable. false = un dia, sin renovar. */
  readonly persistente: boolean;
  /**
   * El código llegó al buzón UDLAP: eso, y solo eso, confirma el correo
   * institucional (`emailVerifiedAt`). Ni la contraseña ni el código al
   * correo personal lo hacen.
   */
  readonly confirmaUdlap: boolean;
}

const SESION_POR_CODIGO: OpcionesSesion = { viaCodigo: true, persistente: true, confirmaUdlap: true };
const SESION_POR_CODIGO_PERSONAL: OpcionesSesion = {
  viaCodigo: true,
  persistente: true,
  confirmaUdlap: false,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  /** Pregunta a Microsoft si el buzón UDLAP existe. Se reemplaza en las pruebas. */
  verificarBuzon: VerificadorBuzon = existeBuzonUdlap;

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

    await this.revisarCupo(usuario.id, ahora);

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
   * Uno por minuto y diez al día por cuenta, cuente el buzón al que se mande:
   * pedir al correo personal no abre un segundo cupo.
   */
  private async revisarCupo(userId: string, ahora: Date): Promise<void> {
    const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const [ultimo, enviosUltimas24h] = await Promise.all([
      this.prisma.otpCode.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
      this.prisma.otpCode.count({ where: { userId, createdAt: { gte: hace24h } } }),
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
  ): Promise<SesionAbierta> {
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
    if (!usuario) throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);

    // Solo un código mandado al buzón UDLAP prueba el buzón UDLAP: el del
    // correo personal tiene su propio canje.
    const guardado = await this.prisma.otpCode.findFirst({
      where: { userId: usuario.id, destino: 'udlap' },
      orderBy: { createdAt: 'desc' },
    });
    if (!guardado) throw new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);

    await this.canjear(guardado, codigo, email, ahora);

    if (usuario.udlapPendienteDesde) {
      return this.abrirSesion(await this.concluirUdlap(usuario, ahora), contexto, ahora);
    }
    return this.abrirSesion(usuario, contexto, ahora);
  }

  /**
   * Da por bueno un código o lanza el 401 de siempre. Compartido por el código
   * UDLAP y el personal: la defensa contra la fuerza bruta es la misma.
   */
  private async canjear(
    guardado: CodigoGuardado & { id: string },
    codigo: string,
    correoDelCodigo: string,
    ahora: Date,
  ): Promise<void> {
    const resultado = verificarCodigo(codigo, correoDelCodigo, guardado, this.secreto, ahora);
    // Mensaje unico: distinguir "vencido" de "incorrecto" le dice a un
    // atacante si acerto el codigo pero llego tarde.
    const invalido = new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);

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
  }

  /**
   * Quien recibe el código en el buzón UDLAP es el dueño de la cuenta, punto.
   * Si la cuenta se abrió con un correo personal, al confirmar se borran ese
   * correo y la contraseña y se cierran todas las sesiones: si fue otra persona
   * la que se registró con este correo, se queda fuera. El dueño elige su
   * contraseña de nuevo (la pantalla lo pide porque `tieneContrasena` sale false).
   */
  private async concluirUdlap<T extends { id: string }>(usuario: T, ahora: Date) {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: usuario.id },
        data: {
          udlapPendienteDesde: null,
          correoPersonal: null,
          passwordHash: null,
          passwordSetAt: null,
        },
      }),
      this.prisma.session.updateMany({
        where: { userId: usuario.id, revokedAt: null },
        data: { revokedAt: ahora },
      }),
    ]);
    this.logger.log(`Correo UDLAP confirmado para ${usuario.id}; se borró el registro con correo personal`);
    return { ...usuario, udlapPendienteDesde: null, correoPersonal: null, passwordHash: null };
  }

  // -------------------------------------------------------------------------
  // Correo personal: cuando el código a la UDLAP no llega.
  // -------------------------------------------------------------------------

  /**
   * Manda un código al correo personal para registrarse con un correo UDLAP
   * cuyo código no llegó. Antes, Microsoft tiene que confirmar que el buzón
   * UDLAP existe: así nadie se inventa una cuenta, y la UDLAP queda pendiente
   * de confirmar (plazo en @agora/auth).
   *
   * Solo para cuentas que nunca confirmaron su UDLAP: una cuenta confirmada
   * entra con contraseña o con el código institucional, no con un correo
   * cualquiera.
   */
  async solicitarCodigoPersonal(
    email: string,
    correoPersonal: string,
    ahora = new Date(),
  ): Promise<string | null> {
    const universidad = await this.prisma.university.findFirst({
      where: { emailDomain: email.split('@')[1], activa: true },
    });
    if (!universidad) throw new BadRequestException('Ese dominio no esta habilitado.');

    const existente = await this.prisma.user.findUnique({ where: { email } });
    if (existente?.emailVerifiedAt) {
      throw new ConflictException(
        'Esa cuenta ya confirmó su correo UDLAP: entra con tu contraseña o pide el código a tu correo UDLAP.',
      );
    }
    if (existente?.correoPersonal && existente.correoPersonal !== correoPersonal) {
      throw new ConflictException(
        'Esta cuenta se registró con otro correo personal. Usa ese, o el código a tu correo UDLAP.',
      );
    }
    const ligado = await this.prisma.user.findUnique({ where: { correoPersonal } });
    if (ligado && ligado.id !== existente?.id) {
      throw new ConflictException('Ese correo personal ya está ligado a otra cuenta de Ágora.');
    }

    const buzon = await this.verificarBuzon(email);
    if (buzon === RESULTADO_BUZON.NO_EXISTE) {
      throw new BadRequestException('Ese correo no existe en la UDLAP. Revisa que esté bien escrito.');
    }
    if (buzon !== RESULTADO_BUZON.EXISTE) {
      throw new ServiceUnavailableException(
        'No pudimos confirmar tu correo UDLAP en este momento. Intenta en unos minutos o pide el código a tu correo UDLAP.',
      );
    }

    const usuario =
      existente ??
      (await this.prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, universityId: universidad.id },
      }));

    await this.revisarCupo(usuario.id, ahora);

    const codigo = generarCodigo();
    await this.prisma.otpCode.create({
      data: {
        userId: usuario.id,
        destino: 'personal',
        // Atado al correo personal: un código mandado a otro correo no sirve aquí.
        codeHash: hashCodigo(codigo, correoPersonal, this.secreto),
        expiresAt: vencimientoDesde(ahora),
      },
    });
    this.logger.log(`Código al correo personal para ${usuario.id} (buzón UDLAP confirmado por Microsoft)`);

    return (await this.correo.enviarCodigo(correoPersonal, codigo)) ?? null;
  }

  /** Canjea el código del correo personal. La cuenta queda pendiente de UDLAP. */
  async verificarCodigoPersonal(
    email: string,
    correoPersonal: string,
    codigo: string,
    contexto: { userAgent?: string; ip?: string },
    ahora = new Date(),
  ): Promise<SesionAbierta> {
    const invalido = new UnauthorizedException(MENSAJE_CODIGO_INVALIDO);
    const usuario = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: { select: { id: true } } },
    });
    if (!usuario || usuario.emailVerifiedAt) throw invalido;
    if (usuario.correoPersonal && usuario.correoPersonal !== correoPersonal) throw invalido;

    const guardado = await this.prisma.otpCode.findFirst({
      where: { userId: usuario.id, destino: 'personal' },
      orderBy: { createdAt: 'desc' },
    });
    if (!guardado) throw invalido;

    await this.canjear(guardado, codigo, correoPersonal, ahora);

    const udlapPendienteDesde = usuario.udlapPendienteDesde ?? ahora;
    await this.prisma.user.update({
      where: { id: usuario.id },
      data: { correoPersonal, udlapPendienteDesde },
    });

    return this.abrirSesion(
      { ...usuario, udlapPendienteDesde },
      contexto,
      ahora,
      SESION_POR_CODIGO_PERSONAL,
    );
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
      passwordHash?: string | null;
      udlapPendienteDesde?: Date | null;
      profile: { id: string } | null;
    },
    contexto: { userAgent?: string; ip?: string },
    ahora: Date,
    opciones: OpcionesSesion = SESION_POR_CODIGO,
  ): Promise<SesionAbierta> {
    const token = generarTokenSesion();
    const expiraEn = vencimientoSesion(ahora, opciones.persistente);

    // Una suspension la levanta la moderacion, no volver a pedir el codigo:
    // antes entrar de nuevo ponia la cuenta en ACTIVO. La sesion se crea igual
    // (SesionGuard la rechaza en todo salvo darse de baja).
    const estado: EstadoUsuario =
      usuario.estado === 'SUSPENDIDO' ? 'SUSPENDIDO' : usuario.profile ? 'ACTIVO' : 'PENDIENTE';

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: usuario.id },
        data: {
          emailVerifiedAt: opciones.confirmaUdlap
            ? (usuario.emailVerifiedAt ?? ahora)
            : usuario.emailVerifiedAt,
          estado,
          lastSeenAt: ahora,
          // Entrar (por el camino que sea) limpia el bloqueo por intentos: si
          // alguien lo provoco a proposito, el dueño recupera la cuenta con
          // un codigo a su buzon.
          loginFallidos: 0,
          loginBloqueadoHasta: null,
        },
      }),
      this.prisma.session.create({
        data: {
          userId: usuario.id,
          tokenHash: hashTokenSesion(token),
          expiresAt: expiraEn,
          userAgent: contexto.userAgent?.slice(0, 300),
          ip: contexto.ip,
          viaCodigo: opciones.viaCodigo,
          persistente: opciones.persistente,
        },
      }),
    ]);

    return {
      token,
      expiraEn,
      tienePerfil: Boolean(usuario.profile),
      tieneContrasena: Boolean(usuario.passwordHash),
      udlapPendiente: Boolean(usuario.udlapPendienteDesde),
    };
  }

  // -------------------------------------------------------------------------
  // Contraseña: el correo verifica una vez; despues se entra con esto.
  // -------------------------------------------------------------------------

  /**
   * Entra con correo + contraseña.
   *
   * Cuesta lo mismo exista o no la cuenta (se verifica contra un hash señuelo)
   * y responde con el mismo mensaje en los tres casos. Cinco fallos seguidos
   * bloquean la contraseña quince minutos; el codigo al correo sigue abierto,
   * asi que el dueño nunca se queda fuera.
   */
  async entrar(
    email: string,
    contrasena: string,
    contexto: { userAgent?: string; ip?: string },
    opciones: { recordarme: boolean } = { recordarme: true },
    ahora = new Date(),
  ): Promise<SesionAbierta> {
    const usuario = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: { select: { id: true } } },
    });

    if (!usuario?.passwordHash || usuario.estado === 'BAJA') {
      await verificarContrasena(await hashSenuelo(), contrasena);
      throw new UnauthorizedException(MENSAJE_ENTRADA_INVALIDA);
    }

    if (loginBloqueado(usuario, ahora)) throw this.bloqueado(usuario, ahora);

    if (!(await verificarContrasena(usuario.passwordHash, contrasena))) {
      await this.anotarFallo(usuario.id, ahora);
      throw new UnauthorizedException(MENSAJE_ENTRADA_INVALIDA);
    }

    return this.abrirSesion(usuario, contexto, ahora, {
      viaCodigo: false,
      persistente: opciones.recordarme,
      confirmaUdlap: false,
    });
  }

  /**
   * Fija una contraseña sin dar la actual: primera vez, migracion de una
   * cuenta de antes, u "olvide mi contraseña" (sesion recien abierta por
   * codigo). Reemplazar una existente cierra las demas sesiones: si la
   * cambias porque alguien mas la tenia, ese alguien se queda fuera.
   */
  async fijarContrasena(
    userId: string,
    sesion: SesionParaContrasena & { id: string },
    contrasena: string,
    ahora = new Date(),
  ): Promise<void> {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
    if (!usuario) throw new NotFoundException('Esa cuenta no existe.');

    const tieneContrasena = usuario.passwordHash !== null;
    if (!puedeFijarSinActual({ tieneContrasena }, sesion, ahora)) {
      throw new ForbiddenException(
        'Para cambiarla escribe tu contraseña actual en Ajustes, o entra con un código a tu correo y vuelve aquí.',
      );
    }

    this.validar(contrasena, usuario.email);
    await this.guardarContrasena(userId, sesion.id, contrasena, ahora, { cerrarOtras: tieneContrasena });
  }

  /** Cambiarla sabiendo la actual. Los fallos cuentan igual que al entrar. */
  async cambiarContrasena(
    userId: string,
    sesionId: string,
    actual: string,
    nueva: string,
    ahora = new Date(),
  ): Promise<void> {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true, loginFallidos: true, loginBloqueadoHasta: true },
    });
    if (!usuario) throw new NotFoundException('Esa cuenta no existe.');
    if (!usuario.passwordHash) {
      throw new BadRequestException('Tu cuenta aún no tiene contraseña: créala primero.');
    }
    if (loginBloqueado(usuario, ahora)) throw this.bloqueado(usuario, ahora);

    if (!(await verificarContrasena(usuario.passwordHash, actual))) {
      await this.anotarFallo(userId, ahora);
      throw new UnauthorizedException('La contraseña actual no es correcta.');
    }

    this.validar(nueva, usuario.email);
    await this.guardarContrasena(userId, sesionId, nueva, ahora, { cerrarOtras: true });
  }

  /** Con la misma forma que ZodPipe, para que la pantalla lo pinte junto al campo. */
  private validar(contrasena: string, email: string): void {
    const resultado = validarContrasena(contrasena, email);
    if (resultado === RESULTADO_CONTRASENA.VALIDA) return;
    const mensaje = MENSAJE_CONTRASENA[resultado];
    throw new BadRequestException({ mensaje, errores: [{ campo: 'contrasena', mensaje }] });
  }

  private async guardarContrasena(
    userId: string,
    sesionId: string,
    contrasena: string,
    ahora: Date,
    opciones: { cerrarOtras: boolean },
  ): Promise<void> {
    const passwordHash = await hashContrasena(contrasena);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash, passwordSetAt: ahora, loginFallidos: 0, loginBloqueadoHasta: null },
      }),
      ...(opciones.cerrarOtras
        ? [
            this.prisma.session.updateMany({
              where: { userId, id: { not: sesionId }, revokedAt: null },
              data: { revokedAt: ahora },
            }),
          ]
        : []),
    ]);
    // Nunca la contraseña ni el hash: solo que paso.
    this.logger.log(`Contraseña ${opciones.cerrarOtras ? 'cambiada' : 'creada'} para ${userId}`);
  }

  /**
   * Un fallo mas. El contador se incrementa en la base, no en memoria, para que
   * cien intentos en paralelo cuenten cien y no uno.
   */
  private async anotarFallo(userId: string, ahora: Date): Promise<void> {
    const { loginFallidos } = await this.prisma.user.update({
      where: { id: userId },
      data: { loginFallidos: { increment: 1 } },
      select: { loginFallidos: true },
    });
    const hasta = bloqueoTrasFallo(loginFallidos, ahora);
    if (hasta) {
      await this.prisma.user.update({ where: { id: userId }, data: { loginBloqueadoHasta: hasta } });
      this.logger.warn(`Contraseña bloqueada 15 min para ${userId} por intentos fallidos`);
    }
  }

  private bloqueado(
    usuario: { loginFallidos: number; loginBloqueadoHasta: Date | null },
    ahora: Date,
  ): HttpException {
    const minutos = minutosDeBloqueo(usuario, ahora);
    return new HttpException(
      `Demasiados intentos. Espera ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} o entra con un código a tu correo.`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
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
