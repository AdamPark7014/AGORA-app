import assert from 'node:assert/strict';
import { test } from 'node:test';

import { moderacionPreviaActiva } from './moderacion.js';

test('sin OPENAI_API_KEY la moderacion previa no esta activa', () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    delete process.env.OPENAI_API_KEY;
    delete process.env.MODERACION_OPCIONAL;
    assert.equal(moderacionPreviaActiva(), false);
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});

test('MODERACION_OPCIONAL=true apaga el filtro IA aunque haya llave', () => {
  // Bypass explicito: publica sin clasificador. La cola humana (reportes)
  // sigue existiendo; esto no es un agujero silencioso.
  const prevKey = process.env.OPENAI_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.MODERACION_OPCIONAL = 'true';
    assert.equal(moderacionPreviaActiva(), false);
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});

test('con llave y sin bypass la moderacion previa esta activa', () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    process.env.OPENAI_API_KEY = 'sk-test';
    delete process.env.MODERACION_OPCIONAL;
    assert.equal(moderacionPreviaActiva(), true);
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});

test('OPENAI_API_KEY vacia no activa la moderacion previa', () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    process.env.OPENAI_API_KEY = '';
    delete process.env.MODERACION_OPCIONAL;
    assert.equal(moderacionPreviaActiva(), false);
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});

test('MODERACION_OPCIONAL=false no apaga el filtro si hay llave', () => {
  const prevKey = process.env.OPENAI_API_KEY;
  const prevOpt = process.env.MODERACION_OPCIONAL;
  try {
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.MODERACION_OPCIONAL = 'false';
    assert.equal(moderacionPreviaActiva(), true);
  } finally {
    if (prevKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevKey;
    if (prevOpt === undefined) delete process.env.MODERACION_OPCIONAL;
    else process.env.MODERACION_OPCIONAL = prevOpt;
  }
});
