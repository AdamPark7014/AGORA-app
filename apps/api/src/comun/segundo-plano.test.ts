import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Logger } from '@nestjs/common';

import { enSegundoPlano } from './segundo-plano.js';

test('un fallo en segundo plano se registra y no queda sin capturar', async () => {
  const avisos: string[] = [];
  const logger = { warn: (m: string) => avisos.push(m) } as unknown as Logger;
  let sinCapturar = false;
  const marcar = () => {
    sinCapturar = true;
  };
  process.on('unhandledRejection', marcar);
  try {
    enSegundoPlano(Promise.reject(new Error('la base no contesto')), logger, 'Aviso');
    await new Promise((r) => setImmediate(r));
    assert.equal(sinCapturar, false);
    assert.deepEqual(avisos, ['Aviso fallo: la base no contesto']);
  } finally {
    process.off('unhandledRejection', marcar);
  }
});
