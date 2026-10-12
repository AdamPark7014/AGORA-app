import assert from 'node:assert/strict';
import { test } from 'node:test';

import { limiteDeConsulta } from './consulta.js';

test('limite de consulta: basura, negativos y excesos caen en algo seguro', () => {
  assert.equal(limiteDeConsulta(undefined, 30, 50), 30);
  assert.equal(limiteDeConsulta('abc', 30, 50), 30);
  assert.equal(limiteDeConsulta('-5', 30, 50), 30);
  assert.equal(limiteDeConsulta('0', 30, 50), 30);
  assert.equal(limiteDeConsulta('999', 30, 50), 50);
  assert.equal(limiteDeConsulta('12', 30, 50), 12);
});
