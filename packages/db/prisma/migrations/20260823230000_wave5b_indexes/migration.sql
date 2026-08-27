-- W5-7: indices para consultas frecuentes de notificaciones y membresias.
--
-- notificaciones(userId, leidoAt): acelera COUNT y UPDATE de no leidas
-- (sinLeer, marcarLeidas) sin escanear todo el historial del usuario.
--
-- memberships(userId): acelera "mis comunidades" en feed, eventos y directorio;
-- el indice por communityId ya existia para el sentido inverso.

CREATE INDEX "notificaciones_userId_leidoAt_idx" ON "notificaciones"("userId", "leidoAt");

CREATE INDEX "memberships_userId_idx" ON "memberships"("userId");
