/**
 * Borra a mano lo que la tarea diaria de la API borra sola.
 *
 * La limpieza corre dentro de la API todas las madrugadas
 * (`MantenimientoService`), pero conviene poder dispararla a mano: para
 * comprobarla en desarrollo, y en el servidor para recuperar espacio sin
 * esperar a las 4 de la mañana.
 *
 * Las reglas de cuanto se guarda cada cosa viven en un solo sitio,
 * `apps/api/src/mantenimiento/retencion.ts`, y se leen desde aqui para que el
 * script y la tarea no se separen nunca.
 */

import { PrismaClient } from '@agora/db';

import { RETENCION, limite } from '../apps/api/src/mantenimiento/retencion.js';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const antes = {
    otp: await prisma.otpCode.count(),
    sesiones: await prisma.session.count(),
    notificaciones: await prisma.notificacion.count(),
  };

  const [otp, sesiones, notificaciones] = await Promise.all([
    prisma.otpCode.deleteMany({
      where: { createdAt: { lt: limite(RETENCION.otpMs) } },
    }),
    prisma.session.deleteMany({
      where: { expiresAt: { lt: limite(RETENCION.sesionCaducadaMs) } },
    }),
    prisma.notificacion.deleteMany({
      where: { leidoAt: { not: null, lt: limite(RETENCION.notificacionLeidaMs) } },
    }),
  ]);

  console.log(`codigos OTP     ${antes.otp} → ${antes.otp - otp.count}   (-${otp.count})`);
  console.log(
    `sesiones        ${antes.sesiones} → ${antes.sesiones - sesiones.count}   (-${sesiones.count})`,
  );
  console.log(
    `avisos leidos   ${antes.notificaciones} → ${antes.notificaciones - notificaciones.count}   (-${notificaciones.count})`,
  );

  // Lo que sigue vivo no se toca: es la comprobacion de que no nos pasamos.
  const vigentes = {
    otp: await prisma.otpCode.count({ where: { expiresAt: { gt: new Date() } } }),
    sesiones: await prisma.session.count({ where: { expiresAt: { gt: new Date() } } }),
    sinLeer: await prisma.notificacion.count({ where: { leidoAt: null } }),
  };
  console.log(
    `intactos: ${vigentes.otp} codigos vigentes, ${vigentes.sesiones} sesiones activas, ` +
      `${vigentes.sinLeer} avisos sin leer`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
