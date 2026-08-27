import { Body, Controller, ForbiddenException, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { AnalyticsCrash, AnalyticsEvento } from '@agora/contracts';
import { analyticsCrashSchema, analyticsEventoSchema } from '@agora/contracts';
import { esStaff } from '@agora/rbac';

import { SesionGuard, type RequestConSesion } from '../comun/sesion.guard.js';
import { ZodPipe } from '../comun/zod.pipe.js';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('evento')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async evento(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(analyticsEventoSchema)) datos: AnalyticsEvento,
  ): Promise<void> {
    await this.analytics.registrar(req.usuario!.id, datos);
  }

  @Post('crash')
  @HttpCode(204)
  @UseGuards(SesionGuard)
  async crash(
    @Req() req: RequestConSesion,
    @Body(new ZodPipe(analyticsCrashSchema)) datos: AnalyticsCrash,
  ): Promise<void> {
    await this.analytics.registrarCrash(req.usuario!.id, datos);
  }

  @Get('retencion')
  @UseGuards(SesionGuard)
  async retencion(@Req() req: RequestConSesion) {
    if (!esStaff(req.usuario!.roles)) {
      throw new ForbiddenException('No tienes permiso para esto.');
    }
    return this.analytics.retencionD1D7();
  }
}
