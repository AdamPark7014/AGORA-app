#!/usr/bin/env node
/**
 * Exporta og.png e iconos PWA desde SVG (sharp vía dependencia de Next).
 * Uso: node scripts/export-brand-assets.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'apps/web/public');

async function svgToPng(svgPath, outPath, width, height) {
  const svg = readFileSync(svgPath);
  await sharp(svg, { density: 300 })
    .resize(width, height, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`✓ ${outPath.replace(root + '/', '')}`);
}

await svgToPng(join(publicDir, 'og.svg'), join(publicDir, 'og.png'), 1200, 630);
await svgToPng(join(publicDir, 'icono.svg'), join(publicDir, 'icono-192.png'), 192, 192);
await svgToPng(join(publicDir, 'icono.svg'), join(publicDir, 'icono-512.png'), 512, 512);

const icoSvg = readFileSync(join(publicDir, 'icono.svg'));
await sharp(icoSvg, { density: 300 })
  .resize(48, 48)
  .png()
  .toFile(join(publicDir, 'favicon.ico'));
console.log('✓ apps/web/public/favicon.ico');

console.log('Assets de marca exportados.');
