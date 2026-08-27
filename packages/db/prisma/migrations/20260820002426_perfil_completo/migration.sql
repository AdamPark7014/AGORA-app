-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "busco" VARCHAR(120),
ADD COLUMN     "ciudadOrigen" VARCHAR(80),
ADD COLUMN     "instagram" VARCHAR(30),
ADD COLUMN     "intereses" TEXT[],
ADD COLUMN     "portadaUrl" TEXT;
