-- CreateEnum
CREATE TYPE "VisibilidadPerfil" AS ENUM ('UNIVERSIDAD', 'COMUNIDADES');

-- AlterEnum
ALTER TYPE "TipoComunidad" ADD VALUE 'ANONIMA';

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "anonimo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "visibilidad" "VisibilidadPerfil" NOT NULL DEFAULT 'UNIVERSIDAD';

-- CreateTable
CREATE TABLE "alias_anonimos" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alias_anonimos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "alias_anonimos_userId_key" ON "alias_anonimos"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "alias_anonimos_universityId_alias_key" ON "alias_anonimos"("universityId", "alias");

-- AddForeignKey
ALTER TABLE "alias_anonimos" ADD CONSTRAINT "alias_anonimos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alias_anonimos" ADD CONSTRAINT "alias_anonimos_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "universities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
