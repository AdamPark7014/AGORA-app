#!/bin/bash
# Instala en el VPS los avisos de disco (cada 15 min) y de caida (cada 5 min).
# Uso: bash scripts/instalar-vigilancia.sh https://ntfy.sh/<tema-secreto>
# Manda una notificacion de prueba para confirmar que el tema llega al celular.
set -euo pipefail

ALERTA_URL="${1:?Uso: bash scripts/instalar-vigilancia.sh https://ntfy.sh/<tema-secreto>}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"

cat >/etc/cron.d/udlagora-vigilancia <<CRON
# Generado por scripts/instalar-vigilancia.sh
ALERTA_URL=$ALERTA_URL
*/15 * * * * root bash $RAIZ/scripts/vigilar-disco.sh
*/5 * * * * root bash $RAIZ/scripts/vigilar-salud.sh
CRON
chmod 644 /etc/cron.d/udlagora-vigilancia

curl -fsS -m 10 -H 'Title: Avisos de Ágora activos' -H 'Tags: bell' \
  -d "Te llegará aquí si el disco pasa del 80 % o si udlagora.com deja de responder." \
  "$ALERTA_URL" >/dev/null
echo "Listo: /etc/cron.d/udlagora-vigilancia"
