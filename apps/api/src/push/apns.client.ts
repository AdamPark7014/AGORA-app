import * as crypto from 'node:crypto';
import * as http2 from 'node:http2';

export interface ApnsConfig {
  keyId: string;
  teamId: string;
  signingKey: string;
  bundleId: string;
  production: boolean;
}

export interface ApnsSendPayload {
  titulo: string;
  cuerpo: string;
  url: string;
  tipo?: string;
}

interface ApnsSendResult {
  status: number;
  reason?: string;
}

const JWT_TTL_MS = 50 * 60 * 1000;

let cachedJwt: { token: string; expiresAt: number } | null = null;

const signJwt = (config: ApnsConfig): string => {
  const now = Date.now();
  if (cachedJwt && cachedJwt.expiresAt > now) return cachedJwt.token;

  const header = { alg: 'ES256', kid: config.keyId };
  const claims = { iss: config.teamId, iat: Math.floor(now / 1000) };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${encode(header)}.${encode(claims)}`;
  const key = crypto.createPrivateKey(config.signingKey.replace(/\\n/g, '\n'));
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key, dsaEncoding: 'ieee-p1363' });
  const token = `${unsigned}.${signature.toString('base64url')}`;
  cachedJwt = { token, expiresAt: now + JWT_TTL_MS };
  return token;
};

const apnsHost = (production: boolean) =>
  production ? 'api.push.apple.com' : 'api.sandbox.push.apple.com';

export const parseApnsConfig = (): ApnsConfig | null => {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim();
  const signingKey = process.env.APNS_SIGNING_KEY?.trim();
  const bundleId = process.env.APNS_BUNDLE_ID?.trim() ?? 'mx.agora.mobile.AgoraApp';
  const production = process.env.APNS_PRODUCTION === 'true';

  if (!keyId || !teamId || !signingKey) return null;
  return { keyId, teamId, signingKey, bundleId, production };
};

/** Envía una notificación APNs con deep link en el payload raíz (`url`). */
export const enviarApns = async (
  config: ApnsConfig,
  deviceToken: string,
  datos: ApnsSendPayload,
): Promise<ApnsSendResult> => {
  const jwt = signJwt(config);
  const payload = {
    aps: {
      alert: { title: datos.titulo, body: datos.cuerpo },
      sound: 'default',
    },
    titulo: datos.titulo,
    cuerpo: datos.cuerpo,
    url: datos.url,
    ...(datos.tipo ? { tipo: datos.tipo } : {}),
  };

  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${apnsHost(config.production)}`);
    const body = JSON.stringify(payload);
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': config.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });

    let responseBody = '';
    req.on('response', (headers) => {
      req.on('data', (chunk: Buffer) => {
        responseBody += chunk.toString();
      });
      req.on('end', () => {
        client.close();
        const status = Number(headers[':status'] ?? 0);
        let reason: string | undefined;
        if (responseBody) {
          try {
            reason = (JSON.parse(responseBody) as { reason?: string }).reason;
          } catch {
            reason = responseBody;
          }
        }
        resolve({ status, reason });
      });
    });
    req.on('error', (error) => {
      client.close();
      reject(error);
    });
    req.write(body);
    req.end();
  });
};

export const esTokenApnsInvalido = (result: ApnsSendResult): boolean => {
  if (result.status === 410) return true;
  if (result.status === 400 && result.reason === 'BadDeviceToken') return true;
  if (result.status === 400 && result.reason === 'Unregistered') return true;
  return false;
};
