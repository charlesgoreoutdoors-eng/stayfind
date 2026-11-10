"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { SERVICE_LABELS, fmtDate } from "../../lib/marketplace";

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
  const { user, profile } = useAuth();
  const [opps, setOpps] = useState([]);
  const [apps, setApps] = useState({});          // opportunity_id -> application
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const [selected, setSelected] = useState(null); // opportunity shown in the modal
  const [applyOpen, setApplyOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
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

  // Lock body scroll while the modal is open.
  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const openJob = (o) => { setSelected(o); setApplyOpen(false); setPitch(""); setLink(""); setError(""); };
  const closeModal = () => setSelected(null);

  const submitApply = async (o) => {
    if (!pitch.trim()) { setError("Add a short pitch so the hotel knows why you're a fit."); return; }
    setSubmitting(true); setError("");
    const { data, error: err } = await supabase
      .from("applications")
      .insert({
        opportunity_id: o.id, creator_id: user.id, pitch: pitch.trim(),
        creator_name: (profile?.full_name || user.email || "").trim() || null,
        creator_link: link.trim() || null,
      })
      .select("id, opportunity_id, status, pitch").single();
    setSubmitting(false);
    if (err) { setError(err.code === "23505" ? "You've already applied to this opportunity." : err.message); return; }
    setApps(prev => ({ ...prev, [o.id]: data }));
    setApplyOpen(false);
    notifyServer("new-application", data.id);
  };

  const notifyServer = async (type, applicationId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ type, applicationId }),
      }).catch(() => {});
    } catch {}
  };

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
                    <tr key={o.id} style={s.tr} onClick={() => openJob(o)}>
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

      {selected && (
        <JobModal
          o={selected}
          app={apps[selected.id]}
          onClose={closeModal}
          applyOpen={applyOpen}
          setApplyOpen={setApplyOpen}
          pitch={pitch} setPitch={setPitch}
          link={link} setLink={setLink}
          submitting={submitting}
          error={error} setError={setError}
          onSubmit={() => submitApply(selected)}
        />
      )}
    </div>
  );
}

function DetailRow({ label, children }) {
  if (!children) return null;
  return (
    <div style={s.detailRow}>
      <div style={s.detailLabel}>{label}</div>
      <div style={s.detailValue}>{children}</div>
    </div>
  );
}

function Block({ label, text }) {
  if (!text) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={s.blockLabel}>{label}</div>
      <p style={s.blockText}>{text}</p>
    </div>
  );
}

