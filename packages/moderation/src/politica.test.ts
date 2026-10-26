import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import type Anthropic from '@anthropic-ai/sdk';

import { DECISIONES, LINEAS_ROJAS, esClasificacion, veredictoDe } from './politica.js';
import { masSevero, moderarContenido, moderarImagen, moderarTexto } from './cliente.js';

/**
 * La prueba mas importante del producto.
 *
 * Si la critica legitima se bloquea, Agora esta roto: se afina la politica, no
 * el discurso. Estos casos son el contrato con el usuario. Lo que el modelo
 * entiende de cada texto se mide en `eval/` contra la API real; aqui se prueba
 * sin red lo que hace el codigo con su respuesta.
 */

const respuesta = (
  json: unknown,
  stop_reason: Anthropic.Message['stop_reason'] = 'end_turn',
): Anthropic.Message =>
  ({
    id: 'msg_prueba',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-5-5',
    content: [{ type: 'text', text: typeof json === 'string' ? json : JSON.stringify(json) }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  }) as unknown as Anthropic.Message;

// --- La politica: de la clasificacion al veredicto.

test('lo que el clasificador manda publicar se publica sin mas', () => {
  const v = veredictoDe({ decision: 'publicar', linea_roja: 'ninguna', razon: 'Critica a un profesor.' });
  assert.equal(v.decision, DECISIONES.PUBLICAR);
  assert.equal(v.motivo, undefined);
});

test('revisar publica igual y encola, con la razon para quien modera', () => {
  const v = veredictoDe({ decision: 'revisar', linea_roja: 'ninguna', razon: 'Insulto a una persona.' });
  assert.equal(v.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
  assert.equal(v.razonIA, 'Insulto a una persona.');
});

test('retirar con linea roja retira y explica al autor por que', () => {
  const v = veredictoDe({
    decision: 'retirar',
    linea_roja: LINEAS_ROJAS.INTIMIDAD_SEXUAL,
    razon: 'Foto intima sin consentimiento.',
  });
  assert.equal(v.decision, DECISIONES.RETIRAR);
  assert.equal(v.lineaRoja, LINEAS_ROJAS.INTIMIDAD_SEXUAL);
  assert.match(v.motivo ?? '', /Ley Olimpia/);
});

test('toda linea roja trae motivo visible: sin motivo no hay apelacion', () => {
  for (const linea of Object.values(LINEAS_ROJAS)) {
    const v = veredictoDe({ decision: 'retirar', linea_roja: linea, razon: '' });
    assert.equal(v.decision, DECISIONES.RETIRAR);
    assert.ok(v.motivo && v.motivo.length > 0, `sin motivo: ${linea}`);
    assert.equal(v.razonIA, undefined);
  }
});

test('retirar sin decir que linea roja no borra nada: pasa a revision', () => {
  const v = veredictoDe({ decision: 'retirar', linea_roja: 'ninguna', razon: 'Grosero.' });
  assert.equal(v.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
});

test('solo se acepta una clasificacion completa y con valores del esquema', () => {
  assert.ok(esClasificacion({ decision: 'publicar', linea_roja: 'ninguna', razon: '' }));
  assert.ok(esClasificacion({ decision: 'retirar', linea_roja: 'suplantacion', razon: 'x' }));
  assert.ok(!esClasificacion(null));
  assert.ok(!esClasificacion({ decision: 'borrar', linea_roja: 'ninguna', razon: '' }));
  assert.ok(!esClasificacion({ decision: 'retirar', linea_roja: 'spam', razon: '' }));
  assert.ok(!esClasificacion({ decision: 'publicar', linea_roja: 'ninguna' }));
});

// --- El cliente: la peticion que sale y la respuesta que vuelve.

test('la peticion va a Haiku, sin thinking, con la politica en cache y el contenido aparte', async () => {
  let cuerpo: Anthropic.MessageCreateParamsNonStreaming | undefined;
  let opciones: Anthropic.RequestOptions | undefined;
  await moderarContenido(
    { texto: 'el de Calculo es un inutil', imagenes: ['https://cdn.example/x.webp'] },
    {
      tipo: 'comentario',
      crear: async (c, o) => {
        cuerpo = c;
        opciones = o;
        return respuesta({ decision: 'publicar', linea_roja: 'ninguna', razon: '' });
      },
    },
  );

  assert.ok(cuerpo);
  assert.equal(cuerpo.model, 'claude-haiku-5-5');
  assert.deepEqual(cuerpo.thinking, { type: 'disabled' });
  assert.equal(cuerpo.output_config?.effort, 'low');
  assert.equal(cuerpo.output_config?.format?.type, 'json_schema');
  assert.ok(!('temperature' in cuerpo), 'sin temperature en modelos 5.5');

  const system = cuerpo.system as Anthropic.TextBlockParam[];
  assert.deepEqual(system[0]?.cache_control, { type: 'ephemeral' });

  const contenido = cuerpo.messages[0]?.content as Anthropic.ContentBlockParam[];
  assert.deepEqual(contenido[0], { type: 'image', source: { type: 'url', url: 'https://cdn.example/x.webp' } });
  assert.deepEqual(contenido[1], {
    type: 'text',
    text: 'Tipo: comentario\n<contenido>\nel de Calculo es un inutil\n</contenido>',
  });

  assert.equal(opciones?.timeout, 8000);
  assert.deepEqual(opciones?.headers, { 'x-proceso': 'agora-moderar-comentario' });
});

test('una respuesta valida se traduce al veredicto de la politica', async () => {
  const v = await moderarTexto('te espero a la salida', {
    crear: async () =>
      respuesta({ decision: 'retirar', linea_roja: 'amenaza_violencia', razon: 'Amenaza directa.' }),
  });
  assert.equal(v.decision, DECISIONES.RETIRAR);
  assert.equal(v.lineaRoja, LINEAS_ROJAS.AMENAZA_VIOLENCIA);
});

test('una imagen sola sale como bloque de imagen por URL', async () => {
  let contenido: Anthropic.ContentBlockParam[] = [];
  await moderarImagen('https://cdn.example/y.webp', {
    crear: async (c) => {
      contenido = c.messages[0]?.content as Anthropic.ContentBlockParam[];
      return respuesta({ decision: 'publicar', linea_roja: 'ninguna', razon: '' });
    },
  });
  assert.deepEqual(contenido[0], { type: 'image', source: { type: 'url', url: 'https://cdn.example/y.webp' } });
});

test('sin texto ni imagenes no se llama a nadie', async () => {
  let llamadas = 0;
  const v = await moderarContenido(
    { texto: '   ' },
    {
      crear: async () => {
        llamadas++;
        return respuesta({ decision: 'retirar', linea_roja: 'suplantacion', razon: '' });
      },
    },
  );
  assert.equal(v.decision, DECISIONES.PUBLICAR);
  assert.equal(llamadas, 0);
});

// --- Degradacion: un proveedor caido no puede convertirse en censura.

test('si la API falla, el contenido se publica y se encola', async () => {
  const v = await moderarTexto('lo que sea', {
    crear: async () => {
      throw new Error('red caida');
    },
  });
  assert.equal(v.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
});

test('si responde algo que no es el esquema, tampoco se bloquea al usuario', async () => {
  for (const malo of ['no es json', { decision: 'borrar' }, '']) {
    const v = await moderarTexto('lo que sea', { crear: async () => respuesta(malo) });
    assert.equal(v.decision, DECISIONES.PUBLICAR_Y_ENCOLAR, `con ${JSON.stringify(malo)}`);
  }
});

test('si se corta por max_tokens, se encola en vez de leer un JSON a medias', async () => {
  const v = await moderarTexto('lo que sea', {
    crear: async () =>
      respuesta({ decision: 'retirar', linea_roja: 'acoso_dirigido', razon: '' }, 'max_tokens'),
  });
  assert.equal(v.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
});

test('si el modelo se niega a clasificarlo, lo ve una persona', async () => {
  const v = await moderarTexto('lo que sea', { crear: async () => respuesta('', 'refusal') });
  assert.equal(v.decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
  assert.ok(v.razonIA);
});

test('de varios veredictos gana el mas severo', () => {
  const publicar = { decision: DECISIONES.PUBLICAR };
  const revisar = { decision: DECISIONES.PUBLICAR_Y_ENCOLAR, motivo: 'r' };
  const retirar = { decision: DECISIONES.RETIRAR, motivo: 'x' };
  assert.equal(masSevero([]).decision, DECISIONES.PUBLICAR);
  assert.equal(masSevero([publicar, revisar]).decision, DECISIONES.PUBLICAR_Y_ENCOLAR);
  assert.equal(masSevero([revisar, retirar, publicar]).decision, DECISIONES.RETIRAR);
});
