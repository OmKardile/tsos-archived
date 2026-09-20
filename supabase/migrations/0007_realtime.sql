-- 0007_realtime.sql — publish hot tables on supabase_realtime.

DO $pub$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'publication supabase_realtime missing — skipping realtime setup';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY[
    'orders', 'order_items', 'ingredients',
    'dine_tables', 'payments', 'loyalty_ledger'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime'
                     AND schemaname = 'public'
                     AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END;
$pub$;
