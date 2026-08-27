-- Plaza general del campus: feed UDLAP para todos los verificados.
ALTER TYPE "TipoComunidad" ADD VALUE IF NOT EXISTS 'UNIVERSIDAD';
