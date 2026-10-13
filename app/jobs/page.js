"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

const APP_STATUS = {
  new:         { label: "Applied",      bg: "var(--status-sent-bg)",     ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)",  ink: "var(--status-success-ink)" },
  declined:    { label: "Not selected", bg: "var(--status-error-bg)",    ink: "var(--color-error)" },
};

export default function JobBoardPage() {
  const { user, profile } = useAuth();
  const [opps, setOpps] = useState([]);
  const [apps, setApps] = useState({});       // opportunity_id -> application
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const [applyingId, setApplyingId] = useState(null);
  const [pitch, setPitch] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // RLS returns only OPEN opportunities from APPROVED hotels for creators.
    const { data: rows, error: oErr } = await supabase
      .from("opportunities")
      .select("*, hotel:hotel_profiles ( name, city, country, logo_url, website, instagram )")
      .eq("status", "open")
      .order("created_at", { ascending: false });
    if (oErr && oErr.code === "42P01") { setNeedsMigration(true); setLoading(false); return; }
    setOpps(rows || []);

    const { data: myApps } = await supabase
      .from("applications").select("id, opportunity_id, status, pitch").eq("creator_id", user.id);
    const map = {};
    (myApps || []).forEach(a => { map[a.opportunity_id] = a; });
    setApps(map);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openApply = (o) => { setApplyingId(o.id); setPitch(""); setLink(""); setError(""); };

  const submitApply = async (o) => {
    if (!pitch.trim()) { setError("Add a short pitch so the hotel knows why you're a fit."); return; }
    setSubmitting(true); setError("");
    const { data, error: err } = await supabase
      .from("applications")
      .insert({
        opportunity_id: o.id,
        creator_id: user.id,
        pitch: pitch.trim(),
        // Snapshot the applicant's identity so the hotel can see who applied.
        creator_name: (profile?.full_name || user.email || "").trim() || null,
        creator_link: link.trim() || null,
      })
      .select("id, opportunity_id, status, pitch")
      .single();
    setSubmitting(false);
    if (err) {
      setError(err.code === "23505" ? "You've already applied to this opportunity." : err.message);
      return;
    }
    setApps(prev => ({ ...prev, [o.id]: data }));
    setApplyingId(null);
    setPitch("");
  };

  const payLabel = (o) => o.type === "paid"
    ? `Paid · ${[o.currency, o.payment_amount].filter(v => v != null && v !== "").join(" ")}`.trim()
    : "Free collab";

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h1 style={s.title}>Job Board</h1>
        <p style={s.sub}>Collab opportunities posted by hotels. Apply with a short pitch — the hotel reviews applicants directly.</p>
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
        <div style={s.grid}>
          {opps.map(o => {
            const app = apps[o.id];
            const badge = app ? (APP_STATUS[app.status] || APP_STATUS.new) : null;
            const hotel = o.hotel || {};
            const isApplying = applyingId === o.id;
            return (
              <div key={o.id} style={s.card}>
                <div style={s.cardTop}>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.hotelName}>{hotel.name || "Hotel"}</div>
                    {(hotel.city || hotel.country) && (
                      <div style={s.hotelLoc}>{[hotel.city, hotel.country].filter(Boolean).join(", ")}</div>
                    )}
                  </div>
                  <span style={{ ...s.typePill, ...(o.type === "paid" ? s.typePaid : {}) }}>{payLabel(o)}</span>
                </div>

                <h3 style={s.oppTitle}>{o.title}</h3>
                {o.short_description && <p style={s.desc}>{o.short_description}</p>}

                {o.whats_included && (
                  <div style={s.block}><span style={s.blockLabel}>What’s included</span><p style={s.blockText}>{o.whats_included}</p></div>
                )}
                {o.deliverables && (
                  <div style={s.block}><span style={s.blockLabel}>Deliverables</span><p style={s.blockText}>{o.deliverables}</p></div>
                )}

                <div style={s.metaRow}>
                  {o.location && <span>📍 {o.location}</span>}
                  {o.application_deadline && <span>Apply by {o.application_deadline}</span>}
                  {o.completion_deadline && <span>Complete by {o.completion_deadline}</span>}
                </div>

                <div style={s.cardFooter}>
                  {badge ? (
                    <span style={{ ...s.appliedBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
                  ) : isApplying ? null : (
                    <button style={s.applyBtn} onClick={() => openApply(o)}>Apply</button>
                  )}
                </div>

                {isApplying && !badge && (
                  <div style={s.applyBox}>
                    <label style={s.applyLabel}>Your pitch — why you’re a great fit</label>
                    <textarea
                      style={s.pitchInput}
                      placeholder="Tell the hotel about your audience, style and why this collab is a match."
                      value={pitch}
                      onChange={e => setPitch(e.target.value)}
                      autoFocus
                    />
                    <input
                      style={s.linkInput}
                      placeholder="Instagram or portfolio link (optional)"
                      value={link}
                      onChange={e => setLink(e.target.value)}
                    />
                    {error && <p style={s.error}>{error}</p>}
                    <div style={s.applyActions}>
                      <button style={s.ghostBtn} onClick={() => { setApplyingId(null); setError(""); }} disabled={submitting}>Cancel</button>
                      <button style={s.submitBtn} onClick={() => submitApply(o)} disabled={submitting}>
                        {submitting ? "Sending…" : "Send application"}
                      </button>
                    </div>
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
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 40px 64px" },
  header: { marginBottom: 24 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14.5, color: "var(--color-ink-muted)", marginTop: 6, maxWidth: "60ch", lineHeight: 1.55 },
  notice: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, marginBottom: 18 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "70px 24px", display: "flex", flexDirection: "column", alignItems: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "20px 22px", boxShadow: "var(--shadow-low)", display: "flex", flexDirection: "column" },
  cardTop: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 },
  hotelName: { fontSize: 13, fontWeight: 700, color: "var(--color-ink-primary)" },
  hotelLoc: { fontSize: 12, color: "var(--color-ink-muted)", marginTop: 2 },
  typePill: { fontSize: 11.5, fontWeight: 700, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "4px 11px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap", flexShrink: 0 },
  typePaid: { background: "rgba(139,154,106,0.2)", color: "var(--status-success-ink)" },
  oppTitle: { fontSize: 17, fontWeight: 700, color: "var(--color-ink-primary)", lineHeight: 1.3, marginBottom: 6 },
  desc: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.55, marginBottom: 12 },
  block: { marginBottom: 10 },
  blockLabel: { display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-ink-muted)", marginBottom: 3 },
  blockText: { fontSize: 13, color: "var(--color-ink-mid)", lineHeight: 1.5, whiteSpace: "pre-wrap" },
  metaRow: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--color-ink-muted)", marginTop: "auto", paddingTop: 12 },
  cardFooter: { marginTop: 14, display: "flex", justifyContent: "flex-end" },
  applyBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 22px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  appliedBadge: { fontSize: 12, fontWeight: 700, padding: "7px 14px", borderRadius: "var(--radius-pill)" },
  applyBox: { marginTop: 14, borderTop: "1px solid var(--color-border)", paddingTop: 14 },
  applyLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  pitchInput: { width: "100%", minHeight: 92, resize: "vertical", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 13px", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  linkInput: { width: "100%", marginTop: 8, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  error: { fontSize: 12.5, color: "var(--color-error)", fontWeight: 600, margin: "6px 0 0" },
  applyActions: { marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 },
  ghostBtn: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  submitBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
