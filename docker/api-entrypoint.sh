#!/bin/sh
set -e
cd /repo

echo "Aplicando migraciones…"
PRISMA_CLI=$(find node_modules/.pnpm -path '*/node_modules/prisma/build/index.js' 2>/dev/null | head -1)
if [ -z "$PRISMA_CLI" ]; then
  echo "No se encontró el CLI de Prisma" >&2
  exit 1
fi
node "$PRISMA_CLI" migrate deploy --schema=packages/db/prisma/schema.prisma

exec node apps/api/dist/main.js
