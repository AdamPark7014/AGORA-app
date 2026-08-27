-- CreateEnum
CREATE TYPE "SentidoAventon" AS ENUM ('A_CAMPUS', 'DESDE_CAMPUS');

-- CreateEnum
CREATE TYPE "CategoriaAnuncio" AS ENUM ('LIBROS', 'ELECTRONICA', 'MUEBLES', 'ROPA', 'CUARTO', 'SERVICIOS', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoAnuncio" AS ENUM ('DISPONIBLE', 'APARTADO', 'VENDIDO');

-- AlterTable
ALTER TABLE "media" ADD COLUMN     "anuncioId" TEXT,
ADD COLUMN     "bytes" INTEGER,
ALTER COLUMN "postId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "conversaciones" (
    "id" TEXT NOT NULL,
    "claveDirecta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversacion_participantes" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leidoAt" TIMESTAMP(3),
    "salioAt" TIMESTAMP(3),

    CONSTRAINT "conversacion_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensajes" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" VARCHAR(4000) NOT NULL,
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensajes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aventones" (
    "id" TEXT NOT NULL,
    "conductorId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "sentido" "SentidoAventon" NOT NULL,
    "origen" VARCHAR(120) NOT NULL,
    "destino" VARCHAR(120) NOT NULL,
    "salidaAt" TIMESTAMP(3) NOT NULL,
    "lugares" INTEGER NOT NULL,
    "cuotaMxn" INTEGER NOT NULL DEFAULT 0,
    "nota" VARCHAR(500),
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "aventones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asientos_aventon" (
    "id" TEXT NOT NULL,
    "aventonId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asientos_aventon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anuncios" (
    "id" TEXT NOT NULL,
    "vendedorId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "descripcion" VARCHAR(2000) NOT NULL,
    "categoria" "CategoriaAnuncio" NOT NULL DEFAULT 'OTRO',
    "precioMxn" INTEGER NOT NULL,
    "estadoVenta" "EstadoAnuncio" NOT NULL DEFAULT 'DISPONIBLE',
    "estado" "EstadoContenido" NOT NULL DEFAULT 'PUBLICADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anuncios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "conversaciones_claveDirecta_key" ON "conversaciones"("claveDirecta");

-- CreateIndex
CREATE INDEX "conversaciones_ultimoAt_idx" ON "conversaciones"("ultimoAt");

-- CreateIndex
CREATE INDEX "conversacion_participantes_userId_idx" ON "conversacion_participantes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversacion_participantes_conversationId_userId_key" ON "conversacion_participantes"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "mensajes_conversationId_createdAt_idx" ON "mensajes"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "aventones_universityId_salidaAt_idx" ON "aventones"("universityId", "salidaAt");

-- CreateIndex
CREATE UNIQUE INDEX "asientos_aventon_aventonId_userId_key" ON "asientos_aventon"("aventonId", "userId");

-- CreateIndex
CREATE INDEX "anuncios_universityId_createdAt_idx" ON "anuncios"("universityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "anuncios_categoria_createdAt_idx" ON "anuncios"("categoria", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "media_anuncioId_idx" ON "media"("anuncioId");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_anuncioId_fkey" FOREIGN KEY ("anuncioId") REFERENCES "anuncios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion_participantes" ADD CONSTRAINT "conversacion_participantes_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversacion_participantes" ADD CONSTRAINT "conversacion_participantes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversaciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensajes" ADD CONSTRAINT "mensajes_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aventones" ADD CONSTRAINT "aventones_conductorId_fkey" FOREIGN KEY ("conductorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aventones" ADD CONSTRAINT "aventones_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_aventon" ADD CONSTRAINT "asientos_aventon_aventonId_fkey" FOREIGN KEY ("aventonId") REFERENCES "aventones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asientos_aventon" ADD CONSTRAINT "asientos_aventon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_vendedorId_fkey" FOREIGN KEY ("vendedorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anuncios" ADD CONSTRAINT "anuncios_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
