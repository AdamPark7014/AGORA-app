import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaService } from './prisma/prisma.service.js';
import { CorreoService } from './correo/correo.service.js';
import { CorreoController } from './correo/correo.controller.js';
import { EntregaService } from './correo/entrega.service.js';
import { SesionGuard, SesionGuardBaja } from './comun/sesion.guard.js';
import { AuthService } from './auth/auth.service.js';
import { AuthController } from './auth/auth.controller.js';
import { CatalogoController } from './catalogo/catalogo.controller.js';
import { PerfilService } from './perfil/perfil.service.js';
import { PerfilController } from './perfil/perfil.controller.js';
import { DirectorioService } from './directorio/directorio.service.js';
import { DirectorioController } from './directorio/directorio.controller.js';
import { PostsService } from './posts/posts.service.js';
import { PostsController } from './posts/posts.controller.js';
import { SaludController } from './salud/salud.controller.js';
import { EventosService } from './eventos/eventos.service.js';
import { EventosController } from './eventos/eventos.controller.js';
import { RecordatoriosEventoService } from './eventos/recordatorios.service.js';
import { MediaController } from './media/media.controller.js';
import { MensajesService } from './mensajes/mensajes.service.js';
import { MensajesController } from './mensajes/mensajes.controller.js';
import { MensajesStreamService } from './mensajes/mensajes-stream.service.js';
import { AventonesService } from './aventones/aventones.service.js';
import { AventonesController } from './aventones/aventones.controller.js';
import { MarketplaceService } from './marketplace/marketplace.service.js';
import { MarketplaceController } from './marketplace/marketplace.controller.js';
import { ModeracionService } from './moderacion/moderacion.service.js';
import { ModeracionController, ReportesController } from './moderacion/moderacion.controller.js';
import { PreguntaService } from './pregunta/pregunta.service.js';
import { PreguntaController } from './pregunta/pregunta.controller.js';
import { NotificacionesService } from './notificaciones/notificaciones.service.js';
import { NotificacionesStreamService } from './notificaciones/notificaciones-stream.service.js';
import { NotificacionesController } from './notificaciones/notificaciones.controller.js';
import { AnonimoService } from './anonimo/anonimo.service.js';
import { AnonimoController } from './anonimo/anonimo.controller.js';
import { BloqueosService } from './bloqueos/bloqueos.service.js';
import { BloqueosController } from './bloqueos/bloqueos.controller.js';
import { BusquedaService } from './busqueda/busqueda.service.js';
import { BusquedaController } from './busqueda/busqueda.controller.js';
import { GuardadosService } from './guardados/guardados.service.js';
import { GuardadosController } from './guardados/guardados.controller.js';
import { PushService } from './push/push.service.js';
import { PushController } from './push/push.controller.js';
import { HashtagsService } from './hashtags/hashtags.service.js';
import { HashtagsController } from './hashtags/hashtags.controller.js';
import { LimiteGuard } from './comun/limite.guard.js';
import { opcionesLimite } from './comun/almacen-limite.js';
import { MantenimientoService } from './mantenimiento/mantenimiento.service.js';
import { AnalyticsController } from './analytics/analytics.controller.js';
import { AnalyticsService, PrismaAnalyticsSink } from './analytics/analytics.service.js';
import { GamificacionController } from './gamificacion/gamificacion.controller.js';
import { GamificacionService } from './gamificacion/gamificacion.service.js';
import { RetosController } from './retos/retos.controller.js';
import { RetosService } from './retos/retos.service.js';
import { PublicController } from './public/public.controller.js';
import { PublicService } from './public/public.service.js';
import { CuentaController } from './cuenta/cuenta.controller.js';
import { CuentaService } from './cuenta/cuenta.service.js';

@Module({
  imports: [
    // Tareas periodicas. Hoy solo la limpieza de datos caducados.
    ScheduleModule.forRoot(),
    /**
     * Limite de peticiones, contado **por persona** (ver LimiteGuard).
     *
     * Los numeros salen de lo que hace un usuario real, no de un numero
     * redondo: abrir el feed son ~5 peticiones, el sondeo de avisos 1/min, y
     * un chat abierto 12/min. Con un chat abierto y navegando, el suelo ronda
     * las 25/min y un rato intenso puede rozar las 80.
     *
     * 240/min deja ese uso holgado y sigue cortando a un script. El tope
     * horario esta al mismo ritmo para no castigar una sesion larga de las de
     * epoca de finales.
     *
     * Storage: Redis si REDIS_URL responde al arrancar; si no, memoria + log
     * (la API no se tumba). Contadores compartidos entre replicas solo con Redis.
     *
     * Antes esto era 60/min **por IP** y estaba roto de raiz para una red de
     * campus: miles de alumnos salen por el NAT de la UDLAP, asi que el
     * campus entero compartia el cupo de una persona.
     */
    ThrottlerModule.forRootAsync({
      useFactory: () => opcionesLimite(),
    }),
  ],
  controllers: [
    AuthController,
    CorreoController,
    CatalogoController,
    PerfilController,
    DirectorioController,
    PostsController,
    SaludController,
    EventosController,
    MediaController,
    MensajesController,
    AventonesController,
    MarketplaceController,
    ReportesController,
    ModeracionController,
    PreguntaController,
    NotificacionesController,
    AnonimoController,
    BloqueosController,
    BusquedaController,
    GuardadosController,
    PushController,
    HashtagsController,
    AnalyticsController,
    GamificacionController,
    RetosController,
    PublicController,
    CuentaController,
  ],
  providers: [
    PrismaService,
    CorreoService,
    EntregaService,
    SesionGuard,
    SesionGuardBaja,
    AuthService,
    PerfilService,
    DirectorioService,
    PostsService,
    EventosService,
    RecordatoriosEventoService,
    MensajesService,
    MensajesStreamService,
    AventonesService,
    MarketplaceService,
    ModeracionService,
    PreguntaService,
    NotificacionesService,
    NotificacionesStreamService,
    AnonimoService,
    BloqueosService,
    BusquedaService,
    GuardadosService,
    PushService,
    HashtagsService,
    MantenimientoService,
    PrismaAnalyticsSink,
    AnalyticsService,
    GamificacionService,
    RetosService,
    CuentaService,
    PublicService,
    { provide: APP_GUARD, useClass: LimiteGuard },
  ],
})
export class AppModule {}
