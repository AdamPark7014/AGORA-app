import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  ESPERA_ENTRE_ENVIOS_MS,
  LONGITUD_CODIGO,
  MAX_ENVIOS_DIA,
  MAX_INTENTOS,
  RESULTADO_ENVIO,
  RESULTADO_OTP,
  compararHash,
  generarCodigo,
  generarTokenSesion,
  hashCodigo,
  hashTokenSesion,
  puedeEnviar,
  sesionVigente,
  vencimientoDesde,
  verificarCodigo,
} from './otp.js';

const SECRETO = 'secreto-de-prueba';
const AHORA = new Date('2026-08-19T00:00:00Z');

test('el codigo son 6 digitos, incluidos los que empiezan en cero', () => {
  for (let i = 0; i < 500; i += 1) {
    const codigo = generarCodigo();
    assert.match(codigo, /^\d{6}$/, `codigo invalido: ${codigo}`);
    assert.equal(codigo.length, LONGITUD_CODIGO);
  }
});

test('los codigos no se repiten siempre (usa CSPRNG, no una constante)', () => {
  const vistos = new Set(Array.from({ length: 200 }, () => generarCodigo()));
  assert.ok(vistos.size > 100, `demasiada repeticion: ${vistos.size} distintos de 200`);
});

test('el hash del mismo codigo cambia entre correos distintos', () => {
  const a = hashCodigo('123456', 'ana@udlap.mx', SECRETO);
  const b = hashCodigo('123456', 'luis@udlap.mx', SECRETO);
  assert.notEqual(a, b, 'un hash reutilizable en otra cuenta seria un agujero');
});

test('el hash cambia si cambia el secreto del servidor', () => {
  const a = hashCodigo('123456', 'ana@udlap.mx', SECRETO);
  const b = hashCodigo('123456', 'ana@udlap.mx', 'otro-secreto');
  assert.notEqual(a, b);
});

test('el correo se normaliza al hashear: mayusculas no rompen el login', () => {
  assert.equal(
    hashCodigo('123456', 'ANA@UDLAP.MX', SECRETO),
    hashCodigo('123456', 'ana@udlap.mx', SECRETO),
  );
});

test('sin secreto de servidor no se puede hashear', () => {
  assert.throws(() => hashCodigo('123456', 'ana@udlap.mx', ''), /secreto/i);
});

test('compararHash rechaza longitudes distintas sin reventar', () => {
  assert.equal(compararHash('abc', 'abcdef'), false);
  assert.equal(compararHash('abc', 'abc'), true);
});

// --- Verificacion

const guardado = (codigo: string, extra: Partial<Parameters<typeof verificarCodigo>[2]> = {}) => ({
  codeHash: hashCodigo(codigo, 'ana@udlap.mx', SECRETO),
  expiresAt: vencimientoDesde(AHORA),
  consumedAt: null,
  intentos: 0,
  ...extra,
});

test('el codigo correcto es valido', () => {
  const r = verificarCodigo('123456', 'ana@udlap.mx', guardado('123456'), SECRETO, AHORA);
  assert.equal(r, RESULTADO_OTP.VALIDO);
});

test('el codigo equivocado no pasa', () => {
  const r = verificarCodigo('999999', 'ana@udlap.mx', guardado('123456'), SECRETO, AHORA);
  assert.equal(r, RESULTADO_OTP.INCORRECTO);
});

test('un codigo de otra cuenta no sirve aunque los digitos coincidan', () => {
  const r = verificarCodigo('123456', 'luis@udlap.mx', guardado('123456'), SECRETO, AHORA);
  assert.equal(r, RESULTADO_OTP.INCORRECTO);
});

test('el codigo vence a los 10 minutos', () => {
  const justoAntes = new Date(AHORA.getTime() + 10 * 60 * 1000 - 1);
  const justoDespues = new Date(AHORA.getTime() + 10 * 60 * 1000);
  assert.equal(
    verificarCodigo('123456', 'ana@udlap.mx', guardado('123456'), SECRETO, justoAntes),
    RESULTADO_OTP.VALIDO,
  );
  assert.equal(
    verificarCodigo('123456', 'ana@udlap.mx', guardado('123456'), SECRETO, justoDespues),
    RESULTADO_OTP.EXPIRADO,
  );
});

