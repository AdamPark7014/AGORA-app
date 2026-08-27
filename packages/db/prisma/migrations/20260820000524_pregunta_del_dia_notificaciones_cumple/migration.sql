-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('COMENTARIO', 'REACCION', 'MENSAJE', 'EVENTO_NUEVO', 'AVENTON_APARTADO', 'MODERACION', 'MENCION');

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "cumpleDia" INTEGER,
ADD COLUMN     "cumpleMes" INTEGER;

-- CreateTable
CREATE TABLE "preguntas_del_dia" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "texto" VARCHAR(200) NOT NULL,
    "opciones" TEXT[],
    "fecha" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preguntas_del_dia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "respuestas_pregunta" (
    "id" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opcion" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "respuestas_pregunta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificaciones" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "texto" VARCHAR(300) NOT NULL,
    "url" VARCHAR(300) NOT NULL,
    "actorId" TEXT,
    "leidoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preguntas_del_dia_fecha_idx" ON "preguntas_del_dia"("fecha");

-- CreateIndex
CREATE UNIQUE INDEX "preguntas_del_dia_universityId_fecha_key" ON "preguntas_del_dia"("universityId", "fecha");

-- CreateIndex
CREATE INDEX "respuestas_pregunta_preguntaId_idx" ON "respuestas_pregunta"("preguntaId");

-- CreateIndex
CREATE UNIQUE INDEX "respuestas_pregunta_preguntaId_userId_key" ON "respuestas_pregunta"("preguntaId", "userId");

-- CreateIndex
CREATE INDEX "notificaciones_userId_createdAt_idx" ON "notificaciones"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "profiles_cumpleMes_cumpleDia_idx" ON "profiles"("cumpleMes", "cumpleDia");

-- AddForeignKey
ALTER TABLE "preguntas_del_dia" ADD CONSTRAINT "preguntas_del_dia_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_pregunta" ADD CONSTRAINT "respuestas_pregunta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "preguntas_del_dia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "respuestas_pregunta" ADD CONSTRAINT "respuestas_pregunta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
