// pin-login — shared-device staff PIN login (Deno Edge Function).
// README: POST { locationSlug?: string, locationId?: string, pin: string }
// Verifies the SHA-256 hex of `pin` against profiles.pin_code (service role,
// server-side only) for ACTIVE staff assigned to the outlet. Rate-limited
// best-effort in memory (per-instance; use Redis/Upstash for multi-instance).
//
// On success this function mints a short-lived (8h) HS256 access token signed
// with the Supabase JWT secret. Set it as a custom function secret named
// `JWT_SECRET` (Dashboard → Edge Functions → Secrets — note the dashboard
// forbids the SUPABASE_ prefix for custom names, hence JWT_SECRET).
// If the runtime already injects SUPABASE_JWT_SECRET it is preferred;
// the function FAILS CLOSED when neither is set.
// The token carries `sub = <profile id>` + `role = 'authenticated'`, so
// PostgREST honours it exactly like a normal user session and RLS
// (auth.uid() → profiles → user_locations) applies unchanged. Clients use it
// as `Authorization: Bearer <access_token>` alongside the anon apikey.
// Generic 401s avoid staff enumeration. CORS enabled.
//
// SECURITY: service_role key + JWT secret never leave this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignJWT } from "npm:jose@5";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

// Best-effort in-memory rate limit: 10 attempts / 5 min per location+ip.
const attempts = new Map<string, number[]>();
const WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8h counter shift

function limited(key: string): boolean {
  const now = Date.now();
  const hits = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  attempts.set(key, hits);
  return hits.length > MAX_ATTEMPTS;
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function insecureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "method_not_allowed" }), { status: 405, headers: cors });
  }

  const fail = () =>
    new Response(JSON.stringify({ ok: false, error: "invalid_credentials" }), { status: 401, headers: cors });

  let body: { locationSlug?: string; locationId?: string; location_id?: string; pin?: string };
  try {
    body = await req.json();
  } catch {
    return fail();
  }
  const locationId = body.locationId ?? body.location_id ?? undefined;
  if (!body?.pin || (!body.locationSlug && !locationId)) return fail();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (limited(`${body.locationSlug ?? locationId}:${ip}`)) {
    return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), { status: 429, headers: cors });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // never sent to clients
  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET") ?? Deno.env.get("JWT_SECRET");
  if (!jwtSecret) {
    console.error("pin-login misconfigured: SUPABASE_JWT_SECRET / JWT_SECRET not set — failing closed");
    return new Response(JSON.stringify({ ok: false, error: "server_misconfigured" }), { status: 500, headers: cors });
  }
  const db = createClient(url, serviceKey);

  const locQuery = db.from("locations").select("id, business_id, is_active").limit(1);
  const { data: loc } = locationId
    ? await locQuery.eq("id", locationId).maybeSingle()
    : await locQuery.eq("slug", body.locationSlug).maybeSingle();
  if (!loc || !loc.is_active) return fail();

  const pinHash = await sha256Hex(body.pin);
  const { data: candidates } = await db
    .from("profiles")
    .select("id, email, name, role, business_id, pin_code, is_active")
    .eq("business_id", loc.business_id)
    .eq("is_active", true)
    .not("pin_code", "is", null);

  const match = (candidates ?? []).find((p) => p.pin_code && insecureCompare(p.pin_code, pinHash));
  if (!match) return fail();

  const { data: memberships } = await db
    .from("user_locations")
    .select("location_id")
    .eq("user_id", match.id);
  const locationIds = (memberships ?? []).map((m) => m.location_id as string);
  if (!locationIds.includes(loc.id)) return fail();

  const now = Math.floor(Date.now() / 1000);
  const accessToken = await new SignJWT({
    email: match.email ?? undefined,
    role: "authenticated",
    app_metadata: { provider: "pin", providers: ["pin"] },
    user_metadata: { name: match.name ?? undefined, staff_role: match.role },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(match.id)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(new TextEncoder().encode(jwtSecret));

  await db.from("audit_logs").insert({
    user_id: match.id,
    location_id: loc.id,
    action: "pin_login",
    entity: "profiles",
    entity_id: match.id,
    meta_json: {},
  });

  return new Response(
    JSON.stringify({
      ok: true,
      access_token: accessToken,
      token_type: "bearer",
      expires_in: TOKEN_TTL_SECONDS,
      profile: {
        id: match.id,
        email: match.email,
        name: match.name,
        role: match.role,
        business_id: match.business_id,
      },
      location_ids: locationIds,
    }),
    { headers: cors },
  );
});
