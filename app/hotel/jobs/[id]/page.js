"use client";
import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/auth";

const APP_STATUS = {
  new:         { label: "New",          bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  declined:    { label: "Declined",     bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}

export default function OpportunityApplicantsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [opp, setOpp] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
    if (!o) { setNotFound(true); setLoading(false); return; }
    setOpp(o);
    const { data: rows } = await supabase
      .from("applications").select("*").eq("opportunity_id", id).order("created_at", { ascending: false });
    setApps(rows || []);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (a, status) => {
    const next = a.status === status ? "new" : status;   // click again to clear
    setSavingId(a.id);
    const { error: err } = await supabase.from("applications").update({ status: next }).eq("id", a.id);
    setSavingId(null);
    if (err) {
      alert(err.message?.includes("row-level security")
        ? "You can only action applicants on your own opportunities."
        : "Could not update: " + err.message);
      return;
    }
    setApps(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
    if (next === "shortlisted") {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ type: "shortlisted", applicationId: a.id }),
          }).catch(() => {});
        }
      } catch {}
    }
  };

  const linkIsUrl = (v) => v && /^https?:\/\//i.test(v);

  return (
    <div style={s.wrap}>
      <Link href="/hotel/jobs" style={s.back}>← Back to Jobs</Link>

      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : notFound ? (
        <div style={s.notice}>Opportunity not found.</div>
      ) : (
        <>
          <div style={s.head}>
            <h1 style={s.title}>{opp.title}</h1>
            <div style={s.metaRow}>
              <span style={s.typePill}>{opp.type === "paid" ? `Paid · ${[opp.currency, opp.payment_amount].filter(v => v != null && v !== "").join(" ")}`.trim() : "Free collab"}</span>
              <span style={s.statusPill}>{opp.status}</span>
            </div>
          </div>

          <h2 style={s.sectionTitle}>Applicants <span style={s.count}>{apps.length}</span></h2>

          {apps.length === 0 ? (
            <div style={s.empty}>No applications yet. They’ll appear here as creators apply.</div>
          ) : (
            <div style={s.card}>
              <div style={s.tableScroll}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={{ ...s.th, width: 28 }}></th>
                      <th style={s.th}>Creator</th>
                      <th style={s.th}>Pitch</th>
                      <th style={s.th}>Applied</th>
                      <th style={s.th}>Status</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map(a => {
                      const badge = APP_STATUS[a.status] || APP_STATUS.new;
                      const isOpen = expanded === a.id;
                      const busy = savingId === a.id;
                      return (
                        <Fragment key={a.id}>
                          <tr style={s.tr} onClick={() => setExpanded(isOpen ? null : a.id)}>
                            <td style={{ ...s.td, color: "var(--color-ink-muted)" }}>{isOpen ? "▾" : "▸"}</td>
                            <td style={s.td}>
                              <div style={s.name}>{a.creator_name || "Creator"}</div>
                              {a.creator_link && (linkIsUrl(a.creator_link)
                                ? <a href={a.creator_link} target="_blank" rel="noreferrer" style={s.link} onClick={e => e.stopPropagation()}>{a.creator_link}</a>
                                : <span style={s.linkPlain}>{a.creator_link}</span>)}
                            </td>
                            <td style={{ ...s.td, maxWidth: 360 }}><div style={s.pitchClip}>{a.pitch || "—"}</div></td>
                            <td style={s.td}>{fmtDate(a.created_at)}</td>
                            <td style={s.td}><span style={{ ...s.badge, background: badge.bg, color: badge.ink }}>{badge.label}</span></td>
                            <td style={{ ...s.td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                              <div style={s.actions}>
                                <button style={{ ...s.shortlistBtn, ...(a.status === "shortlisted" ? s.shortlistActive : {}), ...(busy ? s.busy : {}) }} onClick={() => updateStatus(a, "shortlisted")} disabled={busy}>{a.status === "shortlisted" ? "✓ Shortlisted" : "Shortlist"}</button>
                                <button style={{ ...s.declineBtn, ...(a.status === "declined" ? s.declineActive : {}), ...(busy ? s.busy : {}) }} onClick={() => updateStatus(a, "declined")} disabled={busy}>{a.status === "declined" ? "Declined" : "Decline"}</button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td />
                              <td colSpan={5} style={s.expandCell}>
                                <div style={s.expandLabel}>Full pitch</div>
                                <p style={s.expandPitch}>{a.pitch || "No pitch provided."}</p>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 940, margin: "0 auto", padding: "32px 24px 64px" },
  back: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 20 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  notice: { background: "var(--status-error-bg)", color: "var(--color-error)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14 },
  head: { marginBottom: 22 },
  title: { fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  metaRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
  typePill: { fontSize: 11.5, fontWeight: 700, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },
  statusPill: { fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 14 },
  count: { fontSize: 13, fontWeight: 700, color: "var(--color-ink-muted)", background: "var(--color-ground-sand)", padding: "2px 9px", borderRadius: "var(--radius-pill)", marginLeft: 4 },
  empty: { background: "var(--color-ground-card)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", padding: "36px 24px", textAlign: "center", color: "var(--color-ink-muted)", fontSize: 14 },

  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-low)", overflow: "hidden" },
  tableScroll: { width: "100%", overflowX: "auto" },
  table: { width: "100%", minWidth: 720, borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", padding: "14px 16px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  tr: { cursor: "pointer", borderBottom: "1px solid var(--color-border)" },
  td: { padding: "14px 16px", fontSize: 13.5, color: "var(--color-ink-primary)", verticalAlign: "middle" },
  name: { fontSize: 14, fontWeight: 700, color: "var(--color-ink-primary)" },
  link: { display: "inline-block", fontSize: 12, color: "var(--color-accent-amber-deep)", fontWeight: 600, textDecoration: "none", marginTop: 2, wordBreak: "break-all" },
  linkPlain: { display: "inline-block", fontSize: 12, color: "var(--color-ink-muted)", marginTop: 2 },
  pitchClip: { fontSize: 13, color: "var(--color-ink-mid)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.45 },
  badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end" },
  shortlistBtn: { padding: "7px 13px", background: "var(--color-ground-card)", color: "var(--status-success-ink)", border: "1.5px solid var(--status-success-ink)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", whiteSpace: "nowrap" },
  shortlistActive: { background: "var(--status-success-bg)", borderColor: "transparent" },
  declineBtn: { padding: "7px 13px", background: "var(--color-ground-card)", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  declineActive: { background: "var(--status-error-bg)", color: "var(--color-error)", borderColor: "transparent" },
  busy: { opacity: 0.6, cursor: "default" },
  expandCell: { padding: "0 16px 16px 16px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)" },
  expandLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink-muted)", padding: "14px 0 4px" },
  expandPitch: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};
