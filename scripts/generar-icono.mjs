#!/usr/bin/env node
/**
 * Fuente única del ícono de Ágora: la pirámide de Cholula.
 *
 * Genera todo el set desde la misma geometría, para que web, Android e iOS no
 * se desincronicen nunca:
 *
 *   apps/web/public/icono.svg, icono-maskable.svg, icono-192/512.png,
 *     icono-maskable-512.png, apple-touch-icon.png, favicon.ico, og.svg, og.png
 *   apps/mobile-native/android/.../res/drawable/ic_launcher_background.xml,
 *     ic_launcher_foreground.xml (también el monocromo), agora_isotipo.xml,
 *     ic_notification.xml
 *   apps/mobile-native/ios/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png,
 *     Isotipo.imageset/Isotipo.svg
 *
 * Uso:  node scripts/generar-icono.mjs [--concepto mono|cristal|noche|amanecer] [--salida <dir>]
 *   --salida escribe el set en otra carpeta (para previsualizar sin tocar el repo).
 *
 * Los PNG llevan sombra suave; los vectores de Android e iOS no (sus
 * formatos no admiten filtros), por eso cada concepto define su glifo "plano".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

/** El concepto elegido. Cambiar aquí y volver a correr el script. */
const CONCEPTO_ACTUAL = 'mono';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const leer = (nombre, porOmision) => {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] ? args[i + 1] : porOmision;
};
const concepto = leer('--concepto', CONCEPTO_ACTUAL);
const salida = leer('--salida', raiz);

// ---------------------------------------------------------------------------
// Geometría (lienzo de 1024)
// ---------------------------------------------------------------------------

/** Pirámide escalonada: `tiers` gradas de alto `h`, cada una `inset` más angosta por lado. */
function piramide(base, w, tiers, h, inset, cx = 512) {
  const x0 = cx - w / 2;
  let d = `M${x0} ${base}`;
  for (let k = 1; k <= tiers; k++) {
    const x = x0 + inset * (k - 1);
    d += ` V${base - k * h}`;
    if (k < tiers) d += ` H${x + inset}`;
  }
  d += ` H${cx + w / 2 - inset * (tiers - 1)}`;
  for (let k = tiers; k >= 1; k--) {
    const x = cx + w / 2 - inset * (k - 1);
    d += ` V${base - (k - 1) * h}`;
    if (k > 1) d += ` H${x + inset}`;
  }
  return d + ' Z';
}

/** 640 → 528 → 416 → 304 → 192 de ancho, 540 de alto (y 252..792). */
const P = piramide(792, 640, 5, 108, 56);
/** Esquinas suavizadas: trazo del mismo color con uniones redondas. */
const SUAVE = 'stroke-width="22" stroke-linejoin="round"';
/** Esquina del "squircle" en 1024 (22.5 %, como iOS). */
const RX = 230;
const SOMBRA = `<filter id="sh" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="26" flood-color="#6E1C00" flood-opacity="0.38"/></filter>`;

/**
 * Cada concepto: degradados (`defs`), fondo y glifo. `glifo(plano)` sin
 * filtros para Android/iOS. `android` describe lo mismo en vector drawable.
 */
