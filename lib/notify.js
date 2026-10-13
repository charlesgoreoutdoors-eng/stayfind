import nodemailer from "nodemailer";

// Transactional (system) email for marketplace notifications — separate from
// the per-user Gmail OAuth sending used for creator outreach.
//
// Configure via env (e.g. a transactional provider's SMTP, or a Gmail app
// password):
//   SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS
//   SMTP_SECURE ("true" for port 465), NOTIFY_FROM (defaults to SMTP_USER)
//
// If SMTP isn't configured, sends are skipped (logged) so the triggering
// action (applying, shortlisting) is never blocked by email.

let cached = null;
function getTransporter() {
  if (cached !== null) return cached;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) { cached = false; return false; }
  cached = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
    auth: { user, pass },
  });
  return cached;
}

export async function sendNotification({ to, subject, text, html }) {
  const transporter = getTransporter();
  const from = process.env.NOTIFY_FROM || process.env.SMTP_USER;
  if (!transporter || !from || !to) {
    console.warn("[notify] skipped (SMTP not configured or no recipient)", { configured: !!transporter, hasRecipient: !!to });
    return { skipped: true };
  }
  try {
    await transporter.sendMail({ from: `Dapples <${from}>`, to, subject, text, html });
    return { sent: true };
  } catch (e) {
    console.error("[notify] send failed:", e.message);
    return { error: e.message };
  }
}

// Minimal on-brand HTML wrapper.
export function emailShell(heading, bodyLines, cta) {
  const paras = bodyLines.map(l => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#5B5248;">${l}</p>`).join("");
  const button = cta
    ? `<a href="${cta.href}" style="display:inline-block;background:#44503A;color:#FBF5EA;text-decoration:none;padding:12px 22px;border-radius:12px;font-weight:700;font-size:14px;">${cta.label}</a>`
    : "";
  return `<div style="background:#FBF5EA;padding:32px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#FFFCF4;border:1px solid rgba(43,39,34,0.08);border-radius:18px;padding:32px;">
      <div style="font-size:22px;font-weight:700;color:#2B2722;margin-bottom:18px;">Dapples</div>
      <h1 style="font-size:19px;font-weight:700;color:#2B2722;margin:0 0 16px;">${heading}</h1>
      ${paras}
      ${button ? `<div style="margin-top:22px;">${button}</div>` : ""}
    </div>
  </div>`;
}
