-- 0011_staff_rpc_lockdown.sql — remove PUBLIC execute from staff-only RPCs.
-- (Production received this as an ad-hoc cleanup migration on 2026-09-17;
-- this file makes fresh setups converge to the same ACL. 0010 already
-- revoked PUBLIC on internals and anon on staff RPCs; PUBLIC inheritance
-- meant anon was still covered, so PUBLIC goes too. Explicit authenticated
-- grants from 0004/0010 are unaffected.)

REVOKE EXECUTE ON FUNCTION public.create_order(uuid, text, uuid, uuid, jsonb, uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.transition_order_status(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_payment(uuid, text, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restock_ingredient(uuid, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_ingredient(uuid, numeric, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_fee_period(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.report_top_items(uuid, timestamptz, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_business_for_owner() FROM PUBLIC;
