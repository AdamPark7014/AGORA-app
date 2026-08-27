import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { RESULTADO_MAESTRO, maestroActivo, verificarMaestro } from './maestro.js';

const CORREO = 'adam.delpozoos@udlap.mx';
const config = (extra: Partial<Parameters<typeof verificarMaestro>[2]> = {}) => ({
  codigo: '123456',
  correos: CORREO,
  produccion: false,
  ...extra,
});

test('el codigo y el correo correctos abren la puerta', () => {
  assert.equal(
    verificarMaestro('123456', CORREO, config()),
    RESULTADO_MAESTRO.VALIDO,
  );
});

test('en produccion esta apagado aunque las variables esten puestas', () => {
  assert.equal(
    verificarMaestro('123456', CORREO, config({ produccion: true })),
    RESULTADO_MAESTRO.APAGADO,
    'esta es la unica guarda que importa si todas las demas fallan',
  );
});

test('sin codigo configurado esta apagado', () => {
  assert.equal(
    verificarMaestro('123456', CORREO, config({ codigo: undefined })),
    RESULTADO_MAESTRO.APAGADO,
  );
});

test('sin lista de correos esta apagado', () => {
  for (const correos of [undefined, '', '   ', ',,']) {
    assert.equal(
      verificarMaestro('123456', CORREO, config({ correos })),
      RESULTADO_MAESTRO.APAGADO,
      `lista ${JSON.stringify(correos)} no debe activar nada`,
    );
  }
});

test('un correo que no esta en la lista no entra', () => {
  assert.equal(
    verificarMaestro('123456', 'otro@udlap.mx', config()),
    RESULTADO_MAESTRO.NO_COINCIDE,
  );
});

test('el codigo equivocado no entra', () => {
  assert.equal(
    verificarMaestro('000000', CORREO, config()),
    RESULTADO_MAESTRO.NO_COINCIDE,
  );
});

test('acepta varios correos separados por comas', () => {
  const c = config({ correos: `otro@udlap.mx, ${CORREO} ,tercero@udlap.mx` });
  assert.equal(verificarMaestro('123456', CORREO, c), RESULTADO_MAESTRO.VALIDO);
  assert.equal(verificarMaestro('123456', 'tercero@udlap.mx', c), RESULTADO_MAESTRO.VALIDO);
  assert.equal(verificarMaestro('123456', 'cuarto@udlap.mx', c), RESULTADO_MAESTRO.NO_COINCIDE);
});

test('el correo se compara sin importar mayusculas ni espacios', () => {
  assert.equal(
    verificarMaestro('123456', '  ADAM.DELPOZOOS@UDLAP.MX ', config()),
    RESULTADO_MAESTRO.VALIDO,
  );
});

test('un comodin es un error, no una comodidad', () => {
  assert.throws(
    () => verificarMaestro('123456', CORREO, config({ correos: '*' })),
    /comodines/,
    'un * abriria la red entera a quien sepa el codigo',
  );
});

test('un dominio entero tambien es un error', () => {
  assert.throws(
    () => verificarMaestro('123456', CORREO, config({ correos: '@udlap.mx' })),
    /dominios/,
  );
});

test('maestroActivo refleja si la puerta esta abierta', () => {
  assert.equal(maestroActivo(config()), true);
  assert.equal(maestroActivo(config({ produccion: true })), false);
  assert.equal(maestroActivo(config({ codigo: undefined })), false);
  assert.equal(maestroActivo(config({ correos: '' })), false);
});
