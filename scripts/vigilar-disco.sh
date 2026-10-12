#!/bin/bash
# Alerta de disco. El 08-10 el disco llego al 100 % y se noto porque otro
# proyecto del mismo servidor dio 503. Esto avisa antes, al pasar el umbral.
#
# ALERTA_URL es un tema de ntfy.sh (gratis, app en el celular): cualquier POST
# a https://ntfy.sh/<tema-secreto> llega como notificacion push. Sirve tambien
# cualquier webhook que acepte texto plano.
#
# Cron cada 15 minutos (en el VPS):
#   */15 * * * * root ALERTA_URL=https://ntfy.sh/<tema> bash /var/www/udlagora-app/scripts/vigilar-disco.sh
set -euo pipefail

UMBRAL="${UMBRAL:-80}"
PUNTO="${PUNTO:-/}"
ALERTA_URL="${ALERTA_URL:?Falta ALERTA_URL (p. ej. https://ntfy.sh/<tema-secreto>)}"

uso="$(df --output=pcent "$PUNTO" | tail -1 | tr -dc '0-9')"
if [ "$uso" -ge "$UMBRAL" ]; then
  curl -fsS -m 10 --retry 3 \
    -H "Title: Disco al ${uso}% en $(hostname)" -H 'Priority: high' -H 'Tags: warning' \
    -d "El disco de $PUNTO va en ${uso}% (umbral ${UMBRAL}%). Revisa docker system df antes de que se llene. Nunca docker volume prune." \
    "$ALERTA_URL" >/dev/null
fi
