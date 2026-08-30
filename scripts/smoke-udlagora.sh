#!/bin/bash
# Smoke post-deploy de udlagora.com: web 200, /api/salud con estado ok|degradado.
# Uso:
#   bash scripts/smoke-udlagora.sh                          # HTTPS público
#   bash scripts/smoke-udlagora.sh https://udlagora.com
#   RESOLVE=udlagora.com:443:127.0.0.1 bash scripts/smoke-udlagora.sh   # desde el VPS
set -euo pipefail

BASE_URL="${1:-https://udlagora.com}"
BASE_URL="${BASE_URL%/}"
RESOLVE="${RESOLVE:-}"

curl_base=(curl -sk --max-time 20)
if [ -n "$RESOLVE" ]; then
  curl_base+=(--resolve "$RESOLVE")
fi

fail=0

echo "== smoke $BASE_URL ${RESOLVE:+(resolve $RESOLVE)} =="

# 1) Web /
code="$("${curl_base[@]}" -o /dev/null -w '%{http_code}' "$BASE_URL/" || true)"
if [ "$code" = "200" ]; then
  echo "OK  / → $code"
else
  echo "FAIL / → $code (esperado 200)" >&2
  fail=1
fi

# 2) API /api/salud — acepta estado ok (200) o degradado (503)
salud_body="$(mktemp)"
salud_code="$("${curl_base[@]}" -o "$salud_body" -w '%{http_code}' "$BASE_URL/api/salud" || true)"
estado="$(
  sed -n 's/.*"estado"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$salud_body" | head -1
)"
rm -f "$salud_body"

if [ "$estado" = "ok" ] || [ "$estado" = "degradado" ]; then
  echo "OK  /api/salud → HTTP $salud_code estado=$estado"
  if [ "$estado" = "degradado" ]; then
    echo "WARN API degradada (base caida o lenta); routing OK." >&2
  fi
else
  echo "FAIL /api/salud → HTTP $salud_code estado='${estado:-?}' (esperado ok|degradado)" >&2
  fail=1
fi

# 3) Media (opcional): MinIO live vía strip /media
media_code="$("${curl_base[@]}" -o /dev/null -w '%{http_code}' "$BASE_URL/media/minio/health/live" || true)"
case "$media_code" in
  200|301|302|307|308)
    echo "OK  /media/minio/health/live → $media_code"
    ;;
  *)
    echo "WARN /media/minio/health/live → $media_code (no bloquea smoke)"
    ;;
esac

if [ "$fail" -ne 0 ]; then
  echo "Smoke FALLÓ" >&2
  exit 1
fi

echo "Smoke OK"
