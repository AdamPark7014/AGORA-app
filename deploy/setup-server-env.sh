#!/bin/bash
set -euo pipefail
APP=/var/www/udlagora-app
BREVO_KEY=$(grep '^BREVO_API_KEY=' /var/www/udlagora-app/.env 2>/dev/null | cut -d= -f2-)
BREVO_EMAIL=$(grep '^MAIL_FROM=' /var/www/udlagora-app/.env 2>/dev/null | sed 's/.*<\(.*\)>.*/\1/' || true)
if [ -z "$BREVO_KEY" ] && [ -f /var/www/udlagora-app/.env ]; then
  BREVO_KEY=$(grep '^BREVO_API_KEY=' /var/www/udlagora-app/.env | cut -d= -f2-)
  BREVO_EMAIL=$(grep '^MAIL_FROM=' /var/www/udlagora-app/.env | sed 's/.*<\(.*\)>.*/\1/')
fi
if [ -z "$BREVO_KEY" ]; then
  echo "Falta BREVO_API_KEY en .env local o en /var/www/udlagora-app/.env" >&2
  exit 1
fi
SESSION_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
MINIO_ROOT_USER=agora$(openssl rand -hex 4)
MINIO_ROOT_PASSWORD=$(openssl rand -hex 20)
VAPID_KEYS=$(npx --yes web-push generate-vapid-keys 2>/dev/null || true)
VAPID_PUBLIC=$(echo "$VAPID_KEYS" | awk '/Public Key/{getline; print}' | tr -d '[:space:]')
VAPID_PRIVATE=$(echo "$VAPID_KEYS" | awk '/Private Key/{getline; print}' | tr -d '[:space:]')

cat > "$APP/deploy/.env" <<EOF
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

cp "$APP/deploy/traefik/udlagora.yml" /opt/traefik/config/udlagora.yml
chmod 600 "$APP/deploy/.env"
echo "Env and traefik config ready"
