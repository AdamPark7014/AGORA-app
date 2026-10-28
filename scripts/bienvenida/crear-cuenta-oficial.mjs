// Cuenta oficial @agora (opción b de Adam, 28-10-2026): la del equipo de Ágora, que publica el
// contenido de bienvenida. No es una persona ni una cuenta de la UDLAP, y su perfil lo dice.
//
// Lee «correo<TAB>contraseña» de la entrada estándar: la contraseña nunca va en la línea de
// comandos ni en el repo (vive en la carpeta de secretos). Si la cuenta ya existe no la toca.
// El correo es un @udlap.mx que nadie recibe: así nadie puede entrar con un código por correo.
//
// Producción (dentro del contenedor de la API):
//   docker exec -i agora-api sh -c 'cat > /tmp/crear-cuenta-oficial.mjs' < scripts/bienvenida/crear-cuenta-oficial.mjs
//   printf '%s\t%s' "$CORREO" "$CLAVE" | docker exec -i agora-api node /tmp/crear-cuenta-oficial.mjs
// Local: AGORA_API_DIR=apps/api node scripts/bienvenida/crear-cuenta-oficial.mjs (con DATABASE_URL).
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const apiDir = path.resolve(process.env.AGORA_API_DIR ?? "/repo/apps/api");
// En la imagen de producción @prisma/client se resuelve desde la API; en el repo (pnpm), desde packages/db.
function requerir(modulo) {
  for (const base of [
    apiDir,
    path.join(apiDir, "..", "..", "packages", "db"),
  ]) {
    try {
      return createRequire(path.join(base, "package.json"))(modulo);
    } catch {
      // siguiente lugar
    }
  }
  throw new Error(`No encontré ${modulo} desde ${apiDir}`);
}
const { PrismaClient } = requerir("@prisma/client");
const { hashContrasena } = await import(
  pathToFileURL(path.join(apiDir, "dist/auth/contrasena.js")).href
);

const HANDLE = "agora";

const entrada = (
  await new Promise((ok) => {
    let s = "";
    process.stdin.on("data", (d) => (s += d));
    process.stdin.on("end", () => ok(s));
  })
).trim();
const [correo, contrasena] = entrada.split("\t");
if (!correo?.endsWith("@udlap.mx") || !contrasena || contrasena.length < 12) {
  throw new Error(
    "Entrada inválida: se espera «correo@udlap.mx<TAB>contraseña de 12 o más».",
  );
}

const prisma = new PrismaClient();
try {
  const yaHay = await prisma.profile.findUnique({
    where: { handle: HANDLE },
    include: { user: true },
  });
  if (yaHay) {
    console.log(`@${HANDLE} ya existe (${yaHay.userId}); no se cambia nada.`);
  } else {
    const udlap = await prisma.university.findUniqueOrThrow({
      where: { slug: "udlap" },
    });
    const ahora = new Date();
    const user = await prisma.user.create({
      data: {
        universityId: udlap.id,
        email: correo.toLowerCase(),
        emailVerifiedAt: ahora,
        estado: "ACTIVO",
        passwordHash: await hashContrasena(contrasena),
        passwordSetAt: ahora,
        profile: {
          create: {
            handle: HANDLE,
            nombre: "Ágora",
            apellidos: "",
            bio: "Cuenta del equipo de Ágora, la app. No es una persona ni una cuenta de la UDLAP: Ágora no está afiliada a la universidad.",
            visibilidad: "UNIVERSIDAD",
            avisoPregunta: false,
          },
        },
      },
    });
    const campus = await prisma.community.findFirst({
      where: { slug: "universidad:udlap" },
    });
    if (campus) {
      await prisma.membership.create({
        data: { userId: user.id, communityId: campus.id, automatica: true },
      });
    }
    console.log(
      `@${HANDLE} creada (${user.id}), miembro de la plaza del campus.`,
    );
  }
} finally {
  await prisma.$disconnect();
}
