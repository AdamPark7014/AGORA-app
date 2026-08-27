-- AlterTable
ALTER TABLE "carreras" ADD COLUMN     "departamentoId" TEXT;

-- AddForeignKey
ALTER TABLE "carreras" ADD CONSTRAINT "carreras_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "departamentos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
