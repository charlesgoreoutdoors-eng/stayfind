"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { sanitizeText } from "../lib/marketplace";

const STATUS = {
  new:               { label: "Applied",           bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  shortlisted:       { label: "Shortlisted",       bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  offered:           { label: "Offer sent",        bg: "rgba(224,149,74,0.16)",    ink: "var(--color-accent-amber-deep)" },
  booked:            { label: "Booked",            bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  content_submitted: { label: "Content submitted", bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  completed:         { label: "Completed",         bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  declined:          { label: "Declined",          bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
  withdrawn:         { label: "Withdrawn",         bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

function Stars({ value, onChange, size = 20 }) {
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type={onChange ? "button" : undefined} onClick={onChange ? () => onChange(n) : undefined}
          style={{ background: "none", border: "none", padding: 0, cursor: onChange ? "pointer" : "default", lineHeight: 0 }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? "var(--color-accent-amber)" : "var(--color-border)"}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ConversationThread({ applicationId, backHref }) {
  const { user, profile } = useAuth();
  const [app, setApp] = useState(null);
  const [role, setRole] = useState(null);       // "hotel" | "creator"
  const [messages, setMessages] = useState([]);
  const [subs, setSubs] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [subUrl, setSubUrl] = useState("");
  const [subNote, setSubNote] = useState("");
  const [showSubmit, setShowSubmit] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const endRef = useRef(null);

  const loadMessages = useCallback(async () => {
    const { data } = await supabase.from("messages").select("*").eq("application_id", applicationId).order("created_at", { ascending: true });
    setMessages(data || []);
  }, [applicationId]);

  const load = useCallback(async () => {
    if (!user || !applicationId) return;
    const { data } = await supabase
      .from("applications")
      .select("*, opportunity:opportunities ( id, title, hotel_id, hotel:hotel_profiles ( name, user_id, logo_url ) )")
      .eq("id", applicationId).maybeSingle();
    if (!data) { setNotFound(true); setLoading(false); return; }
    setApp(data);
    setRole(data.opportunity?.hotel?.user_id === user.id ? "hotel" : data.creator_id === user.id ? "creator" : null);
    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("submissions").select("*").eq("application_id", applicationId).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("application_id", applicationId),
    ]);
    setSubs(s || []); setReviews(r || []);
    await loadMessages();
    setLoading(false);
  }, [user, applicationId, loadMessages]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(loadMessages, 8000); return () => clearInterval(t); }, [loadMessages]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  const send = async () => {
    const text = sanitizeText(body).trim();
    if (!text) return;
    setBody("");
    const { data, error } = await supabase.from("messages").insert({ application_id: applicationId, sender_id: user.id, body: text }).select().single();
    if (error) { alert("Could not send: " + error.message); setBody(text); return; }
    setMessages(m => [...m, data]);
  };

  const patch = async (fields) => {
    setBusy(true);
    const { error } = await supabase.from("applications").update(fields).eq("id", applicationId);
    setBusy(false);
    if (error) { alert("Could not update: " + error.message); return false; }
    setApp(a => ({ ...a, ...fields }));
    return true;
  };

  const sendOffer   = () => patch({ status: "offered", offered_at: new Date().toISOString() });
  const acceptOffer = () => patch({ status: "booked", booked_at: new Date().toISOString() });
  const declineOffer= () => patch({ status: "withdrawn" });
  const markPaid    = () => patch({ status: "completed", paid_at: new Date().toISOString(), completed_at: new Date().toISOString() });

  const submitContent = async () => {
    if (!subUrl.trim()) { alert("Add a link to your content."); return; }
    setBusy(true);
    const { error } = await supabase.from("submissions").insert({ application_id: applicationId, creator_id: user.id, url: subUrl.trim(), note: sanitizeText(subNote).trim() || null });
    if (!error) await supabase.from("applications").update({ status: "content_submitted" }).eq("id", applicationId);
    setBusy(false);
    if (error) { alert("Could not submit: " + error.message); return; }
    setShowSubmit(false); setSubUrl(""); setSubNote("");
    load();
  };

  const leaveReview = async () => {
    const revieweeId = role === "hotel" ? app.creator_id : app.opportunity?.hotel?.user_id;
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({
      application_id: applicationId, opportunity_id: app.opportunity_id,
      reviewer_id: user.id, reviewee_id: revieweeId, reviewer_role: role,
      rating, comment: sanitizeText(reviewText).trim() || null,
    });
    setBusy(false);
    if (error) { alert(error.code === "23505" ? "You already reviewed this collab." : error.message); return; }
    setShowReview(false); setReviewText(""); setRating(5);
    load();
  };

  if (loading) return <div style={s.wrap}><div style={s.loadingRow}><span style={s.spinner} /> Loading…</div></div>;
  if (notFound || !role) return <div style={s.wrap}><Link href={backHref} style={s.back}>← Inbox</Link><div style={s.notice}>Conversation not available.</div></div>;

  const hotel = app.opportunity?.hotel || {};
  const otherName = role === "hotel" ? (app.creator_name || "Creator") : (hotel.name || "Hotel");
  const badge = STATUS[app.status] || STATUS.new;
  const myReview = reviews.find(r => r.reviewer_id === user.id);

  return (
    <div style={s.wrap}>
      <Link href={backHref} style={s.back}>← Inbox</Link>

      <div style={s.header}>
        <div style={{ minWidth: 0 }}>
          <div style={s.with}>Conversation with <b>{otherName}</b></div>
          <div style={s.oppTitle}>{app.opportunity?.title}</div>
        </div>
        <span style={{ ...s.badge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
      </div>

      {/* Lifecycle action panel */}
      <ActionPanel
        role={role} status={app.status} busy={busy} subs={subs}
        onOffer={sendOffer} onAccept={acceptOffer} onDecline={declineOffer}
        onSubmit={() => setShowSubmit(true)} onPaid={markPaid}
        onReview={() => setShowReview(true)} hasReview={!!myReview}
      />

      {/* Submit content form */}
      {showSubmit && (
        <div style={s.panel}>
          <label style={s.label}>Link to your content (Drive, Dropbox, post URL…)</label>
          <input style={s.input} placeholder="https://…" value={subUrl} onChange={e => setSubUrl(e.target.value)} />
          <input style={{ ...s.input, marginTop: 8 }} placeholder="Note (optional)" value={subNote} onChange={e => setSubNote(e.target.value)} />
          <div style={s.panelActions}>
            <button style={s.ghost} onClick={() => setShowSubmit(false)} disabled={busy}>Cancel</button>
            <button style={s.primary} onClick={submitContent} disabled={busy}>Submit content</button>
          </div>
        </div>
      )}

      {/* Review form */}
      {showReview && !myReview && (
        <div style={s.panel}>
          <label style={s.label}>Rate {otherName}</label>
          <Stars value={rating} onChange={setRating} />
          <textarea style={{ ...s.input, minHeight: 80, resize: "vertical", marginTop: 10 }} placeholder="Share how the collab went…" value={reviewText} onChange={e => setReviewText(e.target.value)} />
          <div style={s.panelActions}>
            <button style={s.ghost} onClick={() => setShowReview(false)} disabled={busy}>Cancel</button>
            <button style={s.primary} onClick={leaveReview} disabled={busy}>Submit review</button>
          </div>
        </div>
      )}

      {/* Reviews shown once left */}
      {reviews.length > 0 && (
        <div style={s.reviews}>
          {reviews.map(r => (
            <div key={r.id} style={s.reviewCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={s.reviewWho}>{r.reviewer_role === "hotel" ? "Hotel's review" : "Creator's review"}</span>
                <Stars value={r.rating} size={14} />
              </div>
              {r.comment && <p style={s.reviewComment}>{r.comment}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={s.thread}>
        {messages.length === 0 ? (
          <p style={s.emptyMsg}>No messages yet — say hello 👋</p>
        ) : messages.map(m => {
          const mine = m.sender_id === user.id;
          return (
            <div key={m.id} style={{ ...s.bubbleRow, justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div style={{ ...s.bubble, ...(mine ? s.bubbleMine : s.bubbleTheirs) }}>
                <div style={s.bubbleText}>{m.body}</div>
                <div style={{ ...s.bubbleTime, color: mine ? "rgba(251,245,234,0.6)" : "var(--color-ink-muted)" }}>{fmtTime(m.created_at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={s.composer}>
        <textarea style={s.composerInput} placeholder="Write a message…" value={body}
          onChange={e => setBody(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button style={s.sendBtn} onClick={send} disabled={!body.trim()}>Send</button>
      </div>
    </div>
  );
}

function ActionPanel({ role, status, busy, subs, onOffer, onAccept, onDecline, onSubmit, onPaid, onReview, hasReview }) {
  let content = null;
  if (role === "hotel") {
    if (status === "new" || status === "shortlisted") content = <><span style={s.apText}>Like this creator? Send them an offer to book the collab.</span><button style={s.primary} onClick={onOffer} disabled={busy}>Send offer</button></>;
    else if (status === "offered") content = <span style={s.apText}>Offer sent — waiting for the creator to accept.</span>;
    else if (status === "booked") content = <span style={s.apText}>Booked. Waiting for the creator to submit their content.</span>;
    else if (status === "content_submitted") content = <><span style={s.apText}>Content submitted. Review it below, then mark as paid.</span><button style={s.primary} onClick={onPaid} disabled={busy}>Mark as paid</button></>;
    else if (status === "completed") content = hasReview ? <span style={s.apText}>Completed · review left ✓</span> : <><span style={s.apText}>Collab complete — leave the creator a review.</span><button style={s.primary} onClick={onReview} disabled={busy}>Leave a review</button></>;
  } else {
    if (status === "new" || status === "shortlisted") content = <span style={s.apText}>Chat with the hotel. They’ll send an offer when ready.</span>;
    else if (status === "offered") content = <><span style={s.apText}>The hotel sent you an offer to book this collab.</span><div style={{ display: "flex", gap: 8 }}><button style={s.primary} onClick={onAccept} disabled={busy}>Accept offer</button><button style={s.ghost} onClick={onDecline} disabled={busy}>Decline</button></div></>;
    else if (status === "booked") content = <><span style={s.apText}>Booked! When your content is ready, submit it here.</span><button style={s.primary} onClick={onSubmit} disabled={busy}>Submit content</button></>;
    else if (status === "content_submitted") content = <span style={s.apText}>Content submitted — waiting for the hotel to review & pay.</span>;
    else if (status === "completed") content = hasReview ? <span style={s.apText}>Completed · review left ✓</span> : <><span style={s.apText}>Paid & complete — leave the hotel a review.</span><button style={s.primary} onClick={onReview} disabled={busy}>Leave a review</button></>;
  }
  if (status === "declined" || status === "withdrawn") content = <span style={s.apText}>This application was {status}.</span>;
  if (!content) return null;

  return (
    <div style={s.actionPanel}>
      <div style={s.apInner}>{content}</div>
      {subs.length > 0 && (
        <div style={s.subs}>
          <div style={s.subsLabel}>Submitted content</div>
          {subs.map(x => (
            <div key={x.id} style={s.subRow}>
              <a href={x.url} target="_blank" rel="noreferrer" style={s.subLink}>🔗 {x.url}</a>
              {x.note && <span style={s.subNote}>{x.note}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtTime(iso) {
  try { return new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

const s = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "28px 24px 40px", display: "flex", flexDirection: "column", minHeight: "calc(100vh - 20px)" },
  back: { fontSize: 13, fontWeight: 600, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 14 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  notice: { background: "var(--status-error-bg)", color: "var(--color-error)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14 },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 14, flexWrap: "wrap" },
  with: { fontSize: 13, color: "var(--color-ink-muted)" },
  oppTitle: { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-ink-primary)", lineHeight: 1.2, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: 700, padding: "6px 13px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },

  actionPanel: { background: "var(--color-ground-sand)", borderRadius: "var(--radius-card)", padding: "16px 18px", marginBottom: 14 },
  apInner: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" },
  apText: { fontSize: 13.5, color: "var(--color-ink-mid)", fontWeight: 500 },
  subs: { marginTop: 14, borderTop: "1px solid var(--color-border)", paddingTop: 12 },
  subsLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--color-ink-muted)", marginBottom: 6 },
  subRow: { display: "flex", flexDirection: "column", gap: 2, marginBottom: 8 },
  subLink: { fontSize: 13, color: "var(--color-accent-amber-deep)", fontWeight: 600, textDecoration: "none", wordBreak: "break-all" },
  subNote: { fontSize: 12.5, color: "var(--color-ink-muted)" },

  panel: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "16px 18px", marginBottom: 14, boxShadow: "var(--shadow-low)" },
  label: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 13px", fontSize: 13.5, fontFamily: "inherit", outline: "none", color: "var(--color-ink-primary)", background: "var(--color-ground-card)" },
  panelActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 },

  reviews: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 },
  reviewCard: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px" },
  reviewWho: { fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)" },
  reviewComment: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.5, marginTop: 6 },

  thread: { flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: "6px 0 14px", minHeight: 200 },
  emptyMsg: { textAlign: "center", color: "var(--color-ink-muted)", fontSize: 14, padding: "30px 0" },
  bubbleRow: { display: "flex" },
  bubble: { maxWidth: "76%", borderRadius: 16, padding: "9px 13px" },
  bubbleMine: { background: "var(--color-action-forest)", borderBottomRightRadius: 5 },
  bubbleTheirs: { background: "var(--color-ground-sand)", borderBottomLeftRadius: 5 },
  bubbleText: { fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", color: "inherit" },
  bubbleTime: { fontSize: 10.5, marginTop: 3 },

  composer: { display: "flex", gap: 10, alignItems: "flex-end", borderTop: "1px solid var(--color-border)", paddingTop: 12, position: "sticky", bottom: 0, background: "var(--color-ground-page)" },
  composerInput: { flex: 1, minHeight: 44, maxHeight: 140, resize: "vertical", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", outline: "none", color: "var(--color-ink-primary)", background: "var(--color-ground-card)" },
  sendBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  ghost: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  primary: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", whiteSpace: "nowrap" },
};

// bubble text colour for mine (cream on forest)
s.bubbleMine.color = "var(--color-ground-page)";
s.bubbleTheirs.color = "var(--color-ink-primary)";
