/**
 * Contenido de demostracion para desarrollo.
 *
 * Delega en el modulo compartido usado por `pnpm db:seed`.
 * Es idempotente: se puede correr las veces que haga falta.
 */

import { PrismaClient } from '@agora/db';
import { sembrarDemo } from '../packages/db/prisma/demo-seed.js';

const prisma = new PrismaClient();

const superadminEmail = process.env.BOOTSTRAP_SUPERADMIN_EMAIL?.trim().toLowerCase() || null;

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO !== 'true') {
    throw new Error('La demo no corre en produccion sin SEED_DEMO=true.');
  }
  const universidad = await prisma.university.findFirst({ where: { emailDomain: 'udlap.mx' } });
  if (!universidad) throw new Error('Falta sembrar la universidad. Corre primero pnpm db:seed.');

  await sembrarDemo(prisma, universidad.id, superadminEmail);
}

main()
  .then(() => console.log('-- Demo lista'))
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
