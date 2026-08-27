import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';

import { normalizar, pareceJsonRoto, tipoDeCuerpo } from './error.filter.js';

/**
 * La forma del error es contrato con el cliente: la web y la app leen
 * `mensaje` y `errores`, nada mas. Estas pruebas fijan que cualquier manera en
 * que Nest empaquete una excepcion acabe en esa misma forma.
 */

test('una excepcion con texto suelto sale como mensaje', () => {
  assert.deepEqual(normalizar(new NotFoundException('Ese perfil no existe.')), {
    mensaje: 'Ese perfil no existe.',
  });
});

test('lo que ya produce ZodPipe pasa intacto', () => {
  const excepcion = new BadRequestException({
    mensaje: 'Datos invalidos.',
    errores: [{ campo: 'email', mensaje: 'Necesitas un correo @udlap.mx.' }],
  });

  assert.deepEqual(normalizar(excepcion), {
    mensaje: 'Datos invalidos.',
    errores: [{ campo: 'email', mensaje: 'Necesitas un correo @udlap.mx.' }],
  });
});

test('nunca sale `message` ni `statusCode`, que es lo que obligaba al cliente a adivinar', () => {
  const cuerpo = normalizar(new ForbiddenException('No perteneces a esa comunidad.'));

  assert.ok(!('message' in cuerpo));
  assert.ok(!('statusCode' in cuerpo));
  assert.ok(!('error' in cuerpo));
  assert.equal(cuerpo.mensaje, 'No perteneces a esa comunidad.');
});

test('una lista de mensajes deja el primero arriba y el resto en errores', () => {
  const excepcion = new BadRequestException({
    message: ['El texto es obligatorio.', 'Maximo 2000 caracteres.'],
  });

  const cuerpo = normalizar(excepcion);
  assert.equal(cuerpo.mensaje, 'El texto es obligatorio.');
  assert.equal(cuerpo.errores?.length, 2);
});

test('una excepcion sin cuerpo util no deja al usuario sin mensaje', () => {
  // El caso desagradable: alguien lanza `new HttpException({}, 400)`. Antes
  // el cliente pintaba "undefined".
  const cuerpo = normalizar(new HttpException({}, HttpStatus.BAD_REQUEST));

  assert.equal(typeof cuerpo.mensaje, 'string');
  assert.ok(cuerpo.mensaje.length > 0);
});

test('el 429 del limite de OTP conserva su texto', () => {
  // Este viaja como HttpException con texto suelto y el usuario lo lee tal
  // cual en la pantalla de entrada.
  const excepcion = new HttpException(
    'Espera un minuto antes de pedir otro codigo.',
    HttpStatus.TOO_MANY_REQUESTS,
  );

  assert.equal(normalizar(excepcion).mensaje, 'Espera un minuto antes de pedir otro codigo.');
});

/**
 * Los errores del analizador de cuerpo son culpa del cliente, no del
 * servidor. Confundirlos costaba dos cosas: un 500 mentiroso al usuario, y una
 * entrada de error en el registro por cada peticion mal formada — o sea, una
 * forma barata de llenar el log desde fuera.
 */

test('un error del analizador de cuerpo se reconoce por su firma', () => {
  const tooLarge = Object.assign(new Error('request entity too large'), {
    type: 'entity.too.large',
    status: 413,
  });

  assert.equal(tipoDeCuerpo(tooLarge), 'entity.too.large');
});

test('un error nuestro no se confunde con uno del analizador', () => {
  assert.equal(tipoDeCuerpo(new Error('se rompio algo')), null);
  assert.equal(tipoDeCuerpo(new NotFoundException('no esta')), null);
  assert.equal(tipoDeCuerpo(null), null);
  assert.equal(tipoDeCuerpo('texto suelto'), null);
});

test('un objeto con `type` pero sin estado no cuenta', () => {
  // Sin esto, cualquier error nuestro con un campo `type` acabaria tratado
  // como peticion mal formada y devolveria 400 en vez de 500.
  assert.equal(tipoDeCuerpo({ type: 'algo' }), null);
});

test('un 400 con texto de JSON.parse se reconoce como cuerpo mal formado', () => {
  // Los mensajes son los de V8, que no se traducen.
  for (const texto of [
    'Unexpected end of JSON input',
    "Unexpected token 'x', \"{bad\" is not valid JSON",
    'Expected property name or } in JSON at position 1',
    'Unterminated string in JSON at position 12',
  ]) {
    assert.ok(pareceJsonRoto(400, texto), `deberia reconocer: ${texto}`);
  }
});

test('no confunde un mensaje nuestro con un JSON roto', () => {
  assert.equal(pareceJsonRoto(400, 'Datos invalidos.'), false);
  assert.equal(pareceJsonRoto(400, 'Necesitas un correo @udlap.mx para entrar.'), false);
  // Ni siquiera si el texto habla de JSON, cuando el codigo no es 400.
  assert.equal(pareceJsonRoto(500, 'Unexpected end of JSON input'), false);
});
