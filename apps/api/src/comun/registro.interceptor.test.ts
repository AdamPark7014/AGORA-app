import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';

import { estadoDe, rutaSinDatos } from './registro.interceptor.js';

/**
 * Lo que se escribe en el registro acaba en disco y en las copias de
 * seguridad. Estas pruebas fijan que no acabe ahi nada que no deba.
 */

test('la cadena de consulta no llega al registro', () => {
  // Ahi viajan busquedas, cursores y el texto que la gente escribe en el
  // buscador. Para saber que endpoint tardo no hace falta nada de eso.
  assert.equal(
    rutaSinDatos({ originalUrl: '/api/directorio?q=ana%20maria&carrera=derecho' }),
    '/api/directorio',
  );
});

test('una ruta sin parametros pasa igual', () => {
  assert.equal(rutaSinDatos({ originalUrl: '/api/feed' }), '/api/feed');
});

test('el codigo de una excepcion de Nest se lee de la excepcion', () => {
  assert.equal(estadoDe(new ForbiddenException()), 403);
  assert.equal(estadoDe(new HttpException('lento', HttpStatus.GATEWAY_TIMEOUT)), 504);
});

test('un error del analizador de cuerpo conserva su codigo', () => {
  assert.equal(estadoDe(Object.assign(new Error('too large'), { status: 413 })), 413);
});

test('un error desconocido cuenta como 500', () => {
  // Importa: si un fallo nuestro se anotara como 200, no aparecerian en las
  // busquedas de errores del registro.
  assert.equal(estadoDe(new Error('vaya')), 500);
  assert.equal(estadoDe(undefined), 500);
  assert.equal(estadoDe('texto'), 500);
});
