#!/bin/bash
# Restaura un dump generado por scripts/backup-pg.sh sobre agora-db.
# CUIDADO: aplica --clean del dump (reemplaza objetos). Confirmar con RESTORE_CONFIRM=1.
# Uso (VPS):
#   RESTORE_CONFIRM=1 bash scripts/restore-pg.sh /var/backups/udlagora/agora-YYYYMMDD-HHMMSS.sql.gz
set -euo pipefail

CONTAINER="${CONTAINER:-agora-db}"
FILE="${1:-}"

if [ -z "$FILE" ]; then
  echo "Uso: RESTORE_CONFIRM=1 bash scripts/restore-pg.sh <archivo.sql.gz|archivo.sql>" >&2
  exit 1
fi

if [ ! -f "$FILE" ]; then
  echo "No existe el archivo: $FILE" >&2
  exit 1
fi

if [ "${RESTORE_CONFIRM:-}" != "1" ]; then
  echo "Abortado: setea RESTORE_CONFIRM=1 para restaurar sobre $CONTAINER" >&2
  exit 1
fi

if ! docker inspect "$CONTAINER" >/dev/null 2>&1; then
  echo "Contenedor no encontrado: $CONTAINER" >&2
  exit 1
fi

echo "Restaurando $FILE → $CONTAINER …"

case "$FILE" in
  *.gz)
    gunzip -c "$FILE" | docker exec -i "$CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1'
    ;;
  *)
    docker exec -i "$CONTAINER" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1' < "$FILE"
    ;;
esac

echo "Restore OK: $FILE"
