import { createClient } from "@supabase/supabase-js";

// Service-role client — the only thing allowed to touch gmail_accounts.
export const gmailAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Verify a Supabase JWT (Authorization: Bearer <token>) and return the user.
export async function requireUser(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await gmailAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// Exchange a refresh token for a fresh short-lived access token.
export async function refreshAccessToken(refreshToken) {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID,
        client_secret: process.env.GMAIL_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    return await res.json(); // { access_token, expires_in, scope, token_type }
  } catch {
    return null;
  }
}

// Get a usable access token for a given user from their stored refresh token.
// Returns null if the user has no connected Gmail or the refresh token is dead.
export async function getAccessTokenForUser(userId) {
  const { data } = await gmailAdmin
    .from("gmail_accounts")
    .select("refresh_token, gmail_email")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data?.refresh_token) return null;
  const tok = await refreshAccessToken(data.refresh_token);
  if (!tok?.access_token) return null;
  return { accessToken: tok.access_token, expiresIn: tok.expires_in || 3600, email: data.gmail_email };
}

// Exchange an authorization code for tokens (used on first connect).
export async function exchangeCodeForTokens(code, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  return await res.json(); // { access_token, refresh_token, expires_in, ... }
}
