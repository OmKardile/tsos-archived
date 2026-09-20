// payment — payment-intent abstraction (Deno Edge Function).
// README: POST { orderId, method: "cash"|"upi"|"card", amount?, gatewayRef? }.
// Validates the order via the service role (amount/currency truth). Cash is
// recorded immediately through the record_payment RPC using the caller's JWT
// (Authorization required — RPC enforces staff membership). Non-cash returns
// a Razorpay intent stub { gateway: "razorpay", configured, orderId, amount,
// currency: "INR", gatewayRef: null } — Razorpay is configuration-dependent
// (env RAZORPAY_KEY_ID); no credentials are hardcoded anywhere. CORS enabled.

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

  let body: { orderId?: string; method?: string; amount?: number; gatewayRef?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: cors });
  }
  if (!body?.orderId || !["cash", "upi", "card"].includes(body.method ?? "")) {
    return new Response(JSON.stringify({ error: "orderId and method (cash|upi|card) required" }), {
      status: 400,
      headers: cors,
    });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("id, grand_total, payment_status, status")
    .eq("id", body.orderId)
    .maybeSingle();
  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "order_not_found" }), { status: 404, headers: cors });
  }
  if (order.status === "cancelled") {
    return new Response(JSON.stringify({ error: "order_cancelled" }), { status: 400, headers: cors });
  }

  if (body.method === "cash") {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "missing_jwt" }), { status: 401, headers: cors });
    }
    const staff = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data, error } = await staff.rpc("record_payment", {
      p_order_id: body.orderId,
      p_method: "cash",
      p_amount: body.amount ?? Number(order.grand_total),
      p_gateway_ref: body.gatewayRef ?? null,
    });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
    }
    return new Response(JSON.stringify({ recorded: true, payment: data }), { headers: cors });
  }

  // Online methods: intent stub until the Razorpay keys are configured.
  return new Response(
    JSON.stringify({
      gateway: "razorpay",
      configured: Boolean(Deno.env.get("RAZORPAY_KEY_ID")),
      orderId: order.id,
      amount: Number(order.grand_total),
      currency: "INR",
      gatewayRef: null,
      note: "create the Razorpay order server-side once RAZORPAY_KEY_ID/SECRET are set; confirm via record_payment",
    }),
    { headers: cors },
  );
});
