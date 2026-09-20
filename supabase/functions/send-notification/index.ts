// send-notification — staff/device fan-out logger (Deno Edge Function).
// README: POST { type: "order_update"|"low_stock"|"custom", locationId,
//   orderId?, message?, tokens?[] }. Resolves target device_tokens via the
//   service role (staff assigned to locationId, unless explicit tokens are
//   passed), writes a notification-intent row to audit_logs, and returns
//   { queued: n, configured: boolean }. Actual FCM/APNs delivery is
//   configuration-dependent (env FCM_SERVER_KEY); this function NEVER fakes
//   delivery — when unconfigured it only logs the intent. CORS enabled.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const TYPES = ["order_update", "low_stock", "custom"] as const;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: cors });
  }

  let body: { type?: string; locationId?: string; orderId?: string; message?: string; tokens?: string[] };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: cors });
  }
  if (!body?.type || !(TYPES as readonly string[]).includes(body.type) || !body?.locationId) {
    return new Response(JSON.stringify({ error: "type (order_update|low_stock|custom) and locationId required" }), {
      status: 400,
      headers: cors,
    });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let tokens: string[] = Array.isArray(body.tokens) ? body.tokens.filter(Boolean) : [];
  if (tokens.length === 0) {
    const { data: staff } = await db.from("user_locations").select("user_id").eq("location_id", body.locationId);
    const ids = (staff ?? []).map((s) => s.user_id);
    if (ids.length > 0) {
      const { data: rows } = await db.from("device_tokens").select("token").in("user_id", ids);
      tokens = (rows ?? []).map((r) => r.token);
    }
  }

  await db.from("audit_logs").insert({
    user_id: null,
    location_id: body.locationId,
    action: "notification_queued",
    entity: body.orderId ? "orders" : "locations",
    entity_id: body.orderId ?? body.locationId,
    meta_json: { type: body.type, message: body.message ?? null, recipients: tokens.length },
  });

  const configured = Boolean(Deno.env.get("FCM_SERVER_KEY"));
  // Delivery provider call goes here once FCM_SERVER_KEY is set; until then
  // the intent above is the system of record (no fake "sent" claims).
  return new Response(JSON.stringify({ queued: tokens.length, configured }), { headers: cors });
});
