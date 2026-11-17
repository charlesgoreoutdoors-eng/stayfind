// Server-only helpers: identify the caller from their Supabase token and enforce
// monthly plan limits. Import from API routes only (uses the service-role key).
import { createClient } from "@supabase/supabase-js";
import { limitsFor, currentPeriod, USAGE_LABELS } from "./plans";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function authedUser(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from("profiles").select("plan, role, is_admin").eq("id", user.id).maybeSingle();
  return { user, profile: profile || {} };
}

export function unauthorized() {
  return Response.json({ error: "auth", message: "Please sign in again." }, { status: 401 });
}

// Checks (and records) one unit of usage. Admins are never limited.
// Returns { ok: true } or { ok: false, response } ready to return from the route.
export async function useQuota(caller, kind, ref) {
  const { user, profile } = caller;
  if (profile.is_admin) return { ok: true };
  if (profile.role === "hotel") return denied("plan", "This feature is for creator accounts.");

  const plan = profile.plan || "spark";
  const limit = limitsFor(plan)[kind] ?? 0;
  const what = USAGE_LABELS[kind]?.label?.toLowerCase() || "this feature";

  if (limit === 0) {
    const needs = kind === "hunter" ? "Radiant" : "a Glow or Radiant plan";
    return denied("plan", `${kind === "hunter" ? "Named contacts are" : "This is"} available on ${needs}. Upgrade to unlock ${what}.`);
  }

  const period = currentPeriod();
  const { data: existing } = await admin.from("usage_events").select("id")
    .eq("user_id", user.id).eq("kind", kind).eq("ref", ref).eq("period", period).maybeSingle();
  if (existing) return { ok: true };            // already counted this month

  const { count } = await admin.from("usage_events").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("kind", kind).eq("period", period);
  if ((count || 0) >= limit) {
    return denied("limit", `You've used all ${limit} of your monthly ${what}. They reset on the 1st${plan === "glow" ? ", or upgrade to Radiant for more" : ""}.`);
  }

  await admin.from("usage_events").upsert(
    { user_id: user.id, kind, ref, period },
    { onConflict: "user_id,kind,ref,period", ignoreDuplicates: true }
  );
  return { ok: true };
}

// Plan gate only — checks the plan includes this feature at all, without using
// up any of the monthly allowance (used before serving free cached results).
export function canUse(caller, kind) {
  const { profile } = caller;
  if (profile.is_admin) return { ok: true };
  if (profile.role === "hotel") return denied("plan", "This feature is for creator accounts.");
  if ((limitsFor(profile.plan || "spark")[kind] ?? 0) === 0) {
    const needs = kind === "hunter" ? "Radiant" : "a Glow or Radiant plan";
    return denied("plan", `${kind === "hunter" ? "Named contacts are" : "This is"} available on ${needs}.`);
  }
  return { ok: true };
}

function denied(error, message) {
  return { ok: false, response: Response.json({ error, message }, { status: 403 }) };
}
