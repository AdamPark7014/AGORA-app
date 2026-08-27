/**
 * Siembra el catalogo real de la UDLAP y las comunidades derivadas.
 *
 * Es idempotente: se puede correr las veces que haga falta sin duplicar nada.
 * Todo usa upsert sobre claves naturales (slug), no sobre ids generados.
 */

import {
  CARRERAS,
  COLEGIOS_RESIDENCIALES,
  DEPARTAMENTOS,
  ESCUELA_LABELS,
  ALL_ESCUELAS,
  UDLAP_EMAIL_DOMAIN,
  GENERACION_MIN,
  slugComunidad,
  SLUG_COMUNIDAD_CAMPUS_UDLAP,
  NOMBRE_COMUNIDAD_CAMPUS_UDLAP,
  type EscuelaKey,
} from '@agora/shared';
import { PrismaClient, TipoComunidad } from '@prisma/client';

import { sembrarDemo } from './demo-seed.js';

const prisma = new PrismaClient();

/** Generaciones con comunidad propia. Incluye egresados desde 2015. */
const ANO_ACTUAL = new Date().getFullYear();
const GENERACIONES = Array.from(
  { length: ANO_ACTUAL + 1 - GENERACION_MIN },
  (_, i) => GENERACION_MIN + i,
);

async function main() {
  console.log('-- Sembrando UDLAP');

  const universidad = await prisma.university.upsert({
    where: { slug: 'udlap' },
    update: { nombre: 'Universidad de las Americas Puebla', emailDomain: UDLAP_EMAIL_DOMAIN },
    create: {
      slug: 'udlap',
      nombre: 'Universidad de las Americas Puebla',
      emailDomain: UDLAP_EMAIL_DOMAIN,
    },
  });

  // --- Escuelas
  const escuelaIds = new Map<EscuelaKey, string>();
  for (const slug of ALL_ESCUELAS) {
    const escuela = await prisma.escuela.upsert({
      where: { universityId_slug: { universityId: universidad.id, slug } },
      update: { nombre: ESCUELA_LABELS[slug] },
      create: { universityId: universidad.id, slug, nombre: ESCUELA_LABELS[slug] },
    });
    escuelaIds.set(slug, escuela.id);
  }
  console.log(`   escuelas: ${escuelaIds.size}`);

  // --- Departamentos
  for (const depto of DEPARTAMENTOS) {
    const escuelaId = escuelaIds.get(depto.escuela);
    if (!escuelaId) throw new Error(`escuela desconocida: ${depto.escuela}`);
    await prisma.departamento.upsert({
      where: { escuelaId_slug: { escuelaId, slug: depto.slug } },
      update: { nombre: depto.nombre },
      create: { escuelaId, slug: depto.slug, nombre: depto.nombre },
    });
  }
  console.log(`   departamentos: ${DEPARTAMENTOS.length}`);

  // --- Carreras
  // Se resuelven los ids de departamento una sola vez: son 24 y las carreras
  // 52, asi que consultarlos dentro del bucle serian 52 viajes de mas.
  const departamentos = await prisma.departamento.findMany({
    select: { id: true, slug: true, escuela: { select: { slug: true } } },
  });
  const departamentoIds = new Map(
    departamentos.map((d) => [`${d.escuela.slug}/${d.slug}`, d.id]),
  );

  for (const carrera of CARRERAS) {
    const escuelaId = escuelaIds.get(carrera.escuela);
    if (!escuelaId) throw new Error(`escuela desconocida: ${carrera.escuela}`);

    const departamentoId = departamentoIds.get(`${carrera.escuela}/${carrera.departamento}`);
    if (!departamentoId) {
      throw new Error(
        `la carrera ${carrera.slug} apunta al departamento ${carrera.departamento}, que no existe en ${carrera.escuela}`,
      );
    }

    await prisma.carrera.upsert({
      where: { escuelaId_slug: { escuelaId, slug: carrera.slug } },
      update: { nombre: carrera.nombre, departamentoId },
      create: { escuelaId, departamentoId, slug: carrera.slug, nombre: carrera.nombre },
    });
  }
  console.log(`   carreras: ${CARRERAS.length}`);

  // --- Colegios residenciales
  for (const colegio of COLEGIOS_RESIDENCIALES) {
    await prisma.colegioResidencial.upsert({
      where: { slug: colegio.slug },
      update: { nombre: colegio.nombre },
      create: { slug: colegio.slug, nombre: colegio.nombre },
    });
  }
  console.log(`   colegios: ${COLEGIOS_RESIDENCIALES.length}`);

  // --- Comunidades derivadas
  // Estas son la razon por la que un usuario nuevo nunca ve el feed vacio:
  // al completar el perfil, cae en las suyas automaticamente.
  let comunidades = 0;
  const sembrarComunidad = async (
    slug: string,
    tipo: TipoComunidad,
    nombre: string,
  ): Promise<void> => {
    await prisma.community.upsert({
      where: { universityId_slug: { universityId: universidad.id, slug } },
      update: { nombre, tipo, esDerivada: true },
      create: { universityId: universidad.id, slug, tipo, nombre, esDerivada: true },
    });
    comunidades += 1;
  };

  await sembrarComunidad(
    SLUG_COMUNIDAD_CAMPUS_UDLAP,
    TipoComunidad.UNIVERSIDAD,
    NOMBRE_COMUNIDAD_CAMPUS_UDLAP,
  );

  for (const escuela of ALL_ESCUELAS) {
    await sembrarComunidad(
      slugComunidad('escuela', escuela),
      TipoComunidad.ESCUELA,
      ESCUELA_LABELS[escuela],
    );
  }
  for (const depto of DEPARTAMENTOS) {
    await sembrarComunidad(
      slugComunidad('departamento', depto.slug),
      TipoComunidad.DEPARTAMENTO,
      depto.nombre,
    );
  }
  for (const carrera of CARRERAS) {
    await sembrarComunidad(
      slugComunidad('carrera', carrera.slug),
      TipoComunidad.CARRERA,
      carrera.nombre,
    );
  }
  for (const generacion of GENERACIONES) {
    await sembrarComunidad(
      slugComunidad('generacion', generacion),
      TipoComunidad.GENERACION,
      `Generacion ${generacion}`,
    );
  }
  for (const colegio of COLEGIOS_RESIDENCIALES) {
    await sembrarComunidad(
      slugComunidad('colegio', colegio.slug),
      TipoComunidad.COLEGIO,
      `Colegio ${colegio.nombre}`,
    );
  }

  console.log(`   comunidades derivadas: ${comunidades}`);

  const superadminEmail = (
    process.env.BOOTSTRAP_SUPERADMIN_EMAIL ?? 'adam.delpozoos@udlap.mx'
  ).toLowerCase();

  await sembrarDemo(prisma, universidad.id, superadminEmail);

  console.log('-- Listo');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
