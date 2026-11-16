"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { compensationLabel } from "../lib/marketplace";
import NewMessagesCard from "./NewMessagesCard";

const STATUS = {
  invited:     { label: "Invited",      bg: "rgba(224,149,74,0.16)",    ink: "var(--color-accent-amber-deep)" },
  new:         { label: "Under review", bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  declined:    { label: "Not selected", bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" }); } catch { return ""; }
}

// Dashboard for free (Spark) creators — focused on the marketplace.
export default function FreeDashboard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [samples, setSamples] = useState(0);
  const [kits, setKits] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const [a, j, ws, pf] = await Promise.all([
        supabase.from("applications")
          .select("id, status, created_at, opportunity:opportunities ( id, title, hotel:hotel_profiles ( name ) )")
          .eq("creator_id", user.id).order("created_at", { ascending: false }),
        supabase.from("opportunities")
          .select("id, title, type, payment_amount, currency, other_compensation, location, hotel:hotel_profiles ( name )")
          .eq("status", "open").order("created_at", { ascending: false }).limit(5),
        supabase.from("work_samples").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("portfolios").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      if (!active) return;
      setApps(a.data || []);
      setJobs(j.data || []);
      setSamples(ws.count || 0);
      setKits(pf.count || 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const name = (profile?.first_name || profile?.full_name || user?.email?.split("@")[0] || "there").split(" ")[0];
  const count = (st) => apps.filter(a => (a.status || "new") === st).length;
  const appliedIds = new Set(apps.map(a => a.opportunity?.id).filter(Boolean));
  const newJobs = jobs.filter(j => !appliedIds.has(j.id)).slice(0, 4);

  const socials = profile?.socials || {};
  const hasSocials = Object.keys(socials).some(k => k !== "followers" && socials[k]);
  const checklist = [
    { label: "Set your creator preferences", done: !!profile?.creator_type, href: "/preferences" },
    { label: "Connect your socials",         done: hasSocials,              href: "/socials" },
    { label: "Upload content examples",      done: samples > 0,             href: "/portfolio" },
    { label: "Add a media kit",              done: kits > 0,                href: "/portfolio" },
  ];
  const doneCount = checklist.filter(c => c.done).length;

  if (loading) return <div style={s.root}><div style={s.loadingWrap}><div style={s.spinner} /></div></div>;

  return (
    <div style={s.root}>
      <div style={s.greeting}>
        <h1 style={s.greetTitle}>Good to see you, {name} 👋</h1>
        <p style={s.greetSub}>Here&apos;s how your applications are going.</p>
      </div>

      <div style={s.statsGrid}>
        {[
          { label: "Applied",      value: apps.length,        color: "var(--color-action-forest)",     sub: "total applications" },
          { label: "Under review", value: count("new"),       color: "var(--color-cool-olive-mid)",    sub: "waiting on hotels" },
          { label: "Shortlisted",  value: count("shortlisted"), color: "var(--color-accent-amber-deep)", sub: "you’re in the running" },
          { label: "Invited",      value: count("invited"),   color: "var(--color-accent-terracotta)", sub: "hotels reached out" },
        ].map(st => (
          <div key={st.label} style={s.statCard}>
            <p style={s.statLabel}>{st.label}</p>
            <p style={{ ...s.statValue, color: st.color }}>{st.value}</p>
            <p style={s.statSub}>{st.sub}</p>
          </div>
        ))}
      </div>

      <div className="dp-dash-body" style={s.bodyGrid}>
        <div style={s.col}>
          <div style={s.card}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>New opportunities</h2>
              <Link href="/jobs" style={s.sectionLink}>Browse all</Link>
            </div>
            {newJobs.length === 0 ? (
              <div style={s.emptyBox}>
                <p style={s.emptyText}>No new opportunities right now. Check back soon.</p>
                <Link href="/jobs" style={s.ctaBtn}>Open the job board</Link>
              </div>
            ) : newJobs.map(j => (
              <Link key={j.id} href={`/jobs/${j.id}`} style={s.row}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={s.rowTitle}>{j.title}</p>
                  <p style={s.rowSub}>{[j.hotel?.name, j.location].filter(Boolean).join(" · ")}</p>
                </div>
                <span style={s.pill}>{compensationLabel(j)}</span>
              </Link>
            ))}
          </div>

          <div style={s.card}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>Recent applications</h2>
              {apps.length > 0 && <Link href="/applications" style={s.sectionLink}>View all</Link>}
            </div>
            {apps.length === 0 ? (
              <div style={s.emptyBox}>
                <p style={s.emptyText}>You haven’t applied to anything yet. Find a collab that fits and send your pitch.</p>
                <Link href="/jobs" style={s.ctaBtn}>Find opportunities</Link>
              </div>
            ) : apps.slice(0, 5).map(a => {
              const b = STATUS[a.status] || STATUS.new;
              return (
                <Link key={a.id} href={a.opportunity?.id ? `/jobs/${a.opportunity.id}` : "/applications"} style={s.row}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={s.rowTitle}>{a.opportunity?.title || "Opportunity"}</p>
                    <p style={s.rowSub}>{a.opportunity?.hotel?.name || "Hotel"} · applied {fmtDate(a.created_at)}</p>
                  </div>
                  <span style={{ ...s.pill, background: b.bg, color: b.ink }}>{b.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div style={s.col}>
          <NewMessagesCard />
          <div style={s.card}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>Complete your profile</h2>
              <span style={s.progress}>{doneCount}/{checklist.length}</span>
            </div>
            <div style={s.track}><div style={{ ...s.fill, width: `${(doneCount / checklist.length) * 100}%` }} /></div>
            {checklist.map(c => (
              <Link key={c.label} href={c.href} style={s.checkRow}>
                <span style={{ ...s.check, ...(c.done ? s.checkDone : {}) }}>{c.done ? "✓" : ""}</span>
                <span style={{ ...s.checkLabel, ...(c.done ? { color: "var(--color-ink-muted)", textDecoration: "line-through" } : {}) }}>{c.label}</span>
              </Link>
            ))}
            <p style={s.hint}>Hotels see this when you apply, so a complete profile helps you get shortlisted.</p>
          </div>

          <div style={s.upgrade}>
            <div style={s.upgradeBadge}>Spark · Free</div>
            <h3 style={s.upgradeTitle}>Pitch hotels directly</h3>
            <p style={s.upgradeText}>Upgrade to search hotels worldwide, find contact emails and Instagram handles, and run automated outreach sequences.</p>
            <a href="mailto:hello@dapples.io?subject=Upgrade%20my%20plan" style={s.upgradeBtn}>Upgrade plan</a>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { padding: "36px 40px 48px", maxWidth: 1160, margin: "0 auto" },
  loadingWrap: { display: "flex", justifyContent: "center", paddingTop: 80 },
  spinner: { width: 24, height: 24, border: "2.5px solid var(--color-ground-sand)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  greeting: { marginBottom: 26 },
  greetTitle: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 4, color: "var(--color-ink-primary)" },
  greetSub: { fontSize: 14, color: "var(--color-ink-mid)" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 26 },
  statCard: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-low)", padding: "16px 18px" },
  statLabel: { fontSize: 11, fontWeight: 700, color: "var(--color-ink-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: 700, marginBottom: 2 },
  statSub: { fontSize: 11, color: "var(--color-ink-faint)" },
  bodyGrid: { display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" },
  col: { display: "flex", flexDirection: "column", gap: 20, minWidth: 0 },
  card: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-low)", padding: "20px 22px" },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-ink-primary)" },
  sectionLink: { fontSize: 12, color: "var(--color-accent-amber-deep)", fontWeight: 700, textDecoration: "none" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(43,39,34,0.07)", textDecoration: "none" },
  rowTitle: { fontSize: 13.5, fontWeight: 600, color: "var(--color-ink-primary)", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowSub: { fontSize: 11.5, color: "var(--color-ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pill: { fontSize: 11, fontWeight: 700, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", borderRadius: "var(--radius-pill)", padding: "4px 11px", flexShrink: 0, whiteSpace: "nowrap" },
  emptyBox: { textAlign: "center", padding: "18px 0 6px" },
  emptyText: { fontSize: 13.5, color: "var(--color-ink-muted)", marginBottom: 16, lineHeight: 1.55 },
  ctaBtn: { display: "inline-block", padding: "10px 22px", background: "var(--color-action-forest)", color: "var(--color-ground-page)", borderRadius: "var(--radius-lg)", fontSize: 13.5, fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-display)" },
  progress: { fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)" },
  track: { height: 6, borderRadius: 3, background: "rgba(43,39,34,0.08)", overflow: "hidden", marginBottom: 12 },
  fill: { height: "100%", background: "var(--color-accent-amber)", transition: "width 0.3s ease" },
  checkRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0", textDecoration: "none" },
  check: { width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "var(--color-ground-page)", flexShrink: 0 },
  checkDone: { background: "var(--color-cool-olive-deep)", borderColor: "var(--color-cool-olive-deep)" },
  checkLabel: { fontSize: 13, fontWeight: 600, color: "var(--color-ink-primary)" },
  hint: { fontSize: 11.5, color: "var(--color-ink-muted)", marginTop: 10, lineHeight: 1.5 },
  upgrade: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", borderRadius: "var(--radius-card)", padding: "22px" },
  upgradeBadge: { display: "inline-block", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", background: "rgba(255,255,255,0.16)", borderRadius: "var(--radius-pill)", padding: "4px 10px", marginBottom: 12 },
  upgradeTitle: { fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 8 },
  upgradeText: { fontSize: 13, lineHeight: 1.55, opacity: 0.9, marginBottom: 16 },
  upgradeBtn: { display: "inline-block", background: "var(--color-ground-page)", color: "var(--color-action-forest)", borderRadius: "var(--radius-lg)", padding: "10px 20px", fontSize: 13.5, fontWeight: 700, textDecoration: "none", fontFamily: "var(--font-display)" },
};
