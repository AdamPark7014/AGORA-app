import { createHmac } from 'node:crypto';

import { expect, test } from '@playwright/test';

import { psql } from './helpers/db';

/**
 * Baja de cuenta: lo que se prueba es el contrato del servidor (la sesion
 * muere, la cuenta queda en BAJA, el correo real se libera), no la pantalla.
 */

const API = 'http://localhost:4200/api';
const CODIGO_FIJO = '424242';

function hashDe(codigo: string, email: string): string {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error('Falta SESSION_SECRET para la prueba e2e.');
  return createHmac('sha256', secreto).update(`${email.toLowerCase()}:${codigo}`).digest('hex');
}

test('eliminar la cuenta cierra la sesion, la deja en BAJA y libera el correo', async ({
  request,
}) => {
  const email = `e2e.baja.${Date.now().toString(36)}@udlap.mx`;

  const pedir = await request.post(`${API}/auth/otp/solicitar`, { data: { email } });
  expect(pedir.status()).toBe(204);
  psql(
    `update otp_codes set "codeHash" = '${hashDe(CODIGO_FIJO, email)}' ` +
      `where "userId" = (select id from users where email = '${email}') and "consumedAt" is null`,
  );
  const entrar = await request.post(`${API}/auth/otp/verificar`, {
    data: { email, codigo: CODIGO_FIJO },
  });
  expect(entrar.status()).toBe(201);
  const userId = psql(`select id from users where email = '${email}'`);

  const mal = await request.post(`${API}/cuenta/eliminar`, {
    data: { confirmacion: 'no' },
    failOnStatusCode: false,
  });
  expect(mal.status()).toBe(400);

  const baja = await request.post(`${API}/cuenta/eliminar`, {
    data: { confirmacion: 'ELIMINAR' },
  });
  expect(baja.status()).toBe(204);

  const yo = await request.get(`${API}/auth/yo`, { failOnStatusCode: false });
  expect(yo.status()).toBe(401);

  expect(psql(`select estado from users where id = '${userId}'`)).toBe('BAJA');
  expect(psql(`select count(*) from users where email = '${email}'`)).toBe('0');
  expect(psql(`select count(*) from sessions where "userId" = '${userId}'`)).toBe('0');

  // Puede volver: el correo ya no esta tomado por la cuenta dada de baja.
  const otraVez = await request.post(`${API}/auth/otp/solicitar`, {
    data: { email },
    failOnStatusCode: false,
  });
  expect([204, 429]).toContain(otraVez.status());
});
