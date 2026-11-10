import { createClient } from "@supabase/supabase-js";

// Deletes the CALLER's own account. The user is identified from their JWT, so
// this can only ever delete the authenticated user themselves.
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const userId = data.user.id;
  try {
    // Remove the profile row explicitly (in case it isn't FK-cascaded), then
    // delete the auth user — FK on delete cascade clears hotel_profiles,
    // applications, lists, sequence_jobs, etc.
    await admin.from("profiles").delete().eq("id", userId);
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
