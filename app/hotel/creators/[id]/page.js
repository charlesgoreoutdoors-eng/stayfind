"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/auth";
import { SERVICE_LABELS, fmtDate } from "../../../../lib/marketplace";

const APP_STATUS = {
  new:               { label: "New",               bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  shortlisted:       { label: "Shortlisted",       bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  offered:           { label: "Offer sent",        bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  booked:            { label: "Booked",            bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  content_submitted: { label: "Content submitted", bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  completed:         { label: "Completed",         bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  declined:          { label: "Declined",          bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
  withdrawn:         { label: "Withdrawn",         bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

const SOCIAL_LABELS = { instagram: "Instagram", tiktok: "TikTok", youtube: "YouTube", twitter: "X / Twitter", facebook: "Facebook", pinterest: "Pinterest", website: "Website", linkedin: "LinkedIn" };

function titleCase(v) {
  return String(v || "").replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const linkIsUrl = (v) => v && /^https?:\/\//i.test(v);
const toHref = (v) => (linkIsUrl(v) ? v : `https://${v}`);

function Card({ title, children }) {
  return (
    <div style={s.card}>
      {title && <h3 style={s.cardTitle}>{title}</h3>}
      {children}
    </div>
  );
}

function Detail({ label, children }) {
  if (children === null || children === undefined || children === "" || (Array.isArray(children) && !children.length)) return null;
  return (
    <div style={s.detail}>
      <div style={s.detailLabel}>{label}</div>
      <div style={s.detailValue}>{children}</div>
    </div>
  );
}

export default function HotelCreatorProfilePage() {
  const { id } = useParams();            // application id
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [profile, setProfile] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    // Application + the job it's for. RLS already limits this to the hotel's own.
    const { data: a } = await supabase
      .from("applications")
      .select("id, status, pitch, creator_id, creator_name, creator_link, created_at, opportunity:opportunities ( id, title )")
      .eq("id", id)
      .maybeSingle();
    if (!a) { setNotFound(true); setLoading(false); return; }
    setApp(a);

    // Profile + uploaded content, readable because this creator applied to us.
    const [{ data: p }, { data: pf }, { data: rv }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", a.creator_id).maybeSingle(),
      supabase.from("portfolios").select("*").eq("user_id", a.creator_id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("rating, comment, reviewer_role, created_at").eq("reviewee_id", a.creator_id).order("created_at", { ascending: false }),
    ]);
    setProfile(p || null);
    setPortfolios((pf || []).filter(x => x.file_url));   // real uploads only
    setReviews(rv || []);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <div style={s.wrap}><div style={s.loadingRow}><span style={s.spinner} /> Loading…</div></div>;
  }
  if (notFound) {
    return (
      <div style={s.wrap}>
        <Link href="/hotel/jobs" style={s.back}>← Back to Jobs</Link>
        <div style={s.notice}>This applicant isn’t available.</div>
      </div>
    );
  }

  const p = profile || {};
  const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || app.creator_name || "Creator";
  const location = [p.city, p.state, p.country].filter(Boolean).join(", ");
  const badge = APP_STATUS[app.status] || APP_STATUS.new;
  const ratingAvg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;
  const socials = p.socials && typeof p.socials === "object" ? Object.entries(p.socials).filter(([, v]) => v) : [];
  const services = Array.isArray(p.services) ? p.services : [];
  const categories = Array.isArray(p.content_categories) ? p.content_categories : [];
  const backHref = app.opportunity?.id ? `/hotel/jobs/${app.opportunity.id}` : "/hotel/jobs";

  return (
    <div style={s.wrap}>
      <Link href={backHref} style={s.back}>← Back to applicants</Link>

      {/* Header */}
      <div style={s.header}>
        {p.avatar_url
          ? <img src={p.avatar_url} alt="" style={s.avatar} />
          : <div style={s.avatarFallback}>{name[0]?.toUpperCase() || "C"}</div>}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={s.name}>{name}</h1>
          {p.headline && <p style={s.headline}>{p.headline}</p>}
          <div style={s.metaRow}>
            {location && <span style={s.metaItem}>📍 {location}</span>}
            {ratingAvg != null
              ? <span style={s.rating}>★ {ratingAvg.toFixed(1)} <span style={s.ratingCount}>· {reviews.length} review{reviews.length === 1 ? "" : "s"}</span></span>
              : <span style={s.metaMuted}>No reviews yet</span>}
          </div>
        </div>
        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <span style={{ ...s.statusBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
          <Link href={`/hotel/inbox/${app.id}`} style={s.msgBtn}>Message</Link>
        </div>
      </div>

      {/* Application context */}
      <Card title="Application">
        {app.opportunity?.title && <Detail label="Applied to">{app.opportunity.title}</Detail>}
        <Detail label="Applied">{fmtDate(app.created_at)}</Detail>
        {app.creator_link && (
          <Detail label="Link shared">
            {linkIsUrl(app.creator_link)
              ? <a href={app.creator_link} target="_blank" rel="noreferrer" style={s.link}>{app.creator_link}</a>
              : app.creator_link}
          </Detail>
        )}
        <div style={s.detail}>
          <div style={s.detailLabel}>Pitch</div>
          <p style={s.pitch}>{app.pitch || "No pitch provided."}</p>
        </div>
      </Card>

      <div style={s.cols}>
        <div style={s.col}>
          {/* About */}
          <Card title="About">
            {p.bio ? <p style={s.bio}>{p.bio}</p> : <p style={s.muted}>No bio added yet.</p>}
          </Card>

          {/* Creator details */}
          <Card title="Creator details">
            <Detail label="Creator type">{titleCase(p.creator_type)}</Detail>
            <Detail label="Experience">{titleCase(p.experience_level)}</Detail>
            <Detail label="Audience">{p.audience}</Detail>
            <Detail label="Minimum rate">{p.min_rate != null ? `$${p.min_rate}` : null}</Detail>
            <Detail label="Open to">
              {[p.open_to_gifting && "Gifting", p.open_to_product_seeding && "Product seeding"].filter(Boolean).join(" · ") || null}
            </Detail>
            {categories.length > 0 && (
              <Detail label="Content categories">
                <div style={s.pills}>{categories.map(c => <span key={c} style={s.pill}>{titleCase(c)}</span>)}</div>
              </Detail>
            )}
            {services.length > 0 && (
              <Detail label="Services">
                <div style={s.pills}>{services.map(sv => <span key={sv} style={s.pillAmber}>{SERVICE_LABELS[sv] || titleCase(sv)}</span>)}</div>
              </Detail>
            )}
          </Card>

          {/* Socials & contact */}
          {(socials.length > 0 || p.portfolio_url || p.email || p.phone) && (
            <Card title="Social & contact">
              {socials.map(([k, v]) => (
                <Detail key={k} label={SOCIAL_LABELS[k] || titleCase(k)}>
                  {linkIsUrl(v) ? <a href={toHref(v)} target="_blank" rel="noreferrer" style={s.link}>{v}</a> : v}
                </Detail>
              ))}
              <Detail label="Portfolio site">
                {p.portfolio_url ? <a href={toHref(p.portfolio_url)} target="_blank" rel="noreferrer" style={s.link}>{p.portfolio_url}</a> : null}
              </Detail>
              <Detail label="Email">{p.email ? <a href={`mailto:${p.email}`} style={s.link}>{p.email}</a> : null}</Detail>
              <Detail label="Phone">{p.phone}</Detail>
            </Card>
          )}
        </div>

        <div style={s.col}>
          {/* Uploaded content */}
          <Card title={`Content${portfolios.length ? ` · ${portfolios.length}` : ""}`}>
            {portfolios.length === 0 ? (
              <p style={s.muted}>This creator hasn’t uploaded any content yet.</p>
            ) : (
              <div style={s.pfList}>
                {portfolios.map(pf => (
                  <a key={pf.id} href={pf.file_url} target="_blank" rel="noreferrer" style={s.pfRow}>
                    <span style={s.pfIcon}>📄</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={s.pfName}>{pf.name}</span>
                      <span style={s.pfMeta}>{pf.file_name}{pf.file_size ? ` · ${formatSize(pf.file_size)}` : ""}</span>
                    </span>
                    <span style={s.pfView}>View</span>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {/* Reviews */}
          <Card title={`Reviews${reviews.length ? ` · ${reviews.length}` : ""}`}>
            {reviews.length === 0 ? (
              <p style={s.muted}>No reviews from past collaborations yet.</p>
            ) : (
              <div style={s.reviewList}>
                {reviews.map((r, i) => (
                  <div key={i} style={s.review}>
                    <div style={s.reviewTop}>
                      <span style={s.reviewStars}>{"★".repeat(r.rating)}<span style={s.reviewStarsEmpty}>{"★".repeat(Math.max(0, 5 - r.rating))}</span></span>
                      <span style={s.reviewMeta}>{r.reviewer_role === "hotel" ? "Hotel" : "Creator"} · {fmtDate(r.created_at)}</span>
                    </div>
                    {r.comment && <p style={s.reviewText}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 940, margin: "0 auto", padding: "32px 24px 64px" },
  back: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 20 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  notice: { background: "var(--status-error-bg)", color: "var(--color-error)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14 },

  header: { display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 22, flexWrap: "wrap" },
  avatar: { width: 76, height: 76, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)", flexShrink: 0 },
  avatarFallback: { width: 76, height: 76, borderRadius: "50%", background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-display)" },
  name: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)", lineHeight: 1.15 },
  headline: { fontSize: 14.5, color: "var(--color-ink-mid)", marginTop: 4 },
  metaRow: { display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginTop: 10 },
  metaItem: { fontSize: 13, color: "var(--color-ink-mid)", fontWeight: 600 },
  metaMuted: { fontSize: 13, color: "var(--color-ink-muted)" },
  rating: { fontSize: 13.5, fontWeight: 700, color: "var(--color-accent-amber-deep)" },
  ratingCount: { fontWeight: 500, color: "var(--color-ink-muted)" },
  statusBadge: { fontSize: 11.5, fontWeight: 700, padding: "6px 13px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },
  msgBtn: { padding: "8px 16px", background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", textDecoration: "none" },

  cols: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18, alignItems: "start", marginTop: 18 },
  col: { display: "flex", flexDirection: "column", gap: 18, minWidth: 0 },

  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "18px 20px", boxShadow: "var(--shadow-low)" },
  cardTitle: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 14 },

  detail: { padding: "10px 0", borderTop: "1px solid rgba(43,39,34,0.06)" },
  detailLabel: { fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 3 },
  detailValue: { fontSize: 14.5, fontWeight: 600, color: "var(--color-ink-primary)", lineHeight: 1.5, wordBreak: "break-word" },
  pitch: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.65, whiteSpace: "pre-wrap", marginTop: 2 },
  bio: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.7, whiteSpace: "pre-wrap" },
  muted: { fontSize: 13.5, color: "var(--color-ink-muted)" },
  link: { color: "var(--color-accent-amber-deep)", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" },

  pills: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 },
  pill: { fontSize: 12, fontWeight: 600, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },
  pillAmber: { fontSize: 12, fontWeight: 600, color: "var(--color-accent-amber-deep)", background: "rgba(224,149,74,0.14)", padding: "4px 11px", borderRadius: "var(--radius-pill)" },

  pfList: { display: "flex", flexDirection: "column", gap: 10 },
  pfRow: { display: "flex", alignItems: "center", gap: 12, textDecoration: "none", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px", background: "var(--color-ground-sand)" },
  pfIcon: { fontSize: 20, flexShrink: 0 },
  pfName: { display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pfMeta: { display: "block", fontSize: 12, color: "var(--color-ink-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  pfView: { fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-amber-deep)", flexShrink: 0 },

  reviewList: { display: "flex", flexDirection: "column", gap: 14 },
  review: { borderTop: "1px solid rgba(43,39,34,0.06)", paddingTop: 12 },
  reviewTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  reviewStars: { fontSize: 14, color: "var(--color-accent-amber-deep)", letterSpacing: "1px" },
  reviewStarsEmpty: { color: "var(--color-border)" },
  reviewMeta: { fontSize: 12, color: "var(--color-ink-muted)", fontWeight: 600 },
  reviewText: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.6, marginTop: 6, whiteSpace: "pre-wrap" },
};
