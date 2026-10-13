"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

// Application status from the creator's point of view.
const STATUS = {
  new:         { label: "Under review", bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  declined:    { label: "Not selected", bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

export default function MyApplicationsPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select(`
        id, status, pitch, created_at,
        opportunity:opportunities (
          id, title, type, payment_amount, currency, status, location, application_deadline,
          hotel:hotel_profiles ( name, city, country )
        )
      `)
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    if (error && error.code === "42P01") { setNeedsMigration(true); setLoading(false); return; }
    setApps(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const payLabel = (o) => o.type === "paid"
    ? `Paid · ${[o.currency, o.payment_amount].filter(v => v != null && v !== "").join(" ")}`.trim()
    : "Free collab";

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h1 style={s.title}>My Applications</h1>
        <p style={s.sub}>Every collab you’ve applied to and where it stands.</p>
      </div>

      {needsMigration && (
        <div style={s.notice}>The job board isn’t set up yet. Run migration <code>0004_opportunities_applications.sql</code>, then reload.</div>
      )}

      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : apps.length === 0 && !needsMigration ? (
        <div style={s.empty}>
          <span style={{ fontSize: 38 }}>📨</span>
          <p style={{ fontSize: 15, color: "var(--color-ink-mid)", margin: "12px 0 16px", maxWidth: 360, lineHeight: 1.6 }}>
            You haven’t applied to anything yet. Browse the job board to find hotel collabs.
          </p>
          <Link href="/jobs" style={s.cta}>Go to Job Board</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {apps.map(a => {
            const badge = STATUS[a.status] || STATUS.new;
            const o = a.opportunity;
            return (
              <div key={a.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    {o ? (
                      <>
                        <h3 style={s.oppTitle}>{o.title}</h3>
                        <div style={s.hotelLine}>
                          {o.hotel?.name || "Hotel"}
                          {(o.hotel?.city || o.hotel?.country) && ` · ${[o.hotel?.city, o.hotel?.country].filter(Boolean).join(", ")}`}
                        </div>
                      </>
                    ) : (
                      <h3 style={s.oppTitle}>Opportunity no longer available</h3>
                    )}
                  </div>
                  <span style={{ ...s.statusBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
                </div>

                <div style={s.metaRow}>
                  {o && <span style={s.typePill}>{payLabel(o)}</span>}
                  {o?.location && <span>📍 {o.location}</span>}
                  <span>Applied {fmtDate(a.created_at)}</span>
                  {o?.status && o.status !== "open" && <span style={s.closedTag}>Opportunity {o.status}</span>}
                </div>

                {a.pitch && (
                  <div style={s.pitchBox}>
                    <span style={s.pitchLabel}>Your pitch</span>
                    <p style={s.pitchText}>{a.pitch}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 780, margin: "0 auto", padding: "40px 24px 64px" },
  header: { marginBottom: 24 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14.5, color: "var(--color-ink-muted)", marginTop: 6 },
  notice: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, marginBottom: 18 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "64px 24px", display: "flex", flexDirection: "column", alignItems: "center" },
  cta: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", textDecoration: "none", borderRadius: "var(--radius-lg)", padding: "11px 22px", fontSize: 14, fontWeight: 700, fontFamily: "var(--font-display)" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "18px 20px", boxShadow: "var(--shadow-low)" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  oppTitle: { fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)", lineHeight: 1.3 },
  hotelLine: { fontSize: 12.5, color: "var(--color-ink-muted)", marginTop: 3 },
  statusBadge: { fontSize: 11.5, fontWeight: 700, padding: "5px 12px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap", flexShrink: 0 },
  metaRow: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--color-ink-muted)", alignItems: "center", marginTop: 10 },
  typePill: { fontSize: 11.5, fontWeight: 600, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "3px 10px", borderRadius: "var(--radius-pill)" },
  closedTag: { fontSize: 11, fontWeight: 600, color: "var(--color-ink-muted)", fontStyle: "italic" },
  pitchBox: { marginTop: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 },
  pitchLabel: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-ink-muted)", marginBottom: 4 },
  pitchText: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};
