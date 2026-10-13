"use client";
import Link from "next/link";

// Shown when a free (spark) creator tries to open the paid outreach workspace.
// The job board / marketplace stays open to free creators — this only guards
// the hotel-outreach surfaces (search, lists, flows, messages).
export default function UpgradePrompt() {
  return (
    <main style={s.wrap}>
      <span style={{ ...orb, top: -60, left: "14%", width: 260, height: 260, background: "var(--color-glow-1)", opacity: 0.35, filter: "blur(70px)" }} />
      <span style={{ ...orb, bottom: -50, right: "12%", width: 220, height: 220, background: "var(--color-glow-3)", opacity: 0.28, filter: "blur(65px)" }} />

      <div style={s.card}>
        <div style={s.badge}>Paid feature</div>
        <h1 style={s.title}>Outreach is part of a paid plan</h1>
        <p style={s.body}>
          Your free account includes the job board — browse opportunities and apply
          to collabs. To search hotels, build lists and run automated email flows,
          upgrade to a paid plan.
        </p>

        <div style={s.actions}>
          <a href="mailto:hello@dapples.io?subject=Upgrade%20my%20plan" style={s.primary}>
            Upgrade plan
          </a>
          <Link href="/dashboard" style={s.secondary}>
            Back to dashboard
          </Link>
        </div>

        <p style={s.hint}>
          Already upgraded? It can take a moment to apply — try refreshing, or contact us.
        </p>
      </div>
    </main>
  );
}

const orb = { position: "absolute", borderRadius: "50%", pointerEvents: "none" };

const s = {
  wrap: { position: "relative", overflow: "hidden", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--color-ground-nav-tint)", fontFamily: "var(--font-body)", color: "var(--color-ink-primary)" },
  card: { position: "relative", width: "100%", maxWidth: 480, background: "var(--color-ground-card)", borderRadius: 22, border: "1px solid rgba(43,39,34,0.08)", boxShadow: "0 26px 56px -34px rgba(120,80,30,0.5)", padding: "40px 38px", textAlign: "center" },
  badge: { display: "inline-block", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--color-accent-amber-deep)", background: "rgba(224,149,74,0.14)", borderRadius: "var(--radius-pill)", padding: "5px 12px", marginBottom: 16 },
  title: { fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 1.6, color: "var(--color-ink-mid)", maxWidth: "38ch", margin: "0 auto 26px" },
  actions: { display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" },
  primary: { display: "inline-block", background: "var(--color-action-forest)", color: "var(--color-ground-page)", textDecoration: "none", borderRadius: "var(--radius-lg)", padding: "13px 24px", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" },
  secondary: { display: "inline-block", background: "transparent", color: "var(--color-ink-primary)", textDecoration: "none", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "13px 24px", fontSize: 14, fontWeight: 600 },
  hint: { fontSize: 12.5, color: "var(--color-ink-muted)", marginTop: 20 },
};
