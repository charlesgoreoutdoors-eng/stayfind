// Central access rules for Dapples.
//
// Two user roles: 'creator' (default) and 'hotel'.
// Creator plans:
//   'spark'  = FREE  -> marketplace / job board + applying to opportunities
//   'glow' | 'radiant' | 'founding' = PAID -> unlock the hotel outreach workspace
//
// Keep every tier/role gate going through these helpers so the rules live in
// one place (and so a client-side check always has a server-side twin to add).

export const PAID_PLANS = ["glow", "radiant", "founding"];

// Routes that make up the paid "outreach" workspace. Free creators are sent to
// an upgrade prompt on these; everything else (dashboard, portfolio, settings,
// and the future job board) stays open.
export const OUTREACH_ROUTES = ["/", "/lists", "/sequences", "/messages"];

export function isCreator(profile) {
  // Default to creator when role is absent (e.g. before the role column exists
  // or an older profile row) — matches "existing users become creators".
  return (profile?.role ?? "creator") === "creator";
}

export function isHotel(profile) {
  return profile?.role === "hotel";
}

// The hotel outreach workspace is a paid creator feature. Hotels don't use it,
// and free (spark) creators are blocked behind the upgrade prompt.
export function hasOutreachAccess(profile) {
  if (!profile) return false;
  if (profile.role === "hotel") return false;
  return PAID_PLANS.includes(profile.plan);
}

// Is the given pathname part of the gated outreach workspace?
export function isOutreachRoute(pathname) {
  if (!pathname) return false;
  if (pathname === "/") return true; // logged-in root = the search app
  return OUTREACH_ROUTES.some((r) => r !== "/" && (pathname === r || pathname.startsWith(r + "/")));
}
