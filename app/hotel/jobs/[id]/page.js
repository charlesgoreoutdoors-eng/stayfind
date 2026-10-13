"use client";
import { useState, useEffect, useCallback } from "react";
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
  };

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
              {opp.application_deadline && <span style={s.metaText}>Apply by {opp.application_deadline}</span>}
            </div>
          </div>

          <h2 style={s.sectionTitle}>Applicants <span style={s.count}>{apps.length}</span></h2>

          {apps.length === 0 ? (
            <div style={s.empty}>No applications yet. They’ll appear here as creators apply.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {apps.map(a => {
                const badge = APP_STATUS[a.status] || APP_STATUS.new;
                const linkIsUrl = a.creator_link && /^https?:\/\//i.test(a.creator_link);
                return (
                  <div key={a.id} style={s.card}>
                    <div style={s.cardHead}>
                      <div style={{ minWidth: 0 }}>
                        <span style={s.name}>{a.creator_name || "Creator"}</span>
                        {a.creator_link && (
                          linkIsUrl
                            ? <a href={a.creator_link} target="_blank" rel="noreferrer" style={s.link}>{a.creator_link}</a>
                            : <span style={s.linkPlain}>{a.creator_link}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                        <span style={s.appliedDate}>{fmtDate(a.created_at)}</span>
                        <span style={{ ...s.statusBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
                      </div>
                    </div>
                    {a.pitch && <p style={s.pitch}>{a.pitch}</p>}
                    <div style={s.actions}>
                      <button
                        style={{ ...s.shortlistBtn, ...(a.status === "shortlisted" ? s.shortlistActive : {}), ...(savingId === a.id ? s.busy : {}) }}
                        onClick={() => updateStatus(a, "shortlisted")}
                        disabled={savingId === a.id}
                      >{a.status === "shortlisted" ? "✓ Shortlisted" : "Shortlist"}</button>
                      <button
                        style={{ ...s.declineBtn, ...(a.status === "declined" ? s.declineActive : {}), ...(savingId === a.id ? s.busy : {}) }}
                        onClick={() => updateStatus(a, "declined")}
                        disabled={savingId === a.id}
                      >{a.status === "declined" ? "Declined" : "Decline"}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "32px 24px 64px" },
  back: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 20 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  notice: { background: "var(--status-error-bg)", color: "var(--color-error)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14 },
  head: { marginBottom: 26 },
  title: { fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  metaRow: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
  typePill: { fontSize: 11.5, fontWeight: 700, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },
  statusPill: { fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },
  metaText: { fontSize: 12.5, color: "var(--color-ink-muted)" },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 14 },
  count: { fontSize: 13, fontWeight: 700, color: "var(--color-ink-muted)", background: "var(--color-ground-sand)", padding: "2px 9px", borderRadius: "var(--radius-pill)", marginLeft: 4 },
  empty: { background: "var(--color-ground-card)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", padding: "36px 24px", textAlign: "center", color: "var(--color-ink-muted)", fontSize: 14 },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "16px 18px", boxShadow: "var(--shadow-low)" },
  cardHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  name: { display: "block", fontSize: 14.5, fontWeight: 700, color: "var(--color-ink-primary)" },
  link: { display: "inline-block", fontSize: 12.5, color: "var(--color-accent-amber-deep)", fontWeight: 600, textDecoration: "none", marginTop: 2, wordBreak: "break-all" },
  linkPlain: { display: "inline-block", fontSize: 12.5, color: "var(--color-ink-muted)", marginTop: 2 },
  appliedDate: { fontSize: 12, color: "var(--color-ink-muted)" },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)" },
  pitch: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.6, marginTop: 10, whiteSpace: "pre-wrap" },
  actions: { display: "flex", gap: 8, marginTop: 14 },
  shortlistBtn: { padding: "8px 16px", background: "var(--color-ground-card)", color: "var(--status-success-ink)", border: "1.5px solid var(--status-success-ink)", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  shortlistActive: { background: "var(--status-success-bg)", borderColor: "transparent" },
  declineBtn: { padding: "8px 16px", background: "var(--color-ground-card)", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  declineActive: { background: "var(--status-error-bg)", color: "var(--color-error)", borderColor: "transparent" },
  busy: { opacity: 0.6, cursor: "default" },
};
