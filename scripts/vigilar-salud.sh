#!/bin/bash
# Aviso de caida. Pide /api/salud por el dominio publico (pasa por Traefik,
# web y api) y avisa a ntfy si falla dos veces seguidas. Avisa una sola vez por
# caida y otra cuando vuelve, para no llenar el celular cada 5 minutos.
#
# Desde el mismo VPS no detecta que se caiga el servidor entero; para eso hace
# falta un monitor externo (UptimeRobot o healthchecks.io).
#
# Cron cada 5 minutos (en el VPS):
#   */5 * * * * root ALERTA_URL=https://ntfy.sh/<tema> bash /var/www/udlagora-app/scripts/vigilar-salud.sh
set -uo pipefail

URL="${URL:-https://udlagora.com/api/salud}"
ALERTA_URL="${ALERTA_URL:?Falta ALERTA_URL (p. ej. https://ntfy.sh/<tema-secreto>)}"
ESTADO="${ESTADO:-/var/tmp/udlagora-salud.estado}"

avisar() {
  curl -fsS -m 10 --retry 3 -H "Title: $1" -H "Priority: $2" -H "Tags: $3" -d "$4" "$ALERTA_URL" >/dev/null || true
}

ok=0
for _ in 1 2; do
  if curl -fsS -m 15 -o /dev/null "$URL"; then ok=1; break; fi
  sleep 20
done

antes="$(cat "$ESTADO" 2>/dev/null || echo ok)"
if [ "$ok" -eq 1 ]; then
  echo ok >"$ESTADO"
  if [ "$antes" = caido ]; then
    avisar 'Ágora volvió' default white_check_mark "$URL responde otra vez."
  fi
else
  echo caido >"$ESTADO"
  if [ "$antes" != caido ]; then
    avisar 'Ágora está caída' urgent rotating_light \
      "$URL no responde. Revisa: docker compose -f deploy/docker-compose.yml ps y docker logs agora-api --tail 80."
  fi
fi
