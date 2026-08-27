-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('FIESTA', 'ACADEMICO', 'DEPORTIVO', 'CULTURAL', 'ORGANIZACION', 'OTRO');

-- CreateEnum
CREATE TYPE "RespuestaAsistencia" AS ENUM ('VOY', 'ME_INTERESA');

-- CreateTable
CREATE TABLE "eventos" (
    "id" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "communityId" TEXT,
    "universityId" TEXT NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(2000) NOT NULL,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'OTRO',
    "lugar" VARCHAR(200) NOT NULL,
    "inicioAt" TIMESTAMP(3) NOT NULL,
    "finAt" TIMESTAMP(3),
    "costoMxn" INTEGER,
    "cupo" INTEGER,
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias_evento" (
    "id" TEXT NOT NULL,
    "eventoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "respuesta" "RespuestaAsistencia" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asistencias_evento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_universityId_inicioAt_idx" ON "eventos"("universityId", "inicioAt");

-- CreateIndex
CREATE INDEX "eventos_communityId_inicioAt_idx" ON "eventos"("communityId", "inicioAt");

-- CreateIndex
CREATE INDEX "asistencias_evento_eventoId_idx" ON "asistencias_evento"("eventoId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_evento_eventoId_userId_key" ON "asistencias_evento"("eventoId", "userId");

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos" ADD CONSTRAINT "eventos_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_evento" ADD CONSTRAINT "asistencias_evento_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "eventos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias_evento" ADD CONSTRAINT "asistencias_evento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
