#!/bin/sh
set -e

echo "[startup] Running database migrations..."
./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma

echo "[startup] Applying performance indexes..."
./node_modules/.bin/prisma db execute --schema ./prisma/schema.prisma --file ./prisma/sql/postgres-performance.sql

if [ "$SKIP_DB_SEED" != "true" ]; then
  echo "[startup] Running seed..."
  ./apps/api/node_modules/.bin/tsx ./apps/api/prisma/seed.ts
fi

echo "[startup] Running medicine CSV import (skips if already imported)..."
./apps/api/node_modules/.bin/tsx ./apps/api/scripts/import-medicines.ts ./medicine_information_export.csv

echo "[startup] Starting API server..."
node apps/api/dist/src/main.js