test('un codigo ya usado no se puede reutilizar', () => {
  const r = verificarCodigo(
    '123456',
    'ana@udlap.mx',
    guardado('123456', { consumedAt: AHORA }),
    SECRETO,
    AHORA,
  );
  assert.equal(r, RESULTADO_OTP.YA_USADO);
});

test('al agotar los intentos el codigo muere, aunque despues llegue el correcto', () => {
  const r = verificarCodigo(
    '123456',
    'ana@udlap.mx',
    guardado('123456', { intentos: MAX_INTENTOS }),
    SECRETO,
    AHORA,
  );
  assert.equal(r, RESULTADO_OTP.SIN_INTENTOS);
});

test('un codigo expirado Y usado reporta usado: no se gasta un intento en balde', () => {
  const r = verificarCodigo(
    '000000',
    'ana@udlap.mx',
    guardado('123456', { consumedAt: AHORA, expiresAt: new Date(AHORA.getTime() - 1) }),
    SECRETO,
    AHORA,
  );
  assert.equal(r, RESULTADO_OTP.YA_USADO);
});

// --- Limites de envio: protegen el dominio @udlap.mx de quedar bloqueado

test('el primer envio siempre se permite', () => {
  const r = puedeEnviar({ ultimoEnvioAt: null, enviosUltimas24h: 0 }, AHORA);
  assert.equal(r, RESULTADO_ENVIO.PERMITIDO);
});

test('no se puede pedir otro codigo antes de un minuto', () => {
  const hace30s = new Date(AHORA.getTime() - 30_000);
  assert.equal(
    puedeEnviar({ ultimoEnvioAt: hace30s, enviosUltimas24h: 1 }, AHORA),
    RESULTADO_ENVIO.DEMASIADO_PRONTO,
  );

  const haceUnMinuto = new Date(AHORA.getTime() - ESPERA_ENTRE_ENVIOS_MS);
  assert.equal(
    puedeEnviar({ ultimoEnvioAt: haceUnMinuto, enviosUltimas24h: 1 }, AHORA),
    RESULTADO_ENVIO.PERMITIDO,
  );
});

test('hay tope diario por buzon', () => {
  const viejo = new Date(AHORA.getTime() - 3600_000);
  assert.equal(
    puedeEnviar({ ultimoEnvioAt: viejo, enviosUltimas24h: MAX_ENVIOS_DIA }, AHORA),
    RESULTADO_ENVIO.TOPE_DIARIO,
  );
});

test('el tope diario gana sobre la espera de un minuto', () => {
  const hace30s = new Date(AHORA.getTime() - 30_000);
  assert.equal(
    puedeEnviar({ ultimoEnvioAt: hace30s, enviosUltimas24h: MAX_ENVIOS_DIA }, AHORA),
    RESULTADO_ENVIO.TOPE_DIARIO,
  );
});

// --- Sesiones

test('el token de sesion es largo, aleatorio y url-safe', () => {
  const tokens = new Set(Array.from({ length: 100 }, () => generarTokenSesion()));
  assert.equal(tokens.size, 100, 'no debe repetirse');
  for (const t of tokens) {
    assert.ok(t.length >= 43, `token corto: ${t.length}`);
    assert.match(t, /^[A-Za-z0-9_-]+$/, 'debe ser base64url');
  }
});

test('el hash del token es estable y distinto del token', () => {
  const token = generarTokenSesion();
  assert.equal(hashTokenSesion(token), hashTokenSesion(token));
  assert.notEqual(hashTokenSesion(token), token);
});

test('una sesion revocada o vencida deja de valer', () => {
  const futuro = new Date(AHORA.getTime() + 1000);
  const pasado = new Date(AHORA.getTime() - 1000);
  assert.equal(sesionVigente({ expiresAt: futuro, revokedAt: null }, AHORA), true);
  assert.equal(sesionVigente({ expiresAt: pasado, revokedAt: null }, AHORA), false);
  assert.equal(sesionVigente({ expiresAt: futuro, revokedAt: AHORA }, AHORA), false);
});
