import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  CARRERAS,
  COLEGIOS_RESIDENCIALES,
  DEPARTAMENTOS,
  ALL_ESCUELAS,
  carrerasPorEscuela,
  buscarCarrera,
} from './udlap.js';
import {
  comunidadesDelPerfil,
  esCorreoUdlap,
  buzonDeCorreo,
  generacionValida,
  normalizarCorreo,
  slugComunidad,
} from './identidad.js';

test('el catalogo tiene las 52 licenciaturas del catalogo institucional', () => {
  assert.equal(CARRERAS.length, 52);
});

test('cada carrera pertenece a una de las 5 escuelas', () => {
  for (const carrera of CARRERAS) {
    assert.ok(ALL_ESCUELAS.includes(carrera.escuela), `escuela invalida en ${carrera.slug}`);
  }
});

test('no hay slugs de carrera duplicados dentro de una misma escuela', () => {
  const vistos = new Set<string>();
  for (const carrera of CARRERAS) {
    const clave = `${carrera.escuela}/${carrera.slug}`;
    assert.ok(!vistos.has(clave), `slug duplicado: ${clave}`);
    vistos.add(clave);
  }
});

test('las 5 escuelas tienen carreras y departamentos', () => {
  for (const escuela of ALL_ESCUELAS) {
    assert.ok(carrerasPorEscuela(escuela).length > 0, `sin carreras: ${escuela}`);
    assert.ok(
      DEPARTAMENTOS.some((d) => d.escuela === escuela),
      `sin departamentos: ${escuela}`,
    );
  }
});

test('hay 4 colegios residenciales', () => {
  assert.equal(COLEGIOS_RESIDENCIALES.length, 4);
});

test('buscarCarrera encuentra por slug y devuelve undefined si no existe', () => {
  assert.equal(buscarCarrera('ing-sistemas-computacionales')?.escuela, 'ingenieria');
  assert.equal(buscarCarrera('carrera-que-no-existe'), undefined);
});

// --- El porton de entrada. Estos casos negativos son la seguridad del producto.

test('acepta correos @udlap.mx, normalizando mayusculas y espacios', () => {
  assert.equal(esCorreoUdlap('adam.pozo@udlap.mx'), true);
  assert.equal(esCorreoUdlap('  ADAM.POZO@UDLAP.MX  '), true);
  assert.equal(normalizarCorreo('  ADAM@UDLAP.MX '), 'adam@udlap.mx');
});

test('rechaza cualquier dominio que no sea exactamente udlap.mx', () => {
  const impostores = [
    'alguien@gmail.com',
    'alguien@udlap.mx.attacker.com', // sufijo enganoso
    'alguien@falsoudlap.mx', // dominio que solo contiene la cadena
    'alguien@sub.udlap.mx', // subdominio, no es el institucional
    'alguien@udlap.com',
    'sin-arroba',
    'doble@arroba@udlap.mx',
    '@udlap.mx', // sin buzon
    'alguien@',
    '',
  ];
  for (const correo of impostores) {
    assert.equal(esCorreoUdlap(correo), false, `deberia rechazar: ${correo}`);
  }
});

test('buzonDeCorreo solo devuelve valor para correos institucionales', () => {
  assert.equal(buzonDeCorreo('adam.pozo@udlap.mx'), 'adam.pozo');
  assert.equal(buzonDeCorreo('alguien@gmail.com'), undefined);
});

test('la generacion se valida contra un rango razonable', () => {
  const anoActual = 2026;
  assert.equal(generacionValida(2024, anoActual), true);
  assert.equal(generacionValida(2027, anoActual), true, 'preinscritos del ano entrante');
  assert.equal(generacionValida(2028, anoActual), false, 'demasiado al futuro');
  assert.equal(generacionValida(2010, anoActual), false, 'antes del rango soportado');
  assert.equal(generacionValida(2024.5, anoActual), false, 'debe ser entero');
});

// --- Comunidades derivadas: la razon por la que el feed nunca nace vacio.

test('un perfil completo cae automaticamente en sus comunidades', () => {
  const slugs = comunidadesDelPerfil({
    escuela: 'ingenieria',
    departamento: 'computacion-electronica-mecatronica',
    carrera: 'ing-sistemas-computacionales',
    generacion: 2024,
    colegio: 'cain-murray',
    organizaciones: ['hackztecs'],
  });
  assert.equal(slugs.length, 6);
  assert.ok(slugs.includes(slugComunidad('carrera', 'ing-sistemas-computacionales')));
  assert.ok(slugs.includes(slugComunidad('generacion', 2024)));
});

test('un perfil a medias solo genera las comunidades que si tiene', () => {
  const slugs = comunidadesDelPerfil({ escuela: 'ciencias', generacion: 2025 });
  assert.deepEqual(slugs, ['escuela:ciencias', 'generacion:2025']);
});

test('no se repiten comunidades aunque la organizacion venga duplicada', () => {
  const slugs = comunidadesDelPerfil({
    carrera: 'derecho',
    organizaciones: ['dialectica', 'dialectica'],
  });
  assert.equal(slugs.length, 2);
});

test('el slug de comunidad es estable e insensible a mayusculas', () => {
  assert.equal(slugComunidad('carrera', 'Derecho'), 'carrera:derecho');
  assert.equal(slugComunidad('generacion', 2024), 'generacion:2024');
});
