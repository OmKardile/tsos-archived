-- 0001_extensions.sql — required Postgres extensions for TSOS.
-- Run first; everything else depends on gen_random_uuid() and citext.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Required for locations.slug CITEXT (case-insensitive unique outlet slugs).
CREATE EXTENSION IF NOT EXISTS citext;
