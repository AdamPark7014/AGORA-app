#!/bin/bash
# Prepara deploy/.env (primera vez o completa claves faltantes) e instala la ruta Traefik.
# Si deploy/.env ya existe: NO regenera SESSION_SECRET / Postgres / MinIO — solo rellena
# claves ausentes. Evita dejar la BD inaccesible tras un "setup" accidental.
set -euo pipefail

APP=/var/www/udlagora-app
ENV_FILE="$APP/deploy/.env"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

get_env() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- || true
}

set_if_missing() {
  local key="$1" value="$2"
  if [ -f "$ENV_FILE" ] && grep -qE "^${key}=" "$ENV_FILE"; then
    return 0
  fi
  printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
}

BREVO_KEY="$(get_env /var/www/udlagora-app/.env BREVO_API_KEY)"
BREVO_EMAIL="$(get_env /var/www/udlagora-app/.env MAIL_FROM)"
if [ -n "$BREVO_EMAIL" ]; then
  BREVO_EMAIL="$(echo "$BREVO_EMAIL" | sed -n 's/.*<\(.*\)>.*/\1/p')"
fi
if [ -z "$BREVO_KEY" ] && [ -f /var/www/udlagora-app/.env ]; then
  BREVO_KEY="$(get_env /var/www/udlagora-app/.env BREVO_API_KEY)"
  BREVO_EMAIL="$(get_env /var/www/udlagora-app/.env MAIL_FROM | sed -n 's/.*<\(.*\)>.*/\1/p')"
fi

ensure_vapid() {
  local pub priv
  pub="$(get_env "$ENV_FILE" VAPID_PUBLIC_KEY)"
  priv="$(get_env "$ENV_FILE" VAPID_PRIVATE_KEY)"
  if [ -n "$pub" ] && [ -n "$priv" ]; then
    return 0
  fi
  local keys
  keys="$(npx --yes web-push generate-vapid-keys 2>/dev/null || true)"
  pub="$(echo "$keys" | awk '/Public Key/{getline; print}' | tr -d '[:space:]')"
  priv="$(echo "$keys" | awk '/Private Key/{getline; print}' | tr -d '[:space:]')"
  set_if_missing VAPID_PUBLIC_KEY "${pub}"
  set_if_missing VAPID_PRIVATE_KEY "${priv}"
}

if [ -f "$ENV_FILE" ]; then
  echo "deploy/.env existe: solo se completan claves faltantes (secretos intactos)."

  if [ -z "$(get_env "$ENV_FILE" BREVO_API_KEY)" ]; then
    if [ -z "$BREVO_KEY" ]; then
      echo "Falta BREVO_API_KEY en deploy/.env y en /var/www/udlagora-app/.env" >&2
      exit 1
    fi
    set_if_missing BREVO_API_KEY "$BREVO_KEY"
  fi

  set_if_missing POSTGRES_USER agora
  set_if_missing POSTGRES_PASSWORD "$(openssl rand -hex 16)"
  set_if_missing POSTGRES_DB agora
  set_if_missing TZ America/Mexico_City
  set_if_missing SESSION_SECRET "$(openssl rand -hex 32)"
  set_if_missing MAIL_PROVIDER brevo
  set_if_missing MAIL_FROM "Ágora <${BREVO_EMAIL:-contacto@udlagora.com}>"
  set_if_missing NEXT_PUBLIC_WEB_URL https://udlagora.com
  set_if_missing COOKIE_DOMAIN .udlagora.com
  set_if_missing OPENAI_API_KEY ""
  set_if_missing MODERACION_OPCIONAL ""
  set_if_missing MINIO_ROOT_USER "agora$(openssl rand -hex 4)"
  set_if_missing MINIO_ROOT_PASSWORD "$(openssl rand -hex 20)"
  set_if_missing S3_BUCKET agora-media
  set_if_missing S3_PUBLIC_URL https://udlagora.com/media/agora-media
  set_if_missing VAPID_SUBJECT "mailto:${BREVO_EMAIL:-contacto@udlagora.com}"
  ensure_vapid
else
  if [ -z "$BREVO_KEY" ]; then
    echo "Falta BREVO_API_KEY en .env local o en /var/www/udlagora-app/.env" >&2
    exit 1
  fi

  SESSION_SECRET="$(openssl rand -hex 32)"
  POSTGRES_PASSWORD="$(openssl rand -hex 16)"
  MINIO_ROOT_USER="agora$(openssl rand -hex 4)"
  MINIO_ROOT_PASSWORD="$(openssl rand -hex 20)"
  VAPID_KEYS="$(npx --yes web-push generate-vapid-keys 2>/dev/null || true)"
  VAPID_PUBLIC="$(echo "$VAPID_KEYS" | awk '/Public Key/{getline; print}' | tr -d '[:space:]')"
  VAPID_PRIVATE="$(echo "$VAPID_KEYS" | awk '/Private Key/{getline; print}' | tr -d '[:space:]')"

  cat > "$ENV_FILE" <<EOF
POSTGRES_USER=agora
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=agora
TZ=America/Mexico_City

SESSION_SECRET=${SESSION_SECRET}
MAIL_PROVIDER=brevo
BREVO_API_KEY=${BREVO_KEY}
MAIL_FROM=Ágora <${BREVO_EMAIL:-contacto@udlagora.com}>

NEXT_PUBLIC_WEB_URL=https://udlagora.com
COOKIE_DOMAIN=.udlagora.com
# Sin bypass silencioso: rellena OPENAI_API_KEY o pon MODERACION_OPCIONAL=true.
OPENAI_API_KEY=
MODERACION_OPCIONAL=

MINIO_ROOT_USER=${MINIO_ROOT_USER}
MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}
S3_BUCKET=agora-media
S3_PUBLIC_URL=https://udlagora.com/media/agora-media
VAPID_PUBLIC_KEY=${VAPID_PUBLIC}
VAPID_PRIVATE_KEY=${VAPID_PRIVATE}
VAPID_SUBJECT=mailto:${BREVO_EMAIL:-contacto@udlagora.com}
EOF
  echo "Creado $ENV_FILE (secretos nuevos)."
fi

chmod 600 "$ENV_FILE"

# Copia la ruta Traefik sin verificar aún (compose puede no estar arriba).
# Tras `compose up`, ejecuta: bash deploy/install-traefik-route.sh
SKIP_VERIFY=1 bash "$SCRIPT_DIR/install-traefik-route.sh"

echo "Env and traefik config ready"
