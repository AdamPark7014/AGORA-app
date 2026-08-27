import assert from 'node:assert/strict';
import { test } from 'node:test';

import { revisarEntorno } from './entorno.js';

const baseProd = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://agora:x@localhost:5432/agora',
  SESSION_SECRET: 'x'.repeat(32),
  NEXT_PUBLIC_WEB_URL: 'https://udlagora.com',
  MAIL_PROVIDER: 'brevo',
  BREVO_API_KEY: 'clave-demo',
  MAIL_FROM: 'Ágora <contacto@udlagora.com>',
});

test('en produccion sin OPENAI_API_KEY exige MODERACION_OPCIONAL=true explicito', () => {
  // Sin bypass silencioso: o hay clasificador, o se declara que la cola humana
  // es suficiente. Olvidar la llave no puede pasar por "ok".
  const problemas = revisarEntorno({ ...baseProd() });
  assert.ok(
    problemas.some((p) => p.variable === 'OPENAI_API_KEY'),
    'debe exigir OPENAI_API_KEY o MODERACION_OPCIONAL',
  );
});

test('MODERACION_OPCIONAL=true es el unico bypass deliberado sin IA', () => {
  const problemas = revisarEntorno({
    ...baseProd(),
    MODERACION_OPCIONAL: 'true',
  });
  assert.equal(
    problemas.some((p) => p.variable === 'OPENAI_API_KEY'),
    false,
  );
});

test('con OPENAI_API_KEY no hace falta el bypass', () => {
  const problemas = revisarEntorno({
    ...baseProd(),
    OPENAI_API_KEY: 'sk-test',
  });
  assert.equal(
    problemas.some((p) => p.variable === 'OPENAI_API_KEY'),
    false,
  );
});

test('DEV_OTP_* en produccion se rechaza', () => {
  const problemas = revisarEntorno({
    ...baseProd(),
    OPENAI_API_KEY: 'sk-test',
    DEV_OTP_MAESTRO: '123456',
  });
  assert.ok(problemas.some((p) => p.variable.includes('DEV_OTP')));
});
