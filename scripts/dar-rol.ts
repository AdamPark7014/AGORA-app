/**
 * Da o quita un rol a una cuenta.
 *
 *   pnpm rol adam.delpozoos@udlap.mx moderador
 *   pnpm rol adam.delpozoos@udlap.mx moderador --quitar
 *
 * Existe porque el primer moderador tiene que salir de algun lado: no hay
 * forma de entrar al panel sin el rol, y no hay forma de darse el rol desde
 * el panel. Es el problema del huevo y la gallina, resuelto desde la consola
 * con acceso al servidor, que es donde debe estar.
 */

import { PrismaClient } from '@agora/db';
import { ALL_ROLES, esRolValido } from '@agora/rbac';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const [email, rol, bandera] = process.argv.slice(2);
  const quitar = bandera === '--quitar';

  if (!email || !rol) {
    console.error('Uso: pnpm rol <correo> <rol> [--quitar]');
    console.error(`Roles: ${ALL_ROLES.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (!esRolValido(rol)) {
    console.error(`Rol desconocido: ${rol}. Validos: ${ALL_ROLES.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  const usuario = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, roles: true },
  });

  if (!usuario) {
    console.error(`No existe la cuenta ${email}. Que entre una vez a Agora primero.`);
    process.exitCode = 1;
    return;
  }

  const roles = quitar
    ? usuario.roles.filter((r) => r !== rol)
    : [...new Set([...usuario.roles, rol])];

  await prisma.user.update({ where: { id: usuario.id }, data: { roles } });

  console.log(`${email} -> ${roles.join(', ') || '(sin roles)'}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
