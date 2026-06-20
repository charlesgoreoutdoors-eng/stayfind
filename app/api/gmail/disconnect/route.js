import { requireUser, gmailAdmin } from "../../../../lib/gmailServer";

export async function POST(request) {
  const user = await requireUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await gmailAdmin.from("gmail_accounts").delete().eq("user_id", user.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
