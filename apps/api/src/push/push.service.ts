import { Injectable, Logger } from '@nestjs/common';
import type { PushSubscription } from '@agora/contracts';
import * as admin from 'firebase-admin';
import webpush from 'web-push';

import { PrismaService } from '../prisma/prisma.service.js';
import { enviarApns, esTokenApnsInvalido, parseApnsConfig } from './apns.client.js';

const EXPO_PREFIX = 'expo:';
const FCM_PREFIX = 'fcm:';
const APNS_PREFIX = 'apns:';

/**
 * Push web (VAPID), Expo, FCM (Android) y APNs (iOS nativo).
 *
 * Payload de envío (todos los canales):
 * ```json
 * { "titulo": "Ágora", "cuerpo": "Te comentaron…", "url": "agora://post/abc" }
 * ```
 * - Web Push: JSON stringificado en el body.
 * - FCM: `notification` + `data` (incluye `url` para deep link en Android).
 * - APNs: `aps.alert` + campos raíz `titulo`, `cuerpo`, `url`.
 * - Expo: `data.url`.
 *
 * FCM requiere credenciales Firebase en el servidor:
 * - `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON del service account (recomendado en deploy).
 * - `GOOGLE_APPLICATION_CREDENTIALS`: ruta a un archivo JSON del service account.
 *
 * APNs requiere clave `.p8` de Apple Developer:
 * - `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_SIGNING_KEY` (contenido PEM del .p8).
 * - `APNS_BUNDLE_ID` (default `mx.agora.mobile.AgoraApp`).
 * - `APNS_PRODUCTION=true` en producción (sandbox por defecto).
 *
 * Sin credenciales, los tokens se almacenan pero el envío se omite (warn en log).
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly webActivo: boolean;
  private firebaseInited = false;
  private firebaseTried = false;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:contacto@udlagora.com';

    this.webActivo = Boolean(publicKey && privateKey);
    if (this.webActivo) {
      webpush.setVapidDetails(subject, publicKey!, privateKey!);
    }
  }

  clavePublica(): { publicKey: string | null; activo: boolean } {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
      activo: this.webActivo,
    };
  }

  /** Suscripción Web Push (navegador). Almacena aunque VAPID no esté activo; el envío requiere VAPID. */
  async suscribir(userId: string, datos: PushSubscription) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: datos.endpoint },
      create: {
        userId,
        endpoint: datos.endpoint,
        p256dh: datos.keys.p256dh,
        auth: datos.keys.auth,
      },
      update: {
        userId,
        p256dh: datos.keys.p256dh,
        auth: datos.keys.auth,
      },
    });

    return { ok: true };
  }

  async suscribirExpo(userId: string, token: string) {
    const endpoint = `${EXPO_PREFIX}${token}`;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: '-', auth: '-' },
      update: { userId },
    });
    return { ok: true };
  }

  async suscribirFcm(userId: string, token: string) {
    const endpoint = `${FCM_PREFIX}${token}`;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: '-', auth: '-' },
      update: { userId },
    });
    return { ok: true };
  }

  async suscribirApns(userId: string, token: string) {
    const endpoint = `${APNS_PREFIX}${token}`;
    await this.prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh: '-', auth: '-' },
      update: { userId },
    });
    return { ok: true };
  }

  async desuscribir(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
    return { ok: true };
  }

  async desuscribirExpo(userId: string, token: string) {
    await this.desuscribir(userId, `${EXPO_PREFIX}${token}`);
  }

  async desuscribirFcm(userId: string, token: string) {
    await this.desuscribir(userId, `${FCM_PREFIX}${token}`);
  }

  async desuscribirApns(userId: string, token: string) {
    await this.desuscribir(userId, `${APNS_PREFIX}${token}`);
  }

  private tryInitFirebase(): boolean {
    if (this.firebaseTried) return this.firebaseInited;
    this.firebaseTried = true;

    try {
      if (!admin.apps.length) {
        const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
        if (raw) {
          const cred = JSON.parse(raw) as admin.ServiceAccount;
          admin.initializeApp({ credential: admin.credential.cert(cred) });
        } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
          admin.initializeApp({ credential: admin.credential.applicationDefault() });
        } else {
          this.logger.warn(
            'FCM no configurado: define FIREBASE_SERVICE_ACCOUNT_JSON o GOOGLE_APPLICATION_CREDENTIALS',
          );
          return false;
        }
      }
      this.firebaseInited = true;
      return true;
    } catch (error) {
      this.logger.warn(
        `FCM no disponible: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /** Envía push a todos los dispositivos del usuario. Nunca bloquea al llamador. */
  async enviar(userId: string, datos: { titulo: string; cuerpo: string; url: string; tipo?: string }) {
    const subs = await this.prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;

    const webSubs = subs.filter(
      (s) =>
        !s.endpoint.startsWith(EXPO_PREFIX) &&
        !s.endpoint.startsWith(FCM_PREFIX) &&
        !s.endpoint.startsWith(APNS_PREFIX),
    );
    const expoSubs = subs.filter((s) => s.endpoint.startsWith(EXPO_PREFIX));
    const fcmSubs = subs.filter((s) => s.endpoint.startsWith(FCM_PREFIX));
    const apnsSubs = subs.filter((s) => s.endpoint.startsWith(APNS_PREFIX));

    if (this.webActivo && webSubs.length > 0) {
      const payload = JSON.stringify({
        titulo: datos.titulo,
        cuerpo: datos.cuerpo,
        url: datos.url,
        ...(datos.tipo ? { tipo: datos.tipo } : {}),
      });

      await Promise.all(
        webSubs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: { p256dh: sub.p256dh, auth: sub.auth },
              },
              payload,
            );
          } catch (error) {
            const status = (error as { statusCode?: number }).statusCode;
            if (status === 404 || status === 410) {
              await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
            }
            this.logger.warn(
              `Push web fallido: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );
    }

    if (fcmSubs.length > 0) {
      const fcmOk = this.tryInitFirebase();
      if (!fcmOk) {
        this.logger.warn(`Omitiendo ${fcmSubs.length} suscripción(es) FCM: Firebase no configurado`);
      } else {
        await Promise.all(
          fcmSubs.map(async (sub) => {
            const token = sub.endpoint.slice(FCM_PREFIX.length);
            try {
              await admin.messaging().send({
                token,
                notification: { title: datos.titulo, body: datos.cuerpo },
                data: {
                  titulo: datos.titulo,
                  cuerpo: datos.cuerpo,
                  url: datos.url,
                  ...(datos.tipo ? { tipo: datos.tipo } : {}),
                },
                android: { priority: 'high' },
              });
            } catch (error) {
              const code = (error as { code?: string }).code;
              if (
                code === 'messaging/registration-token-not-registered' ||
                code === 'messaging/invalid-registration-token'
              ) {
                await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
              }
              this.logger.warn(
                `Push FCM fallido: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }),
        );
      }
    }

    if (apnsSubs.length > 0) {
      const apnsConfig = parseApnsConfig();
      if (!apnsConfig) {
        this.logger.warn(
          `Omitiendo ${apnsSubs.length} suscripción(es) APNs: define APNS_KEY_ID, APNS_TEAM_ID, APNS_SIGNING_KEY`,
        );
      } else {
        await Promise.all(
          apnsSubs.map(async (sub) => {
            const token = sub.endpoint.slice(APNS_PREFIX.length);
            try {
              const result = await enviarApns(apnsConfig, token, datos);
              if (result.status < 200 || result.status >= 300) {
                if (esTokenApnsInvalido(result)) {
                  await this.prisma.pushSubscription
                    .delete({ where: { id: sub.id } })
                    .catch(() => undefined);
                }
                this.logger.warn(
                  `Push APNs fallido (${result.status}${result.reason ? `: ${result.reason}` : ''})`,
                );
              }
            } catch (error) {
              this.logger.warn(
                `Push APNs fallido: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }),
        );
      }
    }

    if (expoSubs.length > 0) {
      const mensajes = expoSubs.map((sub) => ({
        to: sub.endpoint.slice(EXPO_PREFIX.length),
        title: datos.titulo,
        body: datos.cuerpo,
        data: { url: datos.url, ...(datos.tipo ? { tipo: datos.tipo } : {}) },
        sound: 'default' as const,
      }));

      try {
        const respuesta = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(mensajes),
        });
        const resultado = (await respuesta.json()) as {
          data?: Array<{ status: string; details?: { error?: string } }>;
        };
        const fallos = resultado.data?.filter((r) => r.status === 'error') ?? [];
        for (let i = 0; i < fallos.length; i++) {
          const error = fallos[i]?.details?.error;
          if (error === 'DeviceNotRegistered' && expoSubs[i]) {
            await this.prisma.pushSubscription
              .delete({ where: { id: expoSubs[i]!.id } })
              .catch(() => undefined);
          }
        }
      } catch (error) {
        this.logger.warn(
          `Push Expo fallido: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }
}
