-- Dueno de cada archivo subido: cuota por persona y que nadie adjunte la subida de otro.
-- Aditiva: las filas anteriores quedan con ownerId NULL.

-- AlterTable
ALTER TABLE "media" ADD COLUMN "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "media_ownerId_createdAt_idx" ON "media"("ownerId", "createdAt");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
