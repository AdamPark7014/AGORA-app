-- Recordatorio de aventón: aviso al conductor y a los pasajeros antes de la salida.
-- Solo agrega: un valor al enum y dos columnas que aceptan null.
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'AVENTON_RECORDATORIO';
ALTER TABLE "aventones" ADD COLUMN "recordatorioAt" TIMESTAMP(3);
ALTER TABLE "asientos_aventon" ADD COLUMN "recordatorioAt" TIMESTAMP(3);
