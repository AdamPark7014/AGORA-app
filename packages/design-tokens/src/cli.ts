import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { archivos } from './generar.js';
import { revisar, type Plataforma } from './revisar.js';

const paquete = resolve(__dirname, '..');
const raiz = resolve(paquete, '../..');

const FUENTES: Record<Plataforma, string> = {
  web: 'apps/web/app/globals.css',
  android: 'apps/mobile-native/android/app/src/main/java/mx/agora/mobile/nativeapp/ui/theme/Color.kt',
  ios: 'apps/mobile-native/ios/AgoraApp/UI/Design/AgoraDesign.swift',
};

const orden = process.argv[2];

if (orden === 'generar') {
  const salida = join(paquete, 'generado');
  mkdirSync(salida, { recursive: true });
  for (const [nombre, generar] of Object.entries(archivos)) {
    writeFileSync(join(salida, nombre), generar());
    console.log(`generado/${nombre}`);
  }
} else if (orden === 'revisar') {
  const fuentes = Object.fromEntries(
    Object.entries(FUENTES).map(([p, ruta]) => [p, readFileSync(join(raiz, ruta), 'utf8')]),
  ) as Record<Plataforma, string>;
  const diferencias = revisar(fuentes);
  for (const d of diferencias) {
    console.log(
      `${d.plataforma.padEnd(8)} ${d.token.padEnd(14)} ${d.modo.padEnd(7)} esperado ${d.esperado}  hay ${d.encontrado ?? '(falta)'}  [${d.nombre}]`,
    );
  }
  console.log(`\n${diferencias.length} diferencias contra docs/diseno-cholula.md`);
} else {
  console.error('Uso: node dist/cli.js generar|revisar');
  process.exit(1);
}
