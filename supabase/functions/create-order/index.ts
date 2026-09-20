// create-order — authenticated HTTPS intake wrapper (Deno Edge Function).
// README: for clients that prefer HTTPS over direct postgrest RPC. Requires a
// user JWT (Authorization: Bearer <token>); forwards it so the create_order
// RPC sees auth.uid() and enforces membership/role checks itself.
// POST body: { locationId, orderType, tableId?, customerId?, items[], offerId?,
//   loyaltyRedeem?, paymentMethod? } — same shape as the create_order RPC.
// Returns the RPC result ({ id, totals... }) or a 4xx with the RPC message.
// CORS enabled.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: cors });
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "missing_jwt" }), { status: 401, headers: cors });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: cors });
  }
  if (!body?.locationId || !body?.orderType || !Array.isArray(body?.items)) {
    return new Response(JSON.stringify({ error: "locationId, orderType and items[] are required" }), {
      status: 400,
      headers: cors,
    });
  }

  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } }, // preserve auth.uid() inside the RPC
  });

  const { data, error } = await client.rpc("create_order", {
    p_location_id: body.locationId,
    p_order_type: body.orderType,
    p_table_id: body.tableId ?? null,
    p_customer_id: body.customerId ?? null,
    p_items: body.items,
    p_offer_id: body.offerId ?? null,
    p_loyalty_redeem: body.loyaltyRedeem ?? 0,
    p_payment_method: body.paymentMethod ?? "cash",
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
  }
  return new Response(JSON.stringify(data), { status: 201, headers: cors });
});
