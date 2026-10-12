-- Pregunta del dia con hora sorpresa (estilo BeReal).
ALTER TABLE "preguntas_del_dia" ADD COLUMN "abreAt" TIMESTAMP(3);
ALTER TABLE "preguntas_del_dia" ADD COLUMN "avisadaAt" TIMESTAMP(3);
ALTER TABLE "respuestas_pregunta" ADD COLUMN "aTiempo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "profiles" ADD COLUMN "avisoPregunta" BOOLEAN NOT NULL DEFAULT true;
