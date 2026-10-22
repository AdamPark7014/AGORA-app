-- Recordatorio de eventos: tipo de aviso nuevo y marca de "ya se avisó" por asistencia.
-- Solo agrega: el código anterior sigue funcionando y se deshace con DROP COLUMN.
ALTER TYPE "TipoNotificacion" ADD VALUE IF NOT EXISTS 'EVENTO_RECORDATORIO';
ALTER TABLE "asistencias_evento" ADD COLUMN "recordatorioAt" TIMESTAMP(3);
