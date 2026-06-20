import { requireUser, exchangeCodeForTokens, gmailAdmin } from "../../../../lib/gmailServer";

// Called by the client after the OAuth popup returns an authorization code.
// Exchanges the code for tokens, stores the refresh token, returns a fresh access token.
export async function POST(request) {
  const user = await requireUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { code, redirectUri } = await request.json();
    if (!code || !redirectUri) return Response.json({ error: "Missing code" }, { status: 400 });

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens?.access_token) {
      return Response.json({ error: "Token exchange failed" }, { status: 400 });
    }

    // Fetch the connected Gmail address
    let email = "";
    try {
      const ures = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const udata = await ures.json();
      email = udata.email || "";
    } catch {}

    // Persist the refresh token. Only overwrite it when Google actually returned one
    // (it does whenever prompt=consent, which we always send).
    const row = { user_id: user.id, gmail_email: email, updated_at: new Date().toISOString() };
    if (tokens.refresh_token) row.refresh_token = tokens.refresh_token;

    if (!tokens.refresh_token) {
      // No refresh token and no existing record means we can't persist the connection.
      const { data: existing } = await gmailAdmin
        .from("gmail_accounts").select("refresh_token").eq("user_id", user.id).maybeSingle();
      if (!existing?.refresh_token) {
        return Response.json({ error: "No refresh token returned — please reconnect and allow access." }, { status: 400 });
      }
    }

    const { error } = await gmailAdmin.from("gmail_accounts").upsert(row, { onConflict: "user_id" });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({
      connected: true,
      accessToken: tokens.access_token,
      expiresIn: tokens.expires_in || 3600,
      email,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
