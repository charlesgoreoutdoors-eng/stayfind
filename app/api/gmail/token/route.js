import { requireUser, getAccessTokenForUser } from "../../../../lib/gmailServer";

// Returns a fresh access token for the logged-in user, minted from their stored
// refresh token. The client calls this on load and before each token expiry.
export async function GET(request) {
  const user = await requireUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tok = await getAccessTokenForUser(user.id);
  if (!tok) return Response.json({ connected: false });

  return Response.json({
    connected: true,
    accessToken: tok.accessToken,
    expiresIn: tok.expiresIn,
    email: tok.email,
  });
}
