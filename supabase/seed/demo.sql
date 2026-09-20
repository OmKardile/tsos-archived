-- seed/demo.sql — re-runnable local demo bootstrap (run with psql, NOT as a
-- migration: migrations must not contain psql backslash commands).
--
-- Usage (from repo root, with `supabase start` running):
--   psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f supabase/seed/demo.sql
--
-- What it does (all statements idempotent — safe to re-run):
--   1. Verifies the Demo Cafe seed (migrations/0008_seed.sql) is present.
--      On a fresh `supabase db reset` it already is (0008 runs as a
--      migration). For a plain-Postgres restore, load it once manually:
--        \ir ../migrations/0008_seed.sql
--      (kept manual because 0008 uses plain INSERTs — correct for a
--      run-once migration, but not re-runnable, so it is NOT auto-included.)
--   2. Links the demo auth user (created OUTSIDE SQL, see below) to the
--      Demo Cafe business: profile role/business, PIN hash, user_locations,
--      businesses.owner_user_id.
--
-- ── Step 0 (REQUIRED, do this first — never INSERT INTO auth.users raw!) ──
-- Create the demo login via the Auth Admin API, Supabase Studio
-- (Authentication > Users > Add user), or CLI:
--   supabase auth admin create-user --email admin@tsos.dev --password password123 \
--     --user-metadata '{"name":"Demo Owner"}' --email-confirm
-- The handle_new_user() trigger auto-creates a profiles row (role owner).
-- Then run this file; Section 2 below wires that profile to Demo Cafe.

-- ── Section 1: seed presence check ─────────────────────────────────────────
DO $seedcheck$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE slug = 'demo-cafe') THEN
    RAISE EXCEPTION 'Demo seed missing: load supabase/migrations/0008_seed.sql once via psql (\\ir), then re-run this file';
  END IF;
END;
$seedcheck$;

-- ── Section 2: demo auth linkage (idempotent UPDATEs, safe to re-run) ─────
-- PIN 1234 SHA-256 hex is 03ac674216f3e15c761ee1a5e255f067953623c8b388d612aa6aeb12d42a
-- (computed in-DB below via pgcrypto — never hardcode-or-paste hashes).

DO $demo$
DECLARE
  v_demo_biz  uuid := '11111111-1111-1111-1111-111111111111';
  v_demo_loc  uuid := '22222222-2222-2222-2222-222222222222';
  v_uid       uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'admin@tsos.dev';
  IF NOT FOUND THEN
    RAISE NOTICE 'demo auth user admin@tsos.dev not found — create it first (see header), then re-run this file';
    RETURN;
  END IF;

  UPDATE public.profiles
    SET business_id = v_demo_biz,
        role = 'owner',
        name = COALESCE(name, 'Demo Owner'),
        pin_code = encode(digest('1234', 'sha256'), 'hex'),
        is_active = true
    WHERE id = v_uid;

  INSERT INTO public.user_locations (user_id, location_id)
    VALUES (v_uid, v_demo_loc)
    ON CONFLICT DO NOTHING;

  UPDATE public.businesses SET owner_user_id = v_uid
    WHERE id = v_demo_biz AND owner_user_id IS NULL;

  RAISE NOTICE 'demo login ready: admin@tsos.dev / password123 / PIN 1234 @ slug demo-cafe';
END;
$demo$;
