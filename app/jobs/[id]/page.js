"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { SERVICE_LABELS, fmtDate, sanitizeText } from "../../../lib/marketplace";

const APP_STATUS = {
  new:         { label: "Applied",      bg: "var(--status-sent-bg)",     ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)",  ink: "var(--status-success-ink)" },
  declined:    { label: "Not selected", bg: "var(--status-error-bg)",    ink: "var(--color-error)" },
};

function Card({ title, right, children }) {
  return (
    <div style={s.card}>
      {(title || right) && (
        <div style={s.cardHead}>
          {title && <h3 style={s.cardTitle}>{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

function Row({ icon, label, children }) {
  if (!children) return null;
  return (
    <div style={s.row}>
      <div style={s.rowIcon}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={s.rowLabel}>{label}</div>
        <div style={s.rowValue}>{children}</div>
      </div>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [o, setO] = useState(null);
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [link, setLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    const { data } = await supabase
      .from("opportunities")
      .select("*, hotel:hotel_profiles ( name, city, country, logo_url, website, instagram )")
      .eq("id", id)
      .maybeSingle();
    if (!data) { setNotFound(true); setLoading(false); return; }
    setO(data);
    const { data: myApp } = await supabase
      .from("applications").select("id, status, pitch").eq("opportunity_id", id).eq("creator_id", user.id).maybeSingle();
    setApp(myApp || null);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { load(); }, [load]);

  const submitApply = async () => {
    if (!pitch.trim()) { setError("Add a short pitch so the hotel knows why you're a fit."); return; }
    setSubmitting(true); setError("");
    const { data, error: err } = await supabase
      .from("applications")
      .insert({
        opportunity_id: o.id, creator_id: user.id, pitch: sanitizeText(pitch).trim(),
        creator_name: (profile?.full_name || user.email || "").trim() || null,
        creator_link: link.trim() || null,
      })
      .select("id, status, pitch").single();
    setSubmitting(false);
    if (err) { setError(err.code === "23505" ? "You've already applied to this opportunity." : err.message); return; }
    setApp(data);
    setApplyOpen(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ type: "new-application", applicationId: data.id }) }).catch(() => {});
      }
    } catch {}
  };

  const copyHandles = () => {
    try { navigator.clipboard.writeText(o.social_handles || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  if (loading) {
    return <div style={s.wrap}><div style={s.loadingRow}><span style={s.spinner} /> Loading…</div></div>;
  }
  if (notFound) {
    return (
      <div style={s.wrap}>
        <Link href="/jobs" style={s.back}>← Job Board</Link>
        <div style={s.notice}>This opportunity isn’t available.</div>
      </div>
    );
  }

  const hotel = o.hotel || {};
  const badge = app ? (APP_STATUS[app.status] || APP_STATUS.new) : null;
  const linkIsUrl = (v) => v && /^https?:\/\//i.test(v);

  return (
    <div style={s.wrap}>
      {/* Breadcrumb */}
      <div style={s.crumb}>
        <Link href="/jobs" style={s.crumbLink}>Job Board</Link>
        <span style={s.crumbSep}>/</span>
        <span style={s.crumbCurrent}>{o.title}</span>
      </div>

      {/* Header */}
      <div style={s.header}>
        <div style={{ minWidth: 0 }}>
          <h1 style={s.title}>{o.title}</h1>
          <div style={s.brand}>
            {hotel.logo_url
              ? <img src={hotel.logo_url} alt="" style={s.brandLogo} />
              : <div style={s.brandLogoFallback}>{(hotel.name || "H")[0]}</div>}
            <span style={s.brandName}>{hotel.name || "Hotel"}</span>
            {(hotel.city || hotel.country) && <span style={s.brandLoc}>· {[hotel.city, hotel.country].filter(Boolean).join(", ")}</span>}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {badge
            ? <span style={{ ...s.statusBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
            : !applyOpen && <button style={s.applyBtn} onClick={() => { setError(""); setApplyOpen(true); }}>Apply</button>}
        </div>
      </div>

      {/* Apply form */}
      {applyOpen && !badge && (
        <div style={s.applyBox}>
          <label style={s.applyLabel}>Your pitch — why you’re a great fit</label>
          <textarea style={s.pitchInput} placeholder="Tell the hotel about your audience, style and why this collab is a match." value={pitch} onChange={e => setPitch(e.target.value)} autoFocus />
          <input style={s.linkInput} placeholder="Instagram or portfolio link (optional)" value={link} onChange={e => setLink(e.target.value)} />
          {error && <p style={s.error}>{error}</p>}
          <div style={s.applyActions}>
            <button style={s.ghostBtn} onClick={() => setApplyOpen(false)} disabled={submitting}>Cancel</button>
            <button style={s.submitBtn} onClick={submitApply} disabled={submitting}>{submitting ? "Sending…" : "Send application"}</button>
          </div>
        </div>
      )}

      {/* Two columns */}
      <div style={s.cols}>
        {/* Left — structured detail cards */}
        <div style={s.colLeft}>
          <Card title="Details" right={<span style={s.openBadge}>Open</span>}>
            <Row icon="$" label="Compensation">{o.type === "paid" ? `${o.currency || ""} ${o.payment_amount ?? ""}`.trim() : "Free collab"}</Row>
            <Row icon="🎁" label="Other compensation">{o.other_compensation}</Row>
            <Row icon="📅" label="Application deadline">{fmtDate(o.application_deadline)}</Row>
            <Row icon="▶" label="Content deadline">{fmtDate(o.completion_deadline)}</Row>
          </Card>

          {(o.whats_included || o.deliverables) && (
            <Card title="What you get & give">
              {o.whats_included && <div style={s.block}><div style={s.blockLabel}>What’s included</div><p style={s.blockText}>{o.whats_included}</p></div>}
              {o.deliverables && <div style={{ ...s.block, marginBottom: 0 }}><div style={s.blockLabel}>Deliverables</div><p style={s.blockText}>{o.deliverables}</p></div>}
            </Card>
          )}

          {o.location && <Card title="Creator location"><div style={s.plainValue}>📍 {o.location}</div></Card>}
          {o.service && <Card title="Service"><div style={s.servicePill}>{SERVICE_LABELS[o.service] || o.service}</div></Card>}
          {o.content_license_until && (
            <Card title="License">
              <div style={s.rowLabel}>Content licensed until</div>
              <div style={{ ...s.rowValue, marginTop: 2 }}>{fmtDate(o.content_license_until)}</div>
            </Card>
          )}
        </div>

        {/* Right — narrative, social, brief, CTA */}
        <div style={s.colRight}>
          {o.social_handles && (
            <Card title="Social hashtags & mentions" right={<button style={s.copyBtn} onClick={copyHandles}>{copied ? "Copied ✓" : "Copy"}</button>}>
              <span style={s.handlePill}>{o.social_handles}</span>
            </Card>
          )}

          <Card title="Campaign Description">
            <p style={s.descText}>{o.description || o.short_description || "No description provided."}</p>
          </Card>

          {o.brief_url && (
            <Card title="Creative brief">
              <a href={o.brief_url} target="_blank" rel="noreferrer" style={s.briefCard}>
                <span style={s.briefIcon}>📄</span>
                <span style={s.briefName}>{o.brief_name || "Download brief"}</span>
                <span style={s.briefDownload}>Download</span>
              </a>
            </Card>
          )}

          {o.cta_link && (
            <Card title="CTA Link">
              <a href={o.cta_link} target="_blank" rel="noreferrer" style={s.ctaLink}>{o.cta_link}</a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "28px 24px 64px" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  notice: { background: "var(--status-error-bg)", color: "var(--color-error)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14 },
  back: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 16 },

  crumb: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 16, flexWrap: "wrap" },
  crumbLink: { color: "var(--color-ink-muted)", textDecoration: "none", fontWeight: 600 },
  crumbSep: { color: "var(--color-ink-muted)" },
  crumbCurrent: { color: "var(--color-ink-primary)", fontWeight: 600 },

  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 26, flexWrap: "wrap" },
  title: { fontFamily: "var(--font-display)", fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)", lineHeight: 1.15 },
  brand: { display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" },
  brandLogo: { width: 34, height: 34, borderRadius: 9, objectFit: "cover", border: "1px solid var(--color-border)" },
  brandLogoFallback: { width: 34, height: 34, borderRadius: 9, background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700 },
  brandName: { fontSize: 15, fontWeight: 700, color: "var(--color-ink-primary)" },
  brandLoc: { fontSize: 13, color: "var(--color-ink-muted)" },
  applyBtn: { background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "13px 34px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  statusBadge: { fontSize: 13, fontWeight: 700, padding: "10px 18px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },

  applyBox: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "20px 22px", marginBottom: 24, boxShadow: "var(--shadow-low)" },
  applyLabel: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  pitchInput: { width: "100%", minHeight: 100, resize: "vertical", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 13px", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  linkInput: { width: "100%", marginTop: 8, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  error: { fontSize: 12.5, color: "var(--color-error)", fontWeight: 600, margin: "6px 0 0" },
  applyActions: { marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 10 },
  ghostBtn: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  submitBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },

  cols: { display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(280px, 1.2fr)", gap: 20, alignItems: "start" },
  colLeft: { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },
  colRight: { display: "flex", flexDirection: "column", gap: 16, minWidth: 0 },

  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "18px 20px", boxShadow: "var(--shadow-low)" },
  cardHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)" },
  openBadge: { fontSize: 11.5, fontWeight: 700, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },

  row: { display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderTop: "1px solid rgba(43,39,34,0.06)" },
  rowIcon: { width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-ink-muted)" },
  rowLabel: { fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.03em" },
  rowValue: { fontSize: 14.5, fontWeight: 600, color: "var(--color-ink-primary)", marginTop: 2, lineHeight: 1.45 },
  plainValue: { fontSize: 14.5, fontWeight: 600, color: "var(--color-ink-primary)" },
  servicePill: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--color-accent-amber-deep)", background: "rgba(224,149,74,0.14)", padding: "6px 13px", borderRadius: "var(--radius-pill)" },

  block: { marginBottom: 16 },
  blockLabel: { fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink-muted)", marginBottom: 5 },
  blockText: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  descText: { fontSize: 15, color: "var(--color-ink-mid)", lineHeight: 1.7, whiteSpace: "pre-wrap" },

  copyBtn: { background: "var(--color-ground-sand)", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-ink-mid)", cursor: "pointer", fontFamily: "inherit" },
  handlePill: { display: "inline-block", fontSize: 14, fontWeight: 600, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "6px 14px", borderRadius: "var(--radius-pill)" },

  briefCard: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px", background: "var(--color-ground-sand)" },
  briefIcon: { fontSize: 20, flexShrink: 0 },
  briefName: { flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  briefDownload: { fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-amber-deep)", flexShrink: 0 },
  ctaLink: { fontSize: 14.5, fontWeight: 600, color: "var(--color-accent-amber-deep)", textDecoration: "none", wordBreak: "break-all" },
};
