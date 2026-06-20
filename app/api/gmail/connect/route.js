import { requireUser, exchangeCodeForTokens, gmailAdmin } from "../../../../lib/gmailServer";
import { google } from "googleapis";

const LABEL_NAME = "StayFind";

async function getOrCreateLabel(accessToken) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const listRes = await gmail.users.labels.list({ userId: "me" });
  const existing = (listRes.data.labels || []).find(l => l.name === LABEL_NAME);
  if (existing) return existing.id;

  const createRes = await gmail.users.labels.create({
    userId: "me",
    requestBody: {
      name: LABEL_NAME,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    },
  });
  return createRes.data.id;
}

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
      console.error("Token exchange failed:", JSON.stringify(tokens));
      return Response.json({ error: "Token exchange failed", detail: tokens?.error_description || tokens?.error || "no access_token" }, { status: 400 });
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

    // Create (or find) the StayFind label in Gmail
    let labelId = null;
    try {
      labelId = await getOrCreateLabel(tokens.access_token);
    } catch (e) {
      console.error("[gmail connect] label create failed:", e.message);
    }

    // Persist the refresh token. Only overwrite it when Google actually returned one
    // (it does whenever prompt=consent, which we always send).
    const row = { user_id: user.id, gmail_email: email, updated_at: new Date().toISOString() };
    if (tokens.refresh_token) row.refresh_token = tokens.refresh_token;
    if (labelId) row.label_id = labelId;

    if (!tokens.refresh_token) {
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
