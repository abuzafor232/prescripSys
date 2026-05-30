CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Run after `prisma migrate deploy` because these indexes reference Prisma-created tables.
CREATE INDEX IF NOT EXISTS medicines_brand_trgm_idx
  ON medicines USING gin ("normalizedBrand" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS medicines_generic_trgm_idx
  ON medicines USING gin ("normalizedGeneric" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS medicines_search_trgm_idx
  ON medicines USING gin ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS patients_search_trgm_idx
  ON patients USING gin ("searchText" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
  ON audit_logs ("createdAt" DESC);
