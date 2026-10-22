-- Registro con correo personal cuando el código a la UDLAP no llega.
-- Solo agrega columnas (nullables o con default): el código anterior sigue
-- funcionando y se deshace con DROP COLUMN / DROP INDEX sin perder nada.
ALTER TABLE "users"
  ADD COLUMN "correoPersonal" TEXT,
  ADD COLUMN "udlapPendienteDesde" TIMESTAMP(3);

CREATE UNIQUE INDEX "users_correoPersonal_key" ON "users"("correoPersonal");

ALTER TABLE "otp_codes"
  ADD COLUMN "destino" TEXT NOT NULL DEFAULT 'udlap';
