#!/bin/bash
# Respaldo FUERA del servidor: dump de Postgres + fotos/videos de MinIO.
#
# Por que: los dumps de backup-pg.sh viven en el mismo disco que llego al 100 %
# el 08-10, y la media de MinIO no tenia ningun respaldo. Si el disco o el
# servidor se pierden, se pierde todo. Esto copia ambos a un destino externo
# (Hetzner Storage Box, Backblaze B2, S3...) con rclone, sin ocupar disco
# local para la media: va directo de MinIO al destino.
#
# Preparacion, una sola vez (en el VPS):
#   1. Configurar el destino con rclone, idealmente envuelto en un remoto
#      "crypt" para que el proveedor no pueda leer nada:
#        docker run --rm -it -v /root/.config/rclone:/config/rclone rclone/rclone:1.68.2 config
#      (crear p. ej. "storagebox" tipo sftp y encima "agora-cifrado" tipo crypt)
#   2. En deploy/.env:
#        RESPALDO_DESTINO=agora-cifrado:agora      # remoto:ruta de rclone
#        RESPALDO_PING_URL=https://hc-ping.com/... # opcional, healthchecks.io
#   3. Cron diario (03:15):
#        15 3 * * * root cd /var/www/udlagora-app && bash scripts/respaldo-externo.sh >> /var/log/udlagora-respaldo.log 2>&1
#
# RESPALDO_PING_URL avisa a healthchecks.io al terminar bien; si un dia no
# llega el aviso, healthchecks te manda correo. Asi un respaldo que deja de
# correr no pasa desapercibido.
#
# Restaurar la media:  docker run ... rclone sync "$RESPALDO_DESTINO/media" minio:$S3_BUCKET
# Restaurar Postgres:  rclone copy el dump y RESTORE_CONFIRM=1 bash scripts/restore-pg.sh <dump>
set -euo pipefail

APP="${APP:-/var/www/udlagora-app}"
ENV_FILE="$APP/deploy/.env"
RCLONE_IMG="${RCLONE_IMG:-rclone/rclone:1.68.2}"
RCLONE_CONF="${RCLONE_CONF:-/root/.config/rclone}"
LOCAL_DIR="${LOCAL_DIR:-/var/backups/udlagora}"
RETENCION_EXTERNA="${RETENCION_EXTERNA:-30d}"
RED_INTERNA="${RED_INTERNA:-agora_internal}"

leer() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- || true; }

DESTINO="${RESPALDO_DESTINO:-$(leer RESPALDO_DESTINO)}"
PING="${RESPALDO_PING_URL:-$(leer RESPALDO_PING_URL)}"
BUCKET="$(leer S3_BUCKET)"
MINIO_USER="$(leer MINIO_ROOT_USER)"
MINIO_PASS="$(leer MINIO_ROOT_PASSWORD)"

if [ -z "$DESTINO" ]; then
  echo "Falta RESPALDO_DESTINO en $ENV_FILE (remoto:ruta de rclone)." >&2
  exit 1
fi

fallo() {
  echo "RESPALDO FALLO: $1" >&2
  [ -n "$PING" ] && curl -fsS -m 10 --retry 3 "$PING/fail" >/dev/null || true
  exit 1
}

[ -n "$PING" ] && curl -fsS -m 10 --retry 3 "$PING/start" >/dev/null || true

rclone() {
  docker run --rm --network "$RED_INTERNA" \
    -v "$RCLONE_CONF:/config/rclone" -v "$LOCAL_DIR:/respaldos:ro" \
    -e RCLONE_CONFIG_MINIO_TYPE=s3 \
    -e RCLONE_CONFIG_MINIO_PROVIDER=Minio \
    -e RCLONE_CONFIG_MINIO_ENDPOINT=http://minio:9000 \
    -e RCLONE_CONFIG_MINIO_ACCESS_KEY_ID="$MINIO_USER" \
    -e RCLONE_CONFIG_MINIO_SECRET_ACCESS_KEY="$MINIO_PASS" \
    "$RCLONE_IMG" "$@"
}

# 1. Dump de Postgres (local, retencion corta) y copia al destino.
bash "$APP/scripts/backup-pg.sh" "$LOCAL_DIR" || fallo "pg_dump"
rclone copy /respaldos "$DESTINO/postgres" --include 'agora-*.sql.gz' || fallo "subir dumps"
rclone delete "$DESTINO/postgres" --min-age "$RETENCION_EXTERNA" || fallo "retencion de dumps"

# 2. Media: espejo directo MinIO -> destino. Lo que se borra en MinIO (bajas
# de cuenta, limpieza de huerfanos) no se pierde de golpe: va a media-borrados
# con fecha y se purga tras RETENCION_EXTERNA. Asi un borrado accidental del
# bucket no se propaga al respaldo de inmediato.
hoy="$(date +%Y%m%d)"
rclone sync "minio:$BUCKET" "$DESTINO/media" --backup-dir "$DESTINO/media-borrados/$hoy" \
  || fallo "espejo de media"
rclone delete "$DESTINO/media-borrados" --min-age "$RETENCION_EXTERNA" --rmdirs \
  || fallo "retencion de media borrada"

echo "Respaldo externo OK: $(date -Is) -> $DESTINO"
[ -n "$PING" ] && curl -fsS -m 10 --retry 3 "$PING" >/dev/null || true
