import { Body, Controller, Delete, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { PushSubscription } from '@agora/contracts';
import {
  apnsPushTokenSchema,
  expoPushTokenSchema,
  fcmPushTokenSchema,
  pushSubscriptionSchema,
} from '@agora/contracts';

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { ZodPipe } from '../comun/zod.pipe.js';
import { PushService } from './push.service.js';

@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('vapid-public-key')
  clavePublica() {
    return this.push.clavePublica();
  }

  @Post('suscribir')
  @UseGuards(SesionGuard)
  async suscribir(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(pushSubscriptionSchema)) datos: PushSubscription,
  ) {
    return this.push.suscribir(req.usuario!.id, datos);
  }

  @Delete('suscribir')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async desuscribir(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(pushSubscriptionSchema)) datos: PushSubscription,
  ) {
    await this.push.desuscribir(req.usuario!.id, datos.endpoint);
  }

  @Post('suscribir-expo')
  @UseGuards(SesionGuard)
  async suscribirExpo(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(expoPushTokenSchema)) datos: { token: string },
  ) {
    return this.push.suscribirExpo(req.usuario!.id, datos.token);
  }

  @Delete('suscribir-expo')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async desuscribirExpo(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(expoPushTokenSchema)) datos: { token: string },
  ) {
    await this.push.desuscribirExpo(req.usuario!.id, datos.token);
  }

  @Post('suscribir-fcm')
  @UseGuards(SesionGuard)
  async suscribirFcm(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(fcmPushTokenSchema)) datos: { token: string },
  ) {
    return this.push.suscribirFcm(req.usuario!.id, datos.token);
  }

  @Delete('suscribir-fcm')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async desuscribirFcm(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(fcmPushTokenSchema)) datos: { token: string },
  ) {
    await this.push.desuscribirFcm(req.usuario!.id, datos.token);
  }

  /** Registra token APNs de iOS nativo (`POST /push/suscribir-apns`, body `{ "token": "<hex>" }`). */
  @Post('suscribir-apns')
  @UseGuards(SesionGuard)
  async suscribirApns(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(apnsPushTokenSchema)) datos: { token: string },
  ) {
    return this.push.suscribirApns(req.usuario!.id, datos.token);
  }

  @Delete('suscribir-apns')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async desuscribirApns(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(apnsPushTokenSchema)) datos: { token: string },
  ) {
    await this.push.desuscribirApns(req.usuario!.id, datos.token);
  }
}
