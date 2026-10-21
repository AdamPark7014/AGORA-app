import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  BLOQUEO_LOGIN_MS,
  MAX_FALLIDOS_LOGIN,
  MENSAJE_CONTRASENA,
  RESULTADO_CONTRASENA,
  VENTANA_CODIGO_RECIENTE_MS,
  bloqueoTrasFallo,
  loginBloqueado,
  minutosDeBloqueo,
  puedeFijarSinActual,
  validarContrasena,
} from './contrasena.js';

const CORREO = 'ana.ramirez@udlap.mx';
const AHORA = new Date('2026-10-21T12:00:00Z');

test('una contraseña normal es válida', () => {
  assert.equal(validarContrasena('cafe-de-cholula-2026', CORREO), RESULTADO_CONTRASENA.VALIDA);
});

test('menos de 8 caracteres no pasa; "ñ" y emojis cuentan como uno', () => {
  assert.equal(validarContrasena('siete77', CORREO), RESULTADO_CONTRASENA.CORTA);
  assert.equal(validarContrasena('ñandú🙂88', CORREO), RESULTADO_CONTRASENA.VALIDA);
});

test('más de 128 caracteres tampoco', () => {
  assert.equal(validarContrasena('x'.repeat(129) + 'y', CORREO), RESULTADO_CONTRASENA.LARGA);
});

test('las más filtradas del mundo se rechazan, sin importar mayúsculas', () => {
  assert.equal(validarContrasena('Password1', CORREO), RESULTADO_CONTRASENA.COMUN);
  assert.equal(validarContrasena('UDLAP1234', CORREO), RESULTADO_CONTRASENA.COMUN);
});

test('un solo carácter repetido no es contraseña', () => {
  assert.equal(validarContrasena('aaaaaaaaaa', CORREO), RESULTADO_CONTRASENA.REPETIDA);
});

test('no puede incluir el buzón del correo', () => {
  assert.equal(validarContrasena('ana.ramirez2026', CORREO), RESULTADO_CONTRASENA.CONTIENE_CORREO);
  // Un buzón de tres letras no cuenta: "ana" aparece en demasiadas palabras.
  assert.equal(validarContrasena('manzana-verde', 'ana@udlap.mx'), RESULTADO_CONTRASENA.VALIDA);
});

test('cada fallo tiene un mensaje en español', () => {
  for (const r of Object.values(RESULTADO_CONTRASENA)) {
    if (r === 'valida') continue;
    assert.ok(MENSAJE_CONTRASENA[r].length > 10, `falta mensaje para ${r}`);
  }
});

// --- Bloqueo por intentos

test('no se bloquea hasta el quinto fallo seguido', () => {
  assert.equal(bloqueoTrasFallo(MAX_FALLIDOS_LOGIN - 1, AHORA), null);
  const hasta = bloqueoTrasFallo(MAX_FALLIDOS_LOGIN, AHORA);
  assert.ok(hasta);
  assert.equal(hasta.getTime(), AHORA.getTime() + BLOQUEO_LOGIN_MS);
});

test('el bloqueo vence solo', () => {
  const hasta = new Date(AHORA.getTime() + 60_000);
  assert.equal(loginBloqueado({ loginFallidos: 5, loginBloqueadoHasta: hasta }, AHORA), true);
  assert.equal(
    loginBloqueado({ loginFallidos: 5, loginBloqueadoHasta: hasta }, new Date(hasta.getTime() + 1)),
    false,
  );
  assert.equal(loginBloqueado({ loginFallidos: 0, loginBloqueadoHasta: null }, AHORA), false);
});

test('los minutos que faltan se redondean hacia arriba y nunca son cero', () => {
  const hasta = new Date(AHORA.getTime() + 61_000);
  assert.equal(minutosDeBloqueo({ loginFallidos: 5, loginBloqueadoHasta: hasta }, AHORA), 2);
  const casi = new Date(AHORA.getTime() + 1_000);
  assert.equal(minutosDeBloqueo({ loginFallidos: 5, loginBloqueadoHasta: casi }, AHORA), 1);
});

// --- Fijar contraseña sin la actual

test('sin contraseña todavía, cualquier sesión puede crearla (migración)', () => {
  const vieja = { viaCodigo: true, createdAt: new Date(AHORA.getTime() - 90 * 24 * 3600_000) };
  assert.equal(puedeFijarSinActual({ tieneContrasena: false }, vieja, AHORA), true);
});

test('con contraseña, solo una sesión reciente abierta por código puede reemplazarla', () => {
  const reciente = { viaCodigo: true, createdAt: new Date(AHORA.getTime() - 5 * 60_000) };
  const tarde = {
    viaCodigo: true,
    createdAt: new Date(AHORA.getTime() - VENTANA_CODIGO_RECIENTE_MS - 1),
  };
  const porContrasena = { viaCodigo: false, createdAt: AHORA };
  assert.equal(puedeFijarSinActual({ tieneContrasena: true }, reciente, AHORA), true);
  assert.equal(puedeFijarSinActual({ tieneContrasena: true }, tarde, AHORA), false);
  assert.equal(puedeFijarSinActual({ tieneContrasena: true }, porContrasena, AHORA), false);
});
