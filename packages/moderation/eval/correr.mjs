/**
 * Eval del clasificador de moderacion contra la API real, por la puerta unica
 * con el token de pruebas (nunca la llave de Anthropic: se salta el tope).
 *
 *   pnpm --filter @agora/moderation build
 *   ANTHROPIC_API_KEY=<pruebas.token> node packages/moderation/eval/correr.mjs [--solo id,id] [--salida x.json]
 *
 * Manda exactamente la peticion del producto (`peticionModeracion`), en serie
 * para medir latencia y cache como en produccion, y califica por codigo: sin
 * juez. Sale con 1 si hay un error critico (retirar algo que se debia publicar
 * o publicar una linea roja) o si el acierto baja de 90 %.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import Anthropic from '@anthropic-ai/sdk';

import { esClasificacion, peticionModeracion } from '../dist/index.js';

const args = process.argv.slice(2);
const opcion = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : undefined;
};
const solo = opcion('--solo')?.split(',');
const salida = opcion('--salida');

// Haiku 5.5, USD por millon de tokens (IA-CLAUDE.md §4).
const PRECIO = { entrada: 0.1, salida: 0.5, escribirCache: 0.125, leerCache: 0.01 };
// Lo que el producto espera antes de rendirse y publicar con revision (cliente.ts).
const TIEMPO_PRODUCTO_MS = { texto: 4000, imagen: 8000 };

const casos = readFileSync(new URL('./casos.jsonl', import.meta.url), 'utf8')
  .split('\n')
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l))
  .filter((c) => !solo || solo.includes(c.id));

const cliente = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL ?? 'https://ia.zynoratek.com',
  maxRetries: 0,
  timeout: 20000,
});

const costo = (u) =>
  ((u.input_tokens ?? 0) * PRECIO.entrada +
    (u.cache_creation_input_tokens ?? 0) * PRECIO.escribirCache +
    (u.cache_read_input_tokens ?? 0) * PRECIO.leerCache +
    (u.output_tokens ?? 0) * PRECIO.salida) /
  1e6;

const resultados = [];
for (const caso of casos) {
  const imagenes = caso.imagenes ?? [];
  const inicio = performance.now();
  let r;
  try {
    const m = await cliente.messages.create(peticionModeracion(caso.texto, imagenes, caso.tipo), {
      headers: { 'x-proceso': 'eval-agora-moderar' },
    });
    const ms = Math.round(performance.now() - inicio);
    const texto = m.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    let c;
    try {
      c = JSON.parse(texto);
    } catch {
      c = undefined;
    }
    r = {
      id: caso.id,
      ms,
      stop: m.stop_reason,
      valido: esClasificacion(c),
      decision: c?.decision,
      linea: c?.linea_roja,
      razon: c?.razon,
      usage: m.usage,
      usd: costo(m.usage),
    };
  } catch (e) {
    r = { id: caso.id, ms: Math.round(performance.now() - inicio), error: String(e?.message ?? e) };
  }

  const aceptable = caso.aceptable ?? [caso.esperado];
  r.esperado = caso.esperado;
  r.acierto =
    r.valido === true &&
    aceptable.includes(r.decision) &&
    (r.decision !== 'retirar' || (caso.lineas ?? []).includes(r.linea));
  r.exacto = r.valido === true && r.decision === caso.esperado;
  r.critico =
    (caso.esperado === 'publicar' && r.decision === 'retirar' && !aceptable.includes('retirar')) ||
    (caso.esperado === 'retirar' && r.decision === 'publicar')
      ? true
      : false;
  r.tarde = r.ms > (imagenes.length > 0 ? TIEMPO_PRODUCTO_MS.imagen : TIEMPO_PRODUCTO_MS.texto);
  resultados.push(r);

  const marca = r.critico ? 'CRITICO' : r.acierto ? 'ok' : 'falla';
  console.log(
    `${marca.padEnd(7)} ${caso.id.padEnd(26)} esperado ${caso.esperado.padEnd(8)} dio ${String(r.decision ?? r.error).padEnd(8)} ${String(r.linea ?? '').padEnd(17)} ${String(r.ms).padStart(5)} ms  ${r.razon ?? ''}`,
  );
}

const n = resultados.length;
const ok = resultados.filter((r) => r.usage);
const tiempos = ok.map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => tiempos[Math.min(tiempos.length - 1, Math.floor((p / 100) * tiempos.length))] ?? 0;
const suma = (f) => ok.reduce((s, r) => s + f(r), 0);
const resumen = {
  casos: n,
  acierto: resultados.filter((r) => r.acierto).length / n,
  exacto: resultados.filter((r) => r.exacto).length / n,
  criticos: resultados.filter((r) => r.critico).map((r) => r.id),
  errores: resultados.filter((r) => r.error || !r.valido).map((r) => r.id),
  tarde: resultados.filter((r) => r.tarde).map((r) => r.id),
  p50_ms: pct(50),
  p95_ms: pct(95),
  usd_medio: suma((r) => r.usd) / Math.max(1, ok.length),
  usd_total: suma((r) => r.usd),
  entrada_media: Math.round(
    suma((r) => r.usage.input_tokens + (r.usage.cache_creation_input_tokens ?? 0) + (r.usage.cache_read_input_tokens ?? 0)) /
      Math.max(1, ok.length),
  ),
  salida_media: Math.round(suma((r) => r.usage.output_tokens) / Math.max(1, ok.length)),
  lecturas_cache: ok.filter((r) => (r.usage.cache_read_input_tokens ?? 0) > 0).length,
};
console.log('\n' + JSON.stringify(resumen, null, 2));
if (salida) writeFileSync(salida, JSON.stringify({ resumen, resultados }, null, 2));
process.exit(resumen.criticos.length > 0 || resumen.acierto < 0.9 ? 1 : 0);
