import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { plantillaCodigo } from './plantilla.js';
import {
  ErrorCorreo,
  enviarConResend,
  enviarCorreo,
  esReintentable,
  esperaMs,
  separarRemitente,
} from './enviar.js';

const CONTENIDO = plantillaCodigo('123456', { minutos: 10 });

/** fetch falso: devuelve las respuestas de la cola y registra las llamadas. */
function fetchFalso(respuestas: Array<{ status: number; body?: unknown }>) {
  const llamadas: Array<{ url: string; init: RequestInit }> = [];
  const impl = (async (url: string, init: RequestInit) => {
    llamadas.push({ url, init });
    const r = respuestas.shift() ?? { status: 500 };
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      json: async () => r.body ?? {},
      text: async () => JSON.stringify(r.body ?? {}),
    };
  }) as unknown as typeof fetch;
  return { impl, llamadas };
}

const base = {
  apiKey: 'llave-de-prueba',
  from: 'Agora <hola@ejemplo.mx>',
  to: 'alguien@udlap.mx',
  contenido: CONTENIDO,
  claveIdempotencia: 'clave-1',
  dormir: async () => undefined, // no dormir de verdad en pruebas
};

// --- Plantilla

test('el codigo va en el asunto: muchos lo leen desde la notificacion', () => {
  assert.ok(CONTENIDO.asunto.includes('123456'));
});

test('siempre hay version de texto plano, no solo HTML', () => {
  assert.ok(CONTENIDO.texto.includes('123456'));
  assert.ok(CONTENIDO.texto.length > 50);
});

test('el HTML lleva los estilos en linea, no en una hoja aparte', () => {
  assert.ok(CONTENIDO.html.includes('style="'));
  assert.equal(CONTENIDO.html.includes('<style'), false, 'Gmail descarta <style> en head');
});

test('el correo no carga imagenes remotas', () => {
  assert.equal(/<img[^>]+src=["']https?:/i.test(CONTENIDO.html), false);
});

test('la vigencia del cuerpo viene del parametro, no esta codificada', () => {
  const otro = plantillaCodigo('999999', { minutos: 5 });
  assert.ok(otro.texto.includes('5 minutos'));
  assert.ok(otro.html.includes('5 minutos'));
});

test('el correo dice que no esta afiliado a la UDLAP', () => {
  assert.ok(CONTENIDO.texto.includes('no está afiliada'));
  assert.ok(CONTENIDO.html.includes('no está afiliada'));
});

// --- Politica de reintento

test('429, 408 y 5xx se reintentan; el resto de 4xx no', () => {
  for (const estado of [429, 408, 500, 502, 503]) {
    assert.equal(esReintentable(estado), true, `${estado} deberia reintentarse`);
  }
  for (const estado of [400, 401, 403, 404, 422]) {
    assert.equal(esReintentable(estado), false, `${estado} no se arregla esperando`);
  }
});

test('la espera entre intentos crece exponencialmente', () => {
  assert.equal(esperaMs(1), 400);
  assert.equal(esperaMs(2), 800);
  assert.equal(esperaMs(3), 1600);
});

// --- Envio

test('un envio exitoso devuelve el id y el numero de intentos', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 200, body: { id: 'msg_1' } }]);
  const r = await enviarConResend({ ...base, fetchImpl: impl });

  assert.equal(r.id, 'msg_1');
  assert.equal(r.intentos, 1);
  assert.equal(llamadas.length, 1);
});

test('manda html y texto juntos, y el destinatario como arreglo', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 200, body: { id: 'm' } }]);
  await enviarConResend({ ...base, fetchImpl: impl });

  const cuerpo = JSON.parse(String(llamadas[0]!.init.body));
  assert.deepEqual(cuerpo.to, ['alguien@udlap.mx']);
  assert.ok(cuerpo.html.length > 0);
  assert.ok(cuerpo.text.length > 0);
});

test('todos los intentos comparten Idempotency-Key: no se manda dos veces', async () => {
  const { impl, llamadas } = fetchFalso([
    { status: 503 },
    { status: 200, body: { id: 'm' } },
  ]);
  await enviarConResend({ ...base, fetchImpl: impl });

  assert.equal(llamadas.length, 2);
  const claves = llamadas.map(
    (l) => (l.init.headers as Record<string, string>)['Idempotency-Key'],
  );
  assert.deepEqual(claves, ['clave-1', 'clave-1']);
});

test('un 503 se reintenta y termina bien', async () => {
  const { impl } = fetchFalso([{ status: 503 }, { status: 200, body: { id: 'm' } }]);
  const r = await enviarConResend({ ...base, fetchImpl: impl });
  assert.equal(r.intentos, 2);
});

test('un 401 falla de inmediato: una llave mal no se arregla esperando', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 401 }, { status: 200, body: { id: 'm' } }]);

  await assert.rejects(
    () => enviarConResend({ ...base, fetchImpl: impl }),
    (e: unknown) => e instanceof ErrorCorreo && e.estado === 401 && !e.reintentable,
  );
  assert.equal(llamadas.length, 1, 'no debe haber segundo intento');
});

