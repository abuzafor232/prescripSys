#!/bin/sh
set -e

./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma
./node_modules/.bin/prisma db execute --schema ./prisma/schema.prisma --file ./prisma/sql/postgres-performance.sql

if [ "$SKIP_DB_SEED" != "true" ]; then
  ./apps/api/node_modules/.bin/tsx ./apps/api/prisma/seed.ts
fi

node apps/api/dist/src/main.js
