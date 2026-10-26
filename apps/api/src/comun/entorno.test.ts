import assert from 'node:assert/strict';
import { test } from 'node:test';

import { revisarEntorno } from './entorno.js';

/** Prod minima valida tras Ola R2 (cookie, redis, S3, mail). */
const baseProd = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://agora:x@localhost:5432/agora',
  SESSION_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_WEB_URL: 'https://udlagora.com',
  COOKIE_DOMAIN: '.udlagora.com',
  REDIS_URL: 'redis://localhost:6379',
  MAIL_PROVIDER: 'brevo',
  BREVO_API_KEY: 'clave-demo',
  MAIL_FROM: 'Ágora <contacto@udlagora.com>',
  S3_ENDPOINT: 'http://minio:9000',
  S3_BUCKET: 'agora-media',
  S3_ACCESS_KEY_ID: 'minio',
  S3_SECRET_ACCESS_KEY: 'minio-secret-largo',
  S3_PUBLIC_URL: 'https://udlagora.com/media',
  MODERACION_OPCIONAL: 'true',
});

test('desarrollo solo exige DATABASE_URL y SESSION_SECRET', () => {
  const problemas = revisarEntorno({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://x',
    SESSION_SECRET: 'x'.repeat(32),
  });
  assert.deepEqual(problemas, []);
});

test('falta SESSION_SECRET siempre', () => {
  const problemas = revisarEntorno({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://x',
  });
  assert.ok(problemas.some((p) => p.variable === 'SESSION_SECRET' && p.motivo === 'falta'));
});

test('SESSION_SECRET corto se rechaza', () => {
  const problemas = revisarEntorno({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://x',
    SESSION_SECRET: 'corto',
  });
  assert.ok(problemas.some((p) => p.variable === 'SESSION_SECRET' && p.motivo.includes('32')));
});

test('prod completa con MODERACION_OPCIONAL pasa', () => {
  assert.deepEqual(revisarEntorno(baseProd()), []);
});

test('en produccion sin ANTHROPIC_API_KEY exige MODERACION_OPCIONAL=true explicito', () => {
  const { MODERACION_OPCIONAL: _omit, ...sinBypass } = baseProd();
  const problemas = revisarEntorno(sinBypass);
  assert.ok(
    problemas.some((p) => p.variable === 'ANTHROPIC_API_KEY'),
    'debe exigir ANTHROPIC_API_KEY o MODERACION_OPCIONAL',
  );
});

test('MODERACION_OPCIONAL=true es el unico bypass deliberado sin IA', () => {
  const problemas = revisarEntorno(baseProd());
  assert.equal(
    problemas.some((p) => p.variable === 'ANTHROPIC_API_KEY'),
    false,
  );
});

test('con ANTHROPIC_API_KEY no hace falta el bypass', () => {
  const { MODERACION_OPCIONAL: _omit, ...resto } = baseProd();
  const problemas = revisarEntorno({
    ...resto,
    ANTHROPIC_API_KEY: 'pia_test',
    ANTHROPIC_BASE_URL: 'http://puerta-ia:8080',
  });
  assert.deepEqual(problemas, []);
});

test('el token de la puerta sin ANTHROPIC_BASE_URL se rechaza', () => {
  const { MODERACION_OPCIONAL: _omit, ...resto } = baseProd();
  const problemas = revisarEntorno({ ...resto, ANTHROPIC_API_KEY: 'pia_test' });
  assert.ok(problemas.some((p) => p.variable === 'ANTHROPIC_BASE_URL'));
});

test('DEV_OTP_* en produccion se rechaza', () => {
  const problemas = revisarEntorno({
    ...baseProd(),
    DEV_OTP_MAESTRO: '123456',
  });
  assert.ok(problemas.some((p) => p.variable.includes('DEV_OTP')));
});

test('prod exige COOKIE_DOMAIN', () => {
  const { COOKIE_DOMAIN: _omit, ...sin } = baseProd();
  const problemas = revisarEntorno(sin);
  assert.ok(problemas.some((p) => p.variable === 'COOKIE_DOMAIN'));
});

test('prod exige REDIS_URL', () => {
  const { REDIS_URL: _omit, ...sin } = baseProd();
  const problemas = revisarEntorno(sin);
  assert.ok(problemas.some((p) => p.variable === 'REDIS_URL'));
});

test('prod exige variables S3 / MinIO', () => {
  const { S3_ENDPOINT: _e, S3_BUCKET: _b, S3_PUBLIC_URL: _u, ...sin } = baseProd();
  const problemas = revisarEntorno(sin);
  for (const v of ['S3_ENDPOINT', 'S3_BUCKET', 'S3_PUBLIC_URL'] as const) {
    assert.ok(
      problemas.some((p) => p.variable === v),
      `debe exigir ${v}`,
    );
  }
});

test('prod exige API key del proveedor de mail', () => {
  const { BREVO_API_KEY: _omit, ...sin } = baseProd();
  const problemas = revisarEntorno(sin);
  assert.ok(problemas.some((p) => p.variable === 'BREVO_API_KEY'));
});

test('prod con resend exige RESEND_API_KEY', () => {
  const { BREVO_API_KEY: _omit, ...resto } = baseProd();
  const problemas = revisarEntorno({
    ...resto,
    MAIL_PROVIDER: 'resend',
  });
  assert.ok(problemas.some((p) => p.variable === 'RESEND_API_KEY'));
});

test('prod con resend y llave ok', () => {
  const { BREVO_API_KEY: _omit, ...resto } = baseProd();
  assert.deepEqual(
    revisarEntorno({
      ...resto,
      MAIL_PROVIDER: 'resend',
      RESEND_API_KEY: 're_demo',
    }),
    [],
  );
});

test('MAIL_PROVIDER=console en prod se rechaza', () => {
  const problemas = revisarEntorno({
    ...baseProd(),
    MAIL_PROVIDER: 'console',
  });
  assert.ok(problemas.some((p) => p.variable === 'MAIL_PROVIDER'));
});

test('NEXT_PUBLIC_WEB_URL http en prod se rechaza', () => {
  const problemas = revisarEntorno({
    ...baseProd(),
    NEXT_PUBLIC_WEB_URL: 'http://udlagora.com',
  });
  assert.ok(problemas.some((p) => p.variable === 'NEXT_PUBLIC_WEB_URL'));
});