test('un 422 tampoco se reintenta: es el dominio sin verificar', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 422 }]);
  await assert.rejects(() => enviarConResend({ ...base, fetchImpl: impl }));
  assert.equal(llamadas.length, 1);
});

test('agotados los intentos, se rinde con el ultimo error', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 500 }, { status: 500 }, { status: 500 }]);

  await assert.rejects(
    () => enviarConResend({ ...base, fetchImpl: impl }),
    (e: unknown) => e instanceof ErrorCorreo && e.estado === 500,
  );
  assert.equal(llamadas.length, 3);
});

test('un fallo de red se reintenta', async () => {
  let llamadas = 0;
  const impl = (async () => {
    llamadas += 1;
    if (llamadas === 1) throw new Error('ECONNRESET');
    return { ok: true, status: 200, json: async () => ({ id: 'm' }), text: async () => '' };
  }) as unknown as typeof fetch;

  const r = await enviarConResend({ ...base, fetchImpl: impl });
  assert.equal(r.intentos, 2);
});

test('sin llave o sin remitente no se intenta siquiera', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 200 }]);
  await assert.rejects(() => enviarConResend({ ...base, apiKey: '', fetchImpl: impl }), /RESEND_API_KEY/);
  await assert.rejects(() => enviarConResend({ ...base, from: '', fetchImpl: impl }), /MAIL_FROM/);
  assert.equal(llamadas.length, 0);
});

// --- Remitente

test('separa "Nombre <buzon@dominio>" en sus dos partes', () => {
  assert.deepEqual(separarRemitente('Ágora <hola@ejemplo.mx>'), {
    nombre: 'Ágora',
    email: 'hola@ejemplo.mx',
  });
});

test('acepta un buzon pelon, sin nombre', () => {
  assert.deepEqual(separarRemitente('hola@ejemplo.mx'), {
    nombre: null,
    email: 'hola@ejemplo.mx',
  });
});

test('quita las comillas que la gente pone alrededor del nombre', () => {
  assert.equal(separarRemitente('"Ágora" <hola@ejemplo.mx>').nombre, 'Ágora');
});

// --- Brevo

test('Brevo recibe el remitente partido en name y email', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 201, body: { messageId: 'br_1' } }]);
  const r = await enviarCorreo('brevo', { ...base, fetchImpl: impl });

  assert.equal(r.id, 'br_1');
  assert.equal(r.proveedor, 'brevo');

  const cuerpo = JSON.parse(String(llamadas[0]!.init.body));
  assert.deepEqual(cuerpo.sender, { name: 'Agora', email: 'hola@ejemplo.mx' });
  assert.deepEqual(cuerpo.to, [{ email: 'alguien@udlap.mx' }]);
  assert.ok(cuerpo.htmlContent.length > 0);
  assert.ok(cuerpo.textContent.length > 0);
});

test('Brevo autentica con la cabecera api-key, no con Bearer', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 201, body: { messageId: 'm' } }]);
  await enviarCorreo('brevo', { ...base, fetchImpl: impl });

  const headers = llamadas[0]!.init.headers as Record<string, string>;
  assert.equal(headers['api-key'], 'llave-de-prueba');
  assert.equal(headers.authorization, undefined);
  assert.ok(llamadas[0]!.url.includes('api.brevo.com'));
});

test('la politica de reintentos es la misma en Brevo', async () => {
  const { impl } = fetchFalso([{ status: 503 }, { status: 201, body: { messageId: 'm' } }]);
  const r = await enviarCorreo('brevo', { ...base, fetchImpl: impl });
  assert.equal(r.intentos, 2);
});

test('un 401 de Brevo tampoco se reintenta', async () => {
  const { impl, llamadas } = fetchFalso([{ status: 401 }, { status: 201 }]);
  await assert.rejects(() => enviarCorreo('brevo', { ...base, fetchImpl: impl }));
  assert.equal(llamadas.length, 1);
});

test('sin llave, el error nombra la variable del proveedor correcto', async () => {
  const { impl } = fetchFalso([{ status: 200 }]);
  await assert.rejects(
    () => enviarCorreo('brevo', { ...base, apiKey: '', fetchImpl: impl }),
    /BREVO_API_KEY/,
  );
  await assert.rejects(
    () => enviarCorreo('resend', { ...base, apiKey: '', fetchImpl: impl }),
    /RESEND_API_KEY/,
  );
});

test('la llave nunca aparece en el mensaje de error', async () => {
  const { impl } = fetchFalso([{ status: 401, body: { message: 'API key is invalid' } }]);
  await assert.rejects(
    () => enviarConResend({ ...base, apiKey: 'secreto-que-no-debe-filtrarse', fetchImpl: impl }),
    (e: unknown) => e instanceof Error && !e.message.includes('secreto-que-no-debe-filtrarse'),
  );
});