const CONCEPTOS = {
  mono: {
    nombre: 'Mono',
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8F4C"/><stop offset="1" stop-color="#E64A0A"/></linearGradient>
      <linearGradient id="sym" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FFE3CB"/></linearGradient>`,
    fondo: () => `<rect width="1024" height="1024" fill="url(#bg)"/>`,
    glifo: (plano) =>
      `<path d="${P}" fill="url(#sym)" stroke="url(#sym)" ${SUAVE}${plano ? '' : ' filter="url(#sh)"'}/>`,
    android: {
      fondo: [grad('linear', [['0', '#FFFF8F4C'], ['1', '#FFE64A0A']], { x: 54, y0: 0, y1: 108 })],
      glifo: (v) => [
        vpath(P, {
          fill: grad('linear', [['0', '#FFFFFFFF'], ['1', '#FFFFE3CB']], v.vertical(252, 792)),
          stroke: grad('linear', [['0', '#FFFFFFFF'], ['1', '#FFFFE3CB']], v.vertical(252, 792)),
        }),
      ],
      tema: '#FFE64A0A',
    },
  },
  cristal: {
    nombre: 'Cristal',
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A58"/><stop offset="1" stop-color="#DF470C"/></linearGradient>
      <radialGradient id="halo" cx="0.5" cy="0.44" r="0.4"><stop offset="0" stop-color="#FFF4E3" stop-opacity="0.55"/><stop offset="1" stop-color="#FFF4E3" stop-opacity="0"/></radialGradient>
      <linearGradient id="vidrio" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.42"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.16"/></linearGradient>
      <linearGradient id="borde" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.95"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.35"/></linearGradient>`,
    fondo: () => `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#halo)"/>`,
    glifo: (plano) =>
      `<circle cx="512" cy="400" r="150" fill="#FFF4E3"/>
      <path d="${P}" fill="url(#vidrio)" stroke="url(#borde)" stroke-width="12" stroke-linejoin="round"${plano ? '' : ' filter="url(#sh)"'}/>`,
    android: {
      fondo: [
        grad('linear', [['0', '#FFFF9A58'], ['1', '#FFDF470C']], { x: 54, y0: 0, y1: 108 }),
        grad('radial', [['0', '#8CFFF4E3'], ['1', '#00FFF4E3']], { cx: 54, cy: 47.5, r: 43 }),
      ],
      glifo: (v) => [
        `<path android:fillColor="#FFFFF4E3" android:pathData="${circulo(512, 400, 150)}"/>`,
        vpath(P, {
          fill: grad('linear', [['0', '#6BFFFFFF'], ['1', '#29FFFFFF']], v.vertical(252, 792)),
          stroke: grad('linear', [['0', '#F2FFFFFF'], ['1', '#59FFFFFF']], v.vertical(252, 792)),
          strokeWidth: 12,
        }),
      ],
      tema: '#FFDF470C',
    },
  },
  noche: {
    nombre: 'Noche',
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232326"/><stop offset="1" stop-color="#0C0C0E"/></linearGradient>
      <linearGradient id="sym" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFA45E"/><stop offset="1" stop-color="#E6480A"/></linearGradient>
      <radialGradient id="luz" cx="0.5" cy="0.62" r="0.5"><stop offset="0" stop-color="#FF7A2E" stop-opacity="0.45"/><stop offset="1" stop-color="#FF7A2E" stop-opacity="0"/></radialGradient>
      <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="0.6" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`,
    fondo: () => `<rect width="1024" height="1024" fill="url(#bg)"/><rect width="1024" height="1024" fill="url(#luz)"/>`,
    glifo: () =>
      `<path d="${P}" fill="url(#sym)" stroke="url(#sym)" ${SUAVE}/>
      <path d="${P}" fill="none" stroke="url(#rim)" stroke-width="8" stroke-linejoin="round"/>`,
    android: {
      fondo: [
        grad('linear', [['0', '#FF232326'], ['1', '#FF0C0C0E']], { x: 54, y0: 0, y1: 108 }),
        grad('radial', [['0', '#73FF7A2E'], ['1', '#00FF7A2E']], { cx: 54, cy: 67, r: 54 }),
      ],
      glifo: (v) => [
        vpath(P, {
          fill: grad('linear', [['0', '#FFFFA45E'], ['1', '#FFE6480A']], v.vertical(252, 792)),
          stroke: grad('linear', [['0', '#FFFFA45E'], ['1', '#FFE6480A']], v.vertical(252, 792)),
        }),
        vpath(P, {
          stroke: grad('linear', [['0', '#8CFFFFFF'], ['0.6', '#00FFFFFF']], v.vertical(252, 792)),
          strokeWidth: 8,
        }),
      ],
      tema: '#FF0C0C0E',
    },
  },
  amanecer: {
    nombre: 'Amanecer',
    defs: `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD28F"/><stop offset="0.55" stop-color="#FF8A3C"/><stop offset="1" stop-color="#E04A0C"/></linearGradient>
      <radialGradient id="sol" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFFBF2"/><stop offset="0.55" stop-color="#FFF4DE"/><stop offset="1" stop-color="#FFF4DE" stop-opacity="0"/></radialGradient>
      <linearGradient id="roca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4A2416"/><stop offset="1" stop-color="#20100A"/></linearGradient>
      <linearGradient id="rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.45"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>`,
    fondo: () => `<rect width="1024" height="1024" fill="url(#bg)"/>`,
    glifo: (plano) =>
      `<circle cx="512" cy="400" r="260" fill="url(#sol)"/>
      <circle cx="512" cy="400" r="140" fill="#FFFBF2"/>
      <path d="${P}" fill="url(#roca)" stroke="url(#roca)" ${SUAVE}${plano ? '' : ' filter="url(#sh)"'}/>
      <path d="${P}" fill="none" stroke="url(#rim)" stroke-width="10" stroke-linejoin="round"/>`,
    android: {
      fondo: [grad('linear', [['0', '#FFFFD28F'], ['0.55', '#FFFF8A3C'], ['1', '#FFE04A0C']], { x: 54, y0: 0, y1: 108 })],
      glifo: (v) => [
        `<path android:pathData="${circulo(512, 400, 260)}">${grad('radial', [['0', '#FFFFFBF2'], ['0.55', '#FFFFF4DE'], ['1', '#00FFF4DE']], v.radial(512, 400, 260), 'fillColor')}</path>`,
        `<path android:fillColor="#FFFFFBF2" android:pathData="${circulo(512, 400, 140)}"/>`,
        vpath(P, {
          fill: grad('linear', [['0', '#FF4A2416'], ['1', '#FF20100A']], v.vertical(252, 792)),
          stroke: grad('linear', [['0', '#FF4A2416'], ['1', '#FF20100A']], v.vertical(252, 792)),
        }),
        vpath(P, {
          stroke: grad('linear', [['0', '#73FFFFFF'], ['0.5', '#00FFFFFF']], v.vertical(252, 792)),
          strokeWidth: 10,
        }),
      ],
      tema: '#FFE04A0C',
    },
  },
};

const C = CONCEPTOS[concepto];
if (!C) {
  console.error(`Concepto desconocido: ${concepto}. Usa ${Object.keys(CONCEPTOS).join(', ')}.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// SVG
// ---------------------------------------------------------------------------

/**
 * `squircle`: esquinas redondeadas, el ícono tal cual (favicon, PWA "any",
 * Isotipo). `maskable`: a sangre y glifo al 80 %, para que Android/iOS lo
 * recorten como quieran. `plano`: sin filtros (vectores nativos).
 */
function svg({ variante = 'squircle', plano = false } = {}) {
  const forma = variante === 'maskable' ? '' : ` rx="${RX}"`;
  const escala = variante === 'maskable' ? ' transform="translate(512 512) scale(0.8) translate(-512 -512)"' : '';
  // El vector de iOS (plano) evita clipPath: el importador de Xcode admite un
  // subconjunto de SVG; las esquinas van en los propios rectángulos del fondo.
  const fondo = plano ? C.fondo().replaceAll('<rect width="1024" height="1024"', `<rect width="1024" height="1024"${forma}`) : C.fondo();
  const abre = plano ? '<g>' : '<g clip-path="url(#forma)">';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <!-- Ícono de Ágora: la pirámide de Cholula (${C.nombre}). Generado por scripts/generar-icono.mjs; no editar a mano. -->
  <title>Ágora</title>
  <defs>
    ${plano ? '' : `<clipPath id="forma"><rect width="1024" height="1024"${forma}/></clipPath>`}
    ${C.defs}
    ${plano ? '' : SOMBRA}
  </defs>
  ${abre}
    ${fondo}
    <g${escala}>${C.glifo(plano)}</g>
  </g>
</svg>
`;
}

function og() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="Ágora - la red de la UDLAP">
  <!-- Generado por scripts/generar-icono.mjs; no editar a mano. -->
  <defs>
    <linearGradient id="ogbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1210"/>
      <stop offset="0.55" stop-color="#16191d"/>
      <stop offset="1" stop-color="#1e2227"/>
    </linearGradient>
    <radialGradient id="ogglow" cx="50%" cy="0%" r="70%">
      <stop offset="0" stop-color="#e35205" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#e35205" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="forma"><rect width="1024" height="1024" rx="${RX}"/></clipPath>
    ${C.defs}
    ${SOMBRA}
  </defs>
  <rect width="1200" height="630" fill="url(#ogbg)"/>
  <rect width="1200" height="630" fill="url(#ogglow)"/>
  <g transform="translate(96 170) scale(0.13672)">
    <g clip-path="url(#forma)">${C.fondo()}<g>${C.glifo(false)}</g></g>
  </g>
  <text x="264" y="248" fill="#f7f8f9" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="92" font-weight="800" letter-spacing="-3">&#193;gora</text>
  <text x="268" y="308" fill="#9aa4af" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="36" font-weight="500">La red de la UDLAP</text>
  <text x="96" y="480" fill="#6e7883" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="28">Solo con correo @udlap.mx &#183; Proyecto independiente</text>
  <text x="96" y="528" fill="#565f69" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="24">Developed by Zynora Tek</text>
</svg>
`;
}

// ---------------------------------------------------------------------------
// Android (vector drawable)
// ---------------------------------------------------------------------------

/** Círculo como pathData (los vectores no tienen <circle>). */
function circulo(cx, cy, r) {
  return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

/** Degradado como <aapt:attr>. `geo` trae las coordenadas en el viewport del vector. */
function grad(tipo, paradas, geo, atributo = 'fillColor') {
  const items = paradas.map(([o, c]) => `<item android:offset="${o}" android:color="${c}"/>`).join('');
  const coords =
    tipo === 'radial'
      ? `android:centerX="${geo.cx}" android:centerY="${geo.cy}" android:gradientRadius="${geo.r}"`
      : `android:startX="${geo.x}" android:startY="${geo.y0}" android:endX="${geo.x}" android:endY="${geo.y1}"`;
  return `<aapt:attr name="android:${atributo}"><gradient android:type="${tipo}" ${coords}>${items}</gradient></aapt:attr>`;
}

/** Un <path> con relleno/trazo (color plano o degradado) y uniones redondas. */
function vpath(d, { fill, stroke, strokeWidth = 22 }) {
  const attrs = [`android:pathData="${d}"`];
  const hijos = [];
  if (fill) {
    if (fill.startsWith('<aapt')) hijos.push(fill);
    else attrs.push(`android:fillColor="${fill}"`);
  }
  if (stroke) {
    attrs.push(`android:strokeWidth="${strokeWidth}"`, `android:strokeLineJoin="round"`);
    if (stroke.startsWith('<aapt')) hijos.push(stroke.replace('android:fillColor', 'android:strokeColor'));
    else attrs.push(`android:strokeColor="${stroke}"`);
  }
  return hijos.length ? `<path ${attrs.join(' ')}>${hijos.join('')}</path>` : `<path ${attrs.join(' ')}/>`;
}

/** Fondo del adaptativo: fondo en el viewport de 108dp directamente. */
function fondoAndroid() {
  const capas = C.android.fondo
    .map((g) => `<path android:pathData="M0,0h108v108h-108z">${g}</path>`)
    .join('\n    ');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Fondo del ícono adaptativo (${C.nombre}). Generado por scripts/generar-icono.mjs; no editar a mano. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    ${capas}
</vector>
`;
}

/**
 * Glifo en un grupo escalado: el lienzo de 1024 cabe en la zona segura de
 * 66dp del adaptativo (centro 54dp, escala 0.8 como el maskable). Los
 * degradados se expresan en coordenadas del lienzo de 1024 porque van
 * dentro del grupo.
 */
function capaGlifo(ancho, escala, tx, ty) {
  const v = {
    vertical: (y0, y1) => ({ x: 512, y0, y1 }),
    radial: (cx, cy, r) => ({ cx, cy, r }),
  };
  return `<group android:scaleX="${escala}" android:scaleY="${escala}" android:translateX="${tx}" android:translateY="${ty}">
        ${C.android.glifo(v).join('\n        ')}
    </group>`;
}

function foregroundAndroid() {
  const escala = (108 / 1024) * 0.8;
  const t = 54 - 512 * escala;
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Glifo del ícono adaptativo y monocromo (${C.nombre}). Generado por scripts/generar-icono.mjs; no editar a mano. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    ${capaGlifo(108, escala.toFixed(6), t.toFixed(4), t.toFixed(4))}
</vector>
`;
}

/** El ícono completo (fondo + glifo) con esquinas redondeadas, para la marca dentro de la app. */
function isotipoAndroid() {
  const redondeado = `M${RX} 0 H${1024 - RX} A${RX} ${RX} 0 0 1 1024 ${RX} V${1024 - RX} A${RX} ${RX} 0 0 1 ${1024 - RX} 1024 H${RX} A${RX} ${RX} 0 0 1 0 ${1024 - RX} V${RX} A${RX} ${RX} 0 0 1 ${RX} 0 Z`;
  const v = {
    vertical: (y0, y1) => ({ x: 512, y0, y1 }),
    radial: (cx, cy, r) => ({ cx, cy, r }),
  };
  // Los degradados del fondo están en el viewport de 108: se reescalan a 1024.
  const fondo = C.android.fondo
    .map((g) =>
      g
        .replace(/android:startX="[^"]+" android:startY="([^"]+)" android:endX="[^"]+" android:endY="([^"]+)"/, (m, y0, y1) => `android:startX="512" android:startY="${(y0 / 108) * 1024}" android:endX="512" android:endY="${(y1 / 108) * 1024}"`)
        .replace(/android:centerX="([^"]+)" android:centerY="([^"]+)" android:gradientRadius="([^"]+)"/, (m, cx, cy, r) => `android:centerX="${(cx / 108) * 1024}" android:centerY="${(cy / 108) * 1024}" android:gradientRadius="${(r / 108) * 1024}"`),
    )
    .map((g) => `<path android:pathData="${redondeado}">${g}</path>`)
    .join('\n    ');
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Isotipo de Ágora (${C.nombre}), misma geometría que apps/web/public/icono.svg. Generado por scripts/generar-icono.mjs; no editar a mano. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt"
    android:width="48dp"
    android:height="48dp"
    android:viewportWidth="1024"
    android:viewportHeight="1024">
    ${fondo}
    <clip-path android:pathData="${redondeado}"/>
    ${C.android.glifo(v).join('\n    ')}
</vector>
`;
}

/** Silueta blanca de la pirámide: Android solo usa el canal alfa. */
function notificacionAndroid() {
  const escala = 20 / 640;
  const tx = (24 - 640 * escala) / 2 - 192 * escala;
  const ty = (24 - 540 * escala) / 2 - 252 * escala;
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Ícono de notificación: silueta de la pirámide. Generado por scripts/generar-icono.mjs; no editar a mano. -->
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <group
        android:scaleX="${escala.toFixed(6)}"
        android:scaleY="${escala.toFixed(6)}"
        android:translateX="${tx.toFixed(4)}"
        android:translateY="${ty.toFixed(4)}">
        <path
            android:fillColor="#FFFFFFFF"
            android:strokeColor="#FFFFFFFF"
            android:strokeWidth="22"
            android:strokeLineJoin="round"
            android:pathData="${P}" />
    </group>
</vector>
`;
}

// ---------------------------------------------------------------------------
// Escritura
// ---------------------------------------------------------------------------

const WEB = join(salida, 'apps/web/public');
const RES = join(salida, 'apps/mobile-native/android/app/src/main/res');
const IOS = join(salida, 'apps/mobile-native/ios/Resources/Assets.xcassets');
for (const d of [WEB, join(RES, 'drawable'), join(IOS, 'AppIcon.appiconset'), join(IOS, 'Isotipo.imageset')]) {
  mkdirSync(d, { recursive: true });
}

const escribir = (ruta, contenido) => {
  writeFileSync(ruta, contenido);
  console.log(`✓ ${ruta.replace(salida, '').replace(/^[\\/]/, '')}`);
};
const png = async (svgTexto, tam, ruta) => {
  await sharp(Buffer.from(svgTexto), { density: 300 }).resize(tam, tam).png({ compressionLevel: 9 }).toFile(ruta);
  console.log(`✓ ${ruta.replace(salida, '').replace(/^[\\/]/, '')}`);
};

const normal = svg();
const maskable = svg({ variante: 'maskable' });

// Web / PWA
escribir(join(WEB, 'icono.svg'), normal);
escribir(join(WEB, 'icono-maskable.svg'), maskable);
await png(normal, 192, join(WEB, 'icono-192.png'));
await png(normal, 512, join(WEB, 'icono-512.png'));
await png(maskable, 512, join(WEB, 'icono-maskable-512.png'));
// iOS recorta solo: a sangre.
await png(maskable, 180, join(WEB, 'apple-touch-icon.png'));
// PNG con nombre .ico: lo que ya se servía y todos los navegadores aceptan.
await png(normal, 48, join(WEB, 'favicon.ico'));
const ogSvg = og();
escribir(join(WEB, 'og.svg'), ogSvg);
await sharp(Buffer.from(ogSvg), { density: 300 }).resize(1200, 630).png({ compressionLevel: 9 }).toFile(join(WEB, 'og.png'));
console.log('✓ apps/web/public/og.png');

// Android
escribir(join(RES, 'drawable/ic_launcher_background.xml'), fondoAndroid());
escribir(join(RES, 'drawable/ic_launcher_foreground.xml'), foregroundAndroid());
escribir(join(RES, 'drawable/agora_isotipo.xml'), isotipoAndroid());
escribir(join(RES, 'drawable/ic_notification.xml'), notificacionAndroid());

// iOS
await png(maskable, 1024, join(IOS, 'AppIcon.appiconset/AppIcon-1024.png'));
escribir(join(IOS, 'Isotipo.imageset/Isotipo.svg'), svg({ plano: true }));

console.log(`Set "${C.nombre}" generado en ${salida}`);
