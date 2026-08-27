/**
 * Borra los datos que dejan las pruebas automatizadas.
 *
 * Cada corrida de Playwright crea un usuario nuevo y publica un par de cosas.
 * Tras unas cuantas corridas el feed de desarrollo queda irreconocible, y uno
 * termina evaluando el diseno sobre un muro de "Publicacion de prueba".
 *
 * Solo toca correos con los prefijos de prueba. Las cuentas reales y las de
 * demostracion no se tocan.
 */

import { PrismaClient } from '@agora/db';

const PREFIJOS_PRUEBA = ['e2e.', 'visual.', 'depurar.'];

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const usuarios = await prisma.user.findMany({
    where: { OR: PREFIJOS_PRUEBA.map((p) => ({ email: { startsWith: p } })) },
    select: { id: true, email: true },
  });

  if (usuarios.length === 0) {
    console.log('No hay usuarios de prueba que borrar.');
    return;
  }

  const ids = usuarios.map((u) => u.id);

  // Las publicaciones caen en cascada al borrar el usuario (onDelete: Cascade
  // en el esquema), asi que basta con contarlas antes para reportar.
  const publicaciones = await prisma.post.count({ where: { authorId: { in: ids } } });

  await prisma.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`Borrados ${usuarios.length} usuarios de prueba y ${publicaciones} publicaciones.`);
  for (const u of usuarios) console.log(`  - ${u.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
