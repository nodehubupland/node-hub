import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: auth } = await db.auth.getUser(token);
  if (!auth.user) return json({ error: "Unauthorized" }, 401);
  const { data: flag } = await db.from("economy_feature_flags").select("enabled").eq("key", "economy_test").maybeSingle();
  if (!flag?.enabled) return json({ error: "Economy Test is disabled" }, 403);

  // Intentionally no Upland call: do not create pending credits until Upland supplies an approved sandbox/escrow deposit contract.
  // The eventual provider must return an idempotency-safe external reference and a verified confirmation webhook.
  return json({ error: "Upland sandbox escrow provider is not configured; no UPX was moved." }, 501);
});
function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } }); }