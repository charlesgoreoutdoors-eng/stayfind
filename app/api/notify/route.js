import { requireUser, gmailAdmin } from "../../../lib/gmailServer";
import { sendNotification, emailShell } from "../../../lib/notify";

// Transactional marketplace notifications. Recipients are derived server-side
// from the DB (never supplied by the client), and the caller is authorized
// against the row they're acting on, so this can't be used to send arbitrary
// email. Best-effort: the triggering action already succeeded client-side.

function siteUrl(request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}

export async function POST(request) {
  const user = await requireUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Bad request" }, { status: 400 }); }
  const { type, applicationId } = body || {};
  if (!applicationId || !type) return Response.json({ error: "Missing type or applicationId" }, { status: 400 });

  // Load application → opportunity → hotel with the service role.
  const { data: app } = await gmailAdmin
    .from("applications")
    .select("id, creator_id, creator_name, status, opportunity_id")
    .eq("id", applicationId).maybeSingle();
  if (!app) return Response.json({ error: "Application not found" }, { status: 404 });

  const { data: opp } = await gmailAdmin
    .from("opportunities").select("id, title, hotel_id").eq("id", app.opportunity_id).maybeSingle();
  if (!opp) return Response.json({ error: "Opportunity not found" }, { status: 404 });

  const { data: hotel } = await gmailAdmin
    .from("hotel_profiles").select("id, name, user_id, contact_email").eq("id", opp.hotel_id).maybeSingle();

  // ── New application → notify the hotel ──────────────────────────
  if (type === "new-application") {
    if (app.creator_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });

    let to = hotel?.contact_email || null;
    if (!to && hotel?.user_id) {
      const { data: hu } = await gmailAdmin.auth.admin.getUserById(hotel.user_id);
      to = hu?.user?.email || null;
    }
    const href = `${siteUrl(request)}/hotel/jobs/${opp.id}`;
    const who = app.creator_name || "A creator";
    const result = await sendNotification({
      to,
      subject: `New applicant for "${opp.title}"`,
      text: `${who} just applied to your opportunity "${opp.title}" on Dapples.\n\nReview applicants: ${href}`,
      html: emailShell(
        "You have a new applicant",
        [`<strong>${who}</strong> applied to your opportunity <strong>"${opp.title}"</strong>.`, "Open it to read their pitch and shortlist them."],
        { href, label: "Review applicants" },
      ),
    });
    return Response.json({ ok: true, ...result });
  }

  // ── Shortlisted → notify the creator ────────────────────────────
  if (type === "shortlisted") {
    if (!hotel || hotel.user_id !== user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
    if (app.status !== "shortlisted") return Response.json({ ok: true, skipped: "status is not shortlisted" });

    const { data: cu } = await gmailAdmin.auth.admin.getUserById(app.creator_id);
    const to = cu?.user?.email || null;
    const href = `${siteUrl(request)}/applications`;
    const result = await sendNotification({
      to,
      subject: `You've been shortlisted — "${opp.title}"`,
      text: `Good news! ${hotel.name || "A hotel"} shortlisted your application for "${opp.title}".\n\nView your applications: ${href}`,
      html: emailShell(
        "You've been shortlisted! 🎉",
        [`<strong>${hotel.name || "A hotel"}</strong> shortlisted your application for <strong>"${opp.title}"</strong>.`, "They may reach out with next steps soon."],
        { href, label: "View my applications" },
      ),
    });
    return Response.json({ ok: true, ...result });
  }

  return Response.json({ error: "Unknown type" }, { status: 400 });
}
