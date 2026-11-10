"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { fmtDate } from "../../lib/marketplace";

const APP_STATUS = {
  new:         { label: "Applied",      bg: "var(--status-sent-bg)",     ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)",  ink: "var(--status-success-ink)" },
  declined:    { label: "Not selected", bg: "var(--status-error-bg)",    ink: "var(--color-error)" },
};

function CalendarIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

export default function JobBoardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [opps, setOpps] = useState([]);
  const [apps, setApps] = useState({});          // opportunity_id -> application
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: rows, error: oErr } = await supabase
      .from("opportunities")
      .select("*, hotel:hotel_profiles ( name, city, country, logo_url )")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (oErr && oErr.code === "42P01") { setNeedsMigration(true); setLoading(false); return; }
    setOpps(rows || []);

    const { data: myApps } = await supabase
      .from("applications").select("id, opportunity_id, status").eq("creator_id", user.id);
    const map = {};
    (myApps || []).forEach(a => { map[a.opportunity_id] = a; });
    setApps(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h1 style={s.title}>Job Board</h1>
        <p style={s.sub}>Collab opportunities posted by hotels. Click one to see the full brief and apply.</p>
      </div>

      {needsMigration && (
        <div style={s.notice}>The job board isn’t set up yet. Run migration <code>0004_opportunities_applications.sql</code>, then reload.</div>
      )}

      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading opportunities…</div>
      ) : opps.length === 0 && !needsMigration ? (
        <div style={s.empty}>
          <span style={{ fontSize: 38 }}>🏨</span>
          <p style={{ fontSize: 15, color: "var(--color-ink-mid)", marginTop: 12, maxWidth: 360, lineHeight: 1.6 }}>
            No open opportunities right now. Check back soon — new hotel collabs appear here as they’re posted.
          </p>
        </div>
      ) : (
        <div style={s.card}>
          <div style={s.tableScroll}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Brand</th>
                  <th style={s.th}>Campaign Title</th>
                  <th style={s.th}>Earnings</th>
                  <th style={s.th}>Other</th>
                  <th style={{ ...s.th, textAlign: "right" }}>Application Deadline</th>
                </tr>
              </thead>
              <tbody>
                {opps.map(o => {
                  const app = apps[o.id];
                  const badge = app ? (APP_STATUS[app.status] || APP_STATUS.new) : null;
                  const hotel = o.hotel || {};
                  return (
                    <tr key={o.id} style={s.tr} onClick={() => router.push(`/jobs/${o.id}`)}>
                      <td style={s.td}>
                        <div style={s.brandCell}>
                          {hotel.logo_url
                            ? <img src={hotel.logo_url} alt="" style={s.brandLogo} />
                            : <div style={s.brandLogoFallback}>{(hotel.name || "H")[0]}</div>}
                          <span style={s.brandName}>{hotel.name || "Hotel"}</span>
                        </div>
                      </td>
                      <td style={s.td}>
                        <span style={s.titleLink}>{o.title}</span>
                        {badge && <span style={{ ...s.appliedChip, background: badge.bg, color: badge.ink }}>{badge.label}</span>}
                      </td>
                      <td style={s.td}>
                        {o.type === "paid"
                          ? <span style={s.earnPill}>{[o.currency, o.payment_amount].filter(v => v != null && v !== "").join(" ")}</span>
                          : <span style={s.dash}>—</span>}
                      </td>
                      <td style={s.td}>
                        {o.other_compensation ? <span style={s.otherText}>{o.other_compensation}</span> : <span style={s.dash}>—</span>}
                      </td>
                      <td style={{ ...s.td, textAlign: "right" }}>
                        {o.application_deadline
                          ? <span style={s.datePill}><CalendarIcon /> {fmtDate(o.application_deadline)}</span>
                          : <span style={s.dash}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  header: { marginBottom: 22 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14.5, color: "var(--color-ink-muted)", marginTop: 6, lineHeight: 1.55 },
  notice: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, marginBottom: 18 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "70px 24px", display: "flex", flexDirection: "column", alignItems: "center" },

  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-low)", overflow: "hidden" },
  tableScroll: { width: "100%", overflowX: "auto" },
  table: { width: "100%", minWidth: 760, borderCollapse: "collapse", fontFamily: "var(--font-body)" },
  th: { textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", padding: "16px 20px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  tr: { cursor: "pointer", borderBottom: "1px solid var(--color-border)" },
  td: { padding: "16px 20px", fontSize: 14, color: "var(--color-ink-primary)", verticalAlign: "middle" },
  brandCell: { display: "flex", alignItems: "center", gap: 11, minWidth: 0 },
  brandLogo: { width: 36, height: 36, borderRadius: 9, objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" },
  brandLogoFallback: { width: 36, height: 36, borderRadius: 9, flexShrink: 0, background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 },
  brandName: { fontSize: 14, fontWeight: 600, color: "var(--color-ink-primary)" },
  titleLink: { fontSize: 14.5, fontWeight: 600, color: "var(--color-action-forest)", lineHeight: 1.35, display: "inline-block" },
  appliedChip: { display: "inline-block", marginLeft: 8, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: "var(--radius-pill)", verticalAlign: "middle", whiteSpace: "nowrap" },
  earnPill: { display: "inline-block", fontSize: 13, fontWeight: 700, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "5px 12px", borderRadius: 8, whiteSpace: "nowrap" },
  otherText: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.5 },
  dash: { color: "var(--color-ink-muted)" },
  datePill: { display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "var(--color-action-forest)", border: "1px solid var(--color-border)", background: "var(--color-ground-card)", padding: "7px 12px", borderRadius: 9, whiteSpace: "nowrap" },
};
