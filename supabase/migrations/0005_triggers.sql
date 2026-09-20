-- 0005_triggers.sql — auth bootstrap + generic audit capture.

-- ── Auto-profile on signup ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, business_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'name', ''),
      NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
      'Staff'
    ),
    'owner',
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Generic audit trigger ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_loc uuid;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    v_loc := NEW.location_id;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    SELECT o.location_id INTO v_loc FROM public.orders o WHERE o.id = NEW.order_id;
  ELSIF TG_TABLE_NAME = 'payments' THEN
    SELECT o.location_id INTO v_loc FROM public.orders o WHERE o.id = NEW.order_id;
  END IF;

  INSERT INTO public.audit_logs (user_id, location_id, action, entity, entity_id, meta_json)
    VALUES (auth.uid(), v_loc, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME,
            NEW.id::text, row_to_json(NEW)::jsonb);
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_order_items ON public.order_items;
CREATE TRIGGER trg_audit_order_items
  AFTER INSERT OR UPDATE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_payments ON public.payments;
CREATE TRIGGER trg_audit_payments
  AFTER INSERT OR UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
