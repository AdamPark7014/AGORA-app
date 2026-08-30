#!/bin/bash
# Copia atómica de udlagora.yml al file provider de Traefik y verifica la ruta.
# Uso (VPS):
#   bash deploy/install-traefik-route.sh
#   SKIP_VERIFY=1 bash deploy/install-traefik-route.sh   # solo copia (p.ej. antes de compose up)
#   RESOLVE_IP=127.0.0.1 DOMAIN=udlagora.com bash deploy/install-traefik-route.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="${SRC:-$SCRIPT_DIR/traefik/udlagora.yml}"
DEST="${DEST:-/opt/traefik/config/udlagora.yml}"
DOMAIN="${DOMAIN:-udlagora.com}"
RESOLVE_IP="${RESOLVE_IP:-127.0.0.1}"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

if [ ! -f "$SRC" ]; then
  echo "Falta el origen Traefik: $SRC" >&2
  exit 1
fi

dest_dir="$(dirname "$DEST")"
if [ ! -d "$dest_dir" ]; then
  echo "No existe el directorio de Traefik: $dest_dir" >&2
  exit 1
fi

tmp="$(mktemp "$DEST.XXXXXX")"
cleanup() { rm -f "$tmp"; }
trap cleanup EXIT

cp "$SRC" "$tmp"
chmod 644 "$tmp"
mv -f "$tmp" "$DEST"
trap - EXIT

echo "Ruta Traefik instalada: $SRC → $DEST"

if [ "$SKIP_VERIFY" = "1" ]; then
  echo "SKIP_VERIFY=1: sin curl (ejecuta de nuevo tras compose up)."
  exit 0
fi

# Traefik recarga el file provider; dar un momento antes de verificar.
sleep 2

hdrs="$(mktemp)"
trap 'rm -f "$hdrs"' EXIT
code="$(
  curl -skI --resolve "${DOMAIN}:443:${RESOLVE_IP}" \
    -o "$hdrs" -w '%{http_code}' \
    "https://${DOMAIN}/" || true
)"

if [ "$code" != "200" ]; then
  echo "Verificación falló: https://${DOMAIN}/ → HTTP $code (esperado 200)" >&2
  echo "--- cabeceras ---" >&2
  cat "$hdrs" >&2 || true
  echo "Comprueba que agora-web esté en la red proxy y Traefik haya recargado." >&2
  exit 1
fi

echo "Verificado: https://${DOMAIN}/ → 200 (resolve ${DOMAIN}:443:${RESOLVE_IP})"
