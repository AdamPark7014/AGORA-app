-- Contraseña personal (entrar sin código) y sesiones con "recordarme".
-- Solo agrega columnas con default: el código anterior sigue funcionando y
-- se deshace con DROP COLUMN sin perder nada.
ALTER TABLE "users"
  ADD COLUMN "passwordHash" TEXT,
  ADD COLUMN "passwordSetAt" TIMESTAMP(3),
  ADD COLUMN "loginFallidos" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "loginBloqueadoHasta" TIMESTAMP(3);

ALTER TABLE "sessions"
  ADD COLUMN "viaCodigo" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "persistente" BOOLEAN NOT NULL DEFAULT true;
