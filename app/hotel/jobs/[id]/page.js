"use client";
import { useState, useEffect, useCallback, Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/auth";

const CREATOR_TYPES = ["Photographer", "Videographer", "Blogger", "Influencer", "Vlogger", "UGC Creator"];
const EXPERIENCE = ["Beginner", "Intermediate", "Advanced", "Professional"];

const APP_STATUS = {
  invited:     { label: "Invited",      bg: "rgba(224,149,74,0.16)",    ink: "var(--color-accent-amber-deep)" },
  new:         { label: "New",          bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  shortlisted: { label: "Shortlisted",  bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  declined:    { label: "Declined",     bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

function fmtFollowers(v) {
  const n = parseInt(v, 10);
  if (!n) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

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
  const [pitchApp, setPitchApp] = useState(null);   // application whose pitch modal is open
  const [fQ, setFQ] = useState("");
  const [fType, setFType] = useState("");
  const [fExp, setFExp] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [profiles, setProfiles] = useState({});   // creator_id -> profile
  const [ratings, setRatings] = useState({});   // creator_id -> { avg, count }

  const load = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);
    const { data: o } = await supabase.from("opportunities").select("*").eq("id", id).maybeSingle();
    if (!o) { setNotFound(true); setLoading(false); return; }
    setOpp(o);
    const { data: rows } = await supabase
      .from("applications").select("*").eq("opportunity_id", id).order("created_at", { ascending: false });
    setApps(rows || []);

    // Pull aggregate ratings for every applicant so the hotel can weigh past
    // collaborations before actioning. Reviews are readable by all signed-in users.
    const creatorIds = [...new Set((rows || []).map(r => r.creator_id).filter(Boolean))];
    if (creatorIds.length) {
      const { data: profs } = await supabase.from("profiles").select("id, city, state, country, experience_level, creator_type, socials").in("id", creatorIds);
      const pm = {}; (profs || []).forEach(x => { pm[x.id] = x; }); setProfiles(pm);
      const { data: revs } = await supabase
        .from("reviews").select("reviewee_id, rating").in("reviewee_id", creatorIds);
      const by = {};
      (revs || []).forEach(rv => { (by[rv.reviewee_id] = by[rv.reviewee_id] || []).push(rv.rating); });
      const agg = {};
      Object.entries(by).forEach(([uid, arr]) => {
        agg[uid] = { avg: arr.reduce((a, b) => a + b, 0) / arr.length, count: arr.length };
      });
      setRatings(agg);
    }
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

  const filtered = apps.filter(a => {
    const p = profiles[a.creator_id] || {};
    if (fQ && !(a.creator_name || "").toLowerCase().includes(fQ.trim().toLowerCase())) return false;
    if (fType && (p.creator_type || "") !== fType) return false;
    if (fExp && (p.experience_level || "").toLowerCase() !== fExp) return false;
    if (fStatus && (a.status || "new") !== fStatus) return false;
    const d = (a.created_at || "").slice(0, 10);
    if (fFrom && d < fFrom) return false;
    if (fTo && d > fTo) return false;
    return true;
  });

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

          <h2 style={s.sectionTitle}>Applicants <span style={s.count}>{filtered.length === apps.length ? apps.length : `${filtered.length} of ${apps.length}`}</span></h2>

          {apps.length > 0 && (
            <div style={s.filters}>
              <input style={{ ...s.fInput, minWidth: 200 }} placeholder="Search creator…" value={fQ} onChange={e => setFQ(e.target.value)} />
              <select style={s.fInput} value={fType} onChange={e => setFType(e.target.value)}>
                <option value="">All creator types</option>
                {CREATOR_TYPES.map(x => <option key={x} value={x}>{x}</option>)}
              </select>
              <select style={s.fInput} value={fExp} onChange={e => setFExp(e.target.value)}>
                <option value="">All experience</option>
                {EXPERIENCE.map(x => <option key={x} value={x.toLowerCase()}>{x}</option>)}
              </select>
              <select style={s.fInput} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                <option value="">All statuses</option>
                {Object.entries(APP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <label style={s.fDate}>Applied from <input type="date" style={s.fInput} value={fFrom} onChange={e => setFFrom(e.target.value)} /></label>
              <label style={s.fDate}>to <input type="date" style={s.fInput} value={fTo} onChange={e => setFTo(e.target.value)} /></label>
              {(fQ || fType || fExp || fStatus || fFrom || fTo) && (
                <button style={s.clearBtn} onClick={() => { setFQ(""); setFType(""); setFExp(""); setFStatus(""); setFFrom(""); setFTo(""); }}>Clear</button>
              )}
            </div>
          )}

          {apps.length === 0 ? (
            <div style={s.empty}>No applications yet. They’ll appear here as creators apply.</div>
          ) : (
            <div style={s.card}>
              <div style={s.tableScroll}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Creator</th>
                      <th style={s.th}>Type</th>
                      <th style={s.th}>Followers</th>
                      <th style={s.th}>Location</th>
                      <th style={s.th}>Experience</th>
                      <th style={s.th}>Pitch</th>
                      <th style={s.th}>Applied</th>
                      <th style={s.th}>Status</th>
                      <th style={{ ...s.th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && <tr><td colSpan={9} style={{ ...s.td, textAlign: "center", color: "var(--color-ink-muted)", padding: 28 }}>No applicants match these filters.</td></tr>}
                    {filtered.map(a => {
                      const badge = APP_STATUS[a.status] || APP_STATUS.new;
                      const busy = savingId === a.id;
                      return (
                        <Fragment key={a.id}>
                          <tr style={s.tr}>
                            <td style={s.td}>
                              <Link href={`/hotel/creators/${a.id}`} style={s.nameLink} onClick={e => e.stopPropagation()}>{a.creator_name || "Creator"}</Link>
                              {ratings[a.creator_id]
                                ? <div style={s.rating}>★ {ratings[a.creator_id].avg.toFixed(1)} <span style={s.ratingCount}>· {ratings[a.creator_id].count} review{ratings[a.creator_id].count === 1 ? "" : "s"}</span></div>
                                : <div style={s.ratingNone}>No reviews yet</div>}
                              {a.creator_link && (linkIsUrl(a.creator_link)
                                ? <a href={a.creator_link} target="_blank" rel="noreferrer" style={s.link} onClick={e => e.stopPropagation()}>{a.creator_link}</a>
                                : <span style={s.linkPlain}>{a.creator_link}</span>)}
                            </td>
                            <td style={s.td}>{profiles[a.creator_id]?.creator_type || "—"}</td>
                            <td style={s.td}>{fmtFollowers(profiles[a.creator_id]?.socials?.followers)}</td>
                            <td style={s.td}>{[profiles[a.creator_id]?.city, profiles[a.creator_id]?.country].filter(Boolean).join(", ") || "—"}</td>
                            <td style={s.td}>{profiles[a.creator_id]?.experience_level || "—"}</td>
                            <td style={s.td}><button style={s.pitchBtn} onClick={() => setPitchApp(a)}>View pitch</button></td>
                            <td style={s.td}>{fmtDate(a.created_at)}</td>
                            <td style={s.td}><span style={{ ...s.badge, background: badge.bg, color: badge.ink }}>{badge.label}</span></td>
                            <td style={{ ...s.td, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                              <div style={s.actions}>
                                <Link href={`/hotel/inbox/${a.id}`} style={s.msgBtn} onClick={e => e.stopPropagation()}>Message</Link>
                                <button style={{ ...s.shortlistBtn, ...(a.status === "shortlisted" ? s.shortlistActive : {}), ...(busy ? s.busy : {}) }} onClick={() => updateStatus(a, "shortlisted")} disabled={busy}>{a.status === "shortlisted" ? "✓ Shortlisted" : "Shortlist"}</button>
                                <button style={{ ...s.declineBtn, ...(a.status === "declined" ? s.declineActive : {}), ...(busy ? s.busy : {}) }} onClick={() => updateStatus(a, "declined")} disabled={busy}>{a.status === "declined" ? "Declined" : "Decline"}</button>
                              </div>
                            </td>
                          </tr>
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

      {pitchApp && (
        <div style={s.overlay} onClick={() => setPitchApp(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <div>
                <div style={s.modalTitle}>{pitchApp.creator_name || "Creator"}’s pitch</div>
                <div style={s.modalSub}>Applied {fmtDate(pitchApp.created_at)}</div>
              </div>
              <button style={s.modalClose} onClick={() => setPitchApp(null)} aria-label="Close">×</button>
            </div>
            <p style={s.expandPitch}>{pitchApp.pitch || "No pitch provided."}</p>
            {pitchApp.creator_link && (linkIsUrl(pitchApp.creator_link)
              ? <a href={pitchApp.creator_link} target="_blank" rel="noreferrer" style={s.link}>{pitchApp.creator_link}</a>
              : <span style={s.linkPlain}>{pitchApp.creator_link}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  filters: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 },
  fInput: { border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "8px 12px", fontSize: 13, fontFamily: "inherit", outline: "none", color: "var(--color-ink-primary)", background: "var(--color-ground-card)" },
  fDate: { display: "flex", flexDirection: "column", gap: 3, fontSize: 11, fontWeight: 700, color: "var(--color-ink-muted)" },
  clearBtn: { background: "transparent", border: "none", color: "var(--color-accent-amber-deep)", fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "9px 6px", fontFamily: "inherit" },
  pitchBtn: { background: "var(--color-ground-card)", color: "var(--color-ink-primary)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 },
  modal: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", padding: "24px 26px", width: "100%", maxWidth: 560, maxHeight: "80vh", overflowY: "auto", boxShadow: "var(--shadow-low)" },
  modalHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)" },
  modalSub: { fontSize: 12.5, color: "var(--color-ink-muted)", marginTop: 3 },
  modalClose: { background: "transparent", border: "none", fontSize: 26, lineHeight: 1, cursor: "pointer", color: "var(--color-ink-muted)" },
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
  table: { width: "100%", minWidth: 960, borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", padding: "14px 16px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" },
  tr: { cursor: "pointer", borderBottom: "1px solid var(--color-border)" },
  td: { padding: "14px 16px", fontSize: 13.5, color: "var(--color-ink-primary)", verticalAlign: "middle" },
  name: { fontSize: 14, fontWeight: 700, color: "var(--color-ink-primary)" },
  nameLink: { fontSize: 14, fontWeight: 700, color: "var(--color-ink-primary)", textDecoration: "none", borderBottom: "1px solid transparent", cursor: "pointer" },
  rating: { fontSize: 12, fontWeight: 700, color: "var(--color-accent-amber-deep)", marginTop: 2 },
  ratingCount: { fontWeight: 500, color: "var(--color-ink-muted)" },
  ratingNone: { fontSize: 11.5, color: "var(--color-ink-muted)", marginTop: 2 },
  link: { display: "inline-block", fontSize: 12, color: "var(--color-accent-amber-deep)", fontWeight: 600, textDecoration: "none", marginTop: 2, wordBreak: "break-all" },
  linkPlain: { display: "inline-block", fontSize: 12, color: "var(--color-ink-muted)", marginTop: 2 },
  pitchClip: { fontSize: 13, color: "var(--color-ink-mid)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.45 },
  badge: { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },
  actions: { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" },
  msgBtn: { padding: "7px 13px", background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", textDecoration: "none", whiteSpace: "nowrap" },
  shortlistBtn: { padding: "7px 13px", background: "var(--color-ground-card)", color: "var(--status-success-ink)", border: "1.5px solid var(--status-success-ink)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", whiteSpace: "nowrap" },
  shortlistActive: { background: "var(--status-success-bg)", borderColor: "transparent" },
  declineBtn: { padding: "7px 13px", background: "var(--color-ground-card)", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" },
  declineActive: { background: "var(--status-error-bg)", color: "var(--color-error)", borderColor: "transparent" },
  busy: { opacity: 0.6, cursor: "default" },
  expandCell: { padding: "0 16px 16px 16px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)" },
  expandLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink-muted)", padding: "14px 0 4px" },
  expandPitch: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.6, whiteSpace: "pre-wrap" },
};