function JobModal({ o, app, onClose, applyOpen, setApplyOpen, pitch, setPitch, link, setLink, submitting, error, setError, onSubmit }) {
  const hotel = o.hotel || {};
  const badge = app ? (APP_STATUS[app.status] || APP_STATUS.new) : null;
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <button style={s.close} onClick={onClose} aria-label="Close">✕</button>

        {/* Header */}
        <div style={s.modalHead}>
          <div style={{ minWidth: 0 }}>
            <div style={s.modalHotel}>
              {hotel.logo_url
                ? <img src={hotel.logo_url} alt="" style={s.modalLogo} />
                : <div style={s.modalLogoFallback}>{(hotel.name || "H")[0]}</div>}
              <span>{hotel.name || "Hotel"}{(hotel.city || hotel.country) ? ` · ${[hotel.city, hotel.country].filter(Boolean).join(", ")}` : ""}</span>
            </div>
            <h2 style={s.modalTitle}>{o.title}</h2>
          </div>
          <div style={{ flexShrink: 0 }}>
            {badge
              ? <span style={{ ...s.appliedBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
              : !applyOpen && <button style={s.applyBtn} onClick={() => { setError(""); setApplyOpen(true); }}>Apply</button>}
          </div>
        </div>

        {/* Apply form (full width, when open) */}
        {applyOpen && !badge && (
          <div style={s.applyBox}>
            <label style={s.applyLabel}>Your pitch — why you’re a great fit</label>
            <textarea style={s.pitchInput} placeholder="Tell the hotel about your audience, style and why this collab is a match." value={pitch} onChange={e => setPitch(e.target.value)} autoFocus />
            <input style={s.linkInput} placeholder="Instagram or portfolio link (optional)" value={link} onChange={e => setLink(e.target.value)} />
            {error && <p style={s.error}>{error}</p>}
            <div style={s.applyActions}>
              <button style={s.ghostBtn} onClick={() => setApplyOpen(false)} disabled={submitting}>Cancel</button>
              <button style={s.submitBtn} onClick={onSubmit} disabled={submitting}>{submitting ? "Sending…" : "Send application"}</button>
            </div>
          </div>
        )}

        {/* Two-column body */}
        <div style={s.cols}>
          {/* Left — details */}
          <div style={s.detailsCard}>
            <div style={s.detailsHead}>Details</div>
            <DetailRow label="Compensation">{o.type === "paid" ? `${o.currency || ""} ${o.payment_amount ?? ""}`.trim() : "Free collab"}</DetailRow>
            <DetailRow label="Other compensation">{o.other_compensation}</DetailRow>
            <DetailRow label="Service">{o.service ? (SERVICE_LABELS[o.service] || o.service) : null}</DetailRow>
            <DetailRow label="Creator location">{o.location}</DetailRow>
            <DetailRow label="Application deadline">{fmtDate(o.application_deadline)}</DetailRow>
            <DetailRow label="Content deadline">{fmtDate(o.completion_deadline)}</DetailRow>
            <DetailRow label="Content licensed until">{fmtDate(o.content_license_until)}</DetailRow>
            {o.brief_url && (
              <DetailRow label="Creative brief">
                <a href={o.brief_url} target="_blank" rel="noreferrer" style={s.briefLink}>📄 {o.brief_name || "Download brief"}</a>
              </DetailRow>
            )}
          </div>

          {/* Right — description */}
          <div style={{ minWidth: 0 }}>
            <Block label="Campaign description" text={o.description || o.short_description} />
            <Block label="What’s included" text={o.whats_included} />
            <Block label="Deliverables" text={o.deliverables} />
            {o.social_handles && (
              <div style={{ marginBottom: 20 }}>
                <div style={s.blockLabel}>Social hashtags &amp; mentions</div>
                <span style={s.handlePill}>{o.social_handles}</span>
              </div>
            )}
            {o.cta_link && (
              <div style={{ marginBottom: 4 }}>
                <div style={s.blockLabel}>CTA link</div>
                <a href={o.cta_link} target="_blank" rel="noreferrer" style={s.ctaLink}>{o.cta_link}</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 920, margin: "0 auto", padding: "40px 24px 64px" },
  header: { marginBottom: 22 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14.5, color: "var(--color-ink-muted)", marginTop: 6, lineHeight: 1.55 },
  notice: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, marginBottom: 18 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "70px 24px", display: "flex", flexDirection: "column", alignItems: "center" },

  // Table (Popfly-style "Latest Campaigns")
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-low)", overflow: "hidden" },
  tableScroll: { width: "100%", overflowX: "auto" },
  table: { width: "100%", minWidth: 760, borderCollapse: "collapse", fontFamily: "var(--font-body)" },
  th: { textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", padding: "16px 20px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  tr: { cursor: "pointer", borderBottom: "1px solid var(--color-border)", transition: "background .12s" },
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

  // Modal
  overlay: { position: "fixed", inset: 0, background: "rgba(43,39,34,0.55)", zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" },
  modal: { position: "relative", width: "100%", maxWidth: 920, background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-popup)", padding: "28px 30px 32px" },
  close: { position: "absolute", top: 16, right: 16, width: 30, height: 30, borderRadius: "50%", background: "var(--color-ground-sand)", border: "none", cursor: "pointer", fontSize: 13, color: "var(--color-ink-mid)", display: "flex", alignItems: "center", justifyContent: "center" },
  modalHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, paddingRight: 36, marginBottom: 20, flexWrap: "wrap" },
  modalHotel: { display: "flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 600, color: "var(--color-ink-mid)", marginBottom: 8 },
  modalLogo: { width: 26, height: 26, borderRadius: 7, objectFit: "cover", flexShrink: 0 },
  modalLogoFallback: { width: 26, height: 26, borderRadius: 7, background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)", lineHeight: 1.2 },
  applyBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  appliedBadge: { fontSize: 12.5, fontWeight: 700, padding: "8px 16px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },

  applyBox: { background: "var(--color-ground-sand)", borderRadius: "var(--radius-card)", padding: "18px 20px", marginBottom: 22 },
  applyLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  pitchInput: { width: "100%", minHeight: 92, resize: "vertical", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 13px", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  linkInput: { width: "100%", marginTop: 8, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  error: { fontSize: 12.5, color: "var(--color-error)", fontWeight: 600, margin: "6px 0 0" },
  applyActions: { marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 },
  ghostBtn: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  submitBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },

  cols: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 26, alignItems: "start" },
  detailsCard: { background: "var(--color-ground-sand)", borderRadius: "var(--radius-card)", padding: "18px 20px" },
  detailsHead: { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 14 },
  detailRow: { display: "flex", flexDirection: "column", gap: 2, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid rgba(43,39,34,0.08)" },
  detailLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink-muted)" },
  detailValue: { fontSize: 14, color: "var(--color-ink-primary)", fontWeight: 600 },
  briefLink: { fontSize: 13.5, color: "var(--color-accent-amber-deep)", fontWeight: 700, textDecoration: "none", wordBreak: "break-all" },
  blockLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-ink-muted)", marginBottom: 6 },
  blockText: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.65, whiteSpace: "pre-wrap" },
  handlePill: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "5px 12px", borderRadius: "var(--radius-pill)" },
  ctaLink: { fontSize: 14, color: "var(--color-accent-amber-deep)", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" },
};
