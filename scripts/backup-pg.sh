#!/bin/bash
# Dump lógico de Postgres (contenedor agora-db) → gzip bajo /var/backups/udlagora.
# Uso (VPS):
#   bash scripts/backup-pg.sh
#   bash scripts/backup-pg.sh /ruta/alternativa
#   RETENCION_DIAS=14 bash scripts/backup-pg.sh
set -euo pipefail

OUT_DIR="${1:-/var/backups/udlagora}"
RETENCION_DIAS="${RETENCION_DIAS:-7}"
CONTAINER="${CONTAINER:-agora-db}"

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Contenedor no encontrado: $CONTAINER" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"
stamp="$(date +%Y%m%d-%H%M%S)"
out="$OUT_DIR/agora-${stamp}.sql.gz"

docker exec "$CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' \
  | gzip -c > "$out"

chmod 600 "$out"
echo "Backup OK: $out ($(du -h "$out" | cut -f1))"

# Retención: borra dumps más viejos que RETENCION_DIAS.
find "$OUT_DIR" -maxdepth 1 -type f -name 'agora-*.sql.gz' -mtime "+${RETENCION_DIAS}" -delete 2>/dev/null || true
