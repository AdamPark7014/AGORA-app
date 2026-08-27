-- Retos entre amigos (racha o semana de pregunta del día).

CREATE TYPE "TipoRetoAmigo" AS ENUM ('RACHA', 'SEMANA_PREGUNTA');
CREATE TYPE "EstadoRetoAmigo" AS ENUM ('PENDIENTE', 'ACTIVO', 'RECHAZADO');

CREATE TABLE "retos_amigo" (
    "id" TEXT NOT NULL,
    "retadorId" TEXT NOT NULL,
    "retadoId" TEXT NOT NULL,
    "tipo" "TipoRetoAmigo" NOT NULL,
    "estado" "EstadoRetoAmigo" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activadoAt" TIMESTAMP(3),

    CONSTRAINT "retos_amigo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retos_amigo_retadoId_estado_idx" ON "retos_amigo"("retadoId", "estado");
CREATE INDEX "retos_amigo_retadorId_idx" ON "retos_amigo"("retadorId");

ALTER TABLE "retos_amigo" ADD CONSTRAINT "retos_amigo_retadorId_fkey" FOREIGN KEY ("retadorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "retos_amigo" ADD CONSTRAINT "retos_amigo_retadoId_fkey" FOREIGN KEY ("retadoId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
