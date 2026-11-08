"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { SERVICE_OPTIONS, SERVICE_LABELS, CURRENCIES, compensationLabel, fmtDate } from "../../../lib/marketplace";

const EMPTY = {
  title: "", type: "free", payment_amount: "", currency: "USD", other_compensation: "",
  short_description: "", description: "", whats_included: "", deliverables: "",
  service: "", location: "", social_handles: "", cta_link: "",
  application_deadline: "", completion_deadline: "", content_license_until: "",
  brief_url: "", brief_name: "",
};

const STATUS_BADGE = {
  draft:  { label: "Draft",  bg: "var(--color-ground-sand)",   ink: "var(--color-ink-mid)" },
  open:   { label: "Open",   bg: "var(--status-success-bg)",   ink: "var(--status-success-ink)" },
  closed: { label: "Closed", bg: "var(--status-error-bg)",     ink: "var(--color-error)" },
};

export default function HotelJobsPage() {
  const { user } = useAuth();
  const [hotel, setHotel] = useState(null);      // { id, name, status } or null
  const [noProfile, setNoProfile] = useState(false);
  const [opps, setOpps] = useState([]);
  const [appCounts, setAppCounts] = useState({});   // opportunity_id -> count
  const [loading, setLoading] = useState(true);
  const [needsMigration, setNeedsMigration] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingBrief, setUploadingBrief] = useState(false);

  const approved = hotel?.status === "approved";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Hotel profile (needed for hotel_id + approval state).
    const { data: hp, error: hpErr } = await supabase
      .from("hotel_profiles").select("id, name, status").eq("user_id", user.id).maybeSingle();
    if (hpErr && hpErr.code === "42P01") { setNeedsMigration(true); setLoading(false); return; }
    if (!hp) { setNoProfile(true); setLoading(false); return; }
    setHotel(hp);
    setNoProfile(false);

    // RLS returns only this hotel's own opportunities.
    const { data: rows, error: oErr } = await supabase
      .from("opportunities").select("*").order("created_at", { ascending: false });
    if (oErr && oErr.code === "42P01") { setNeedsMigration(true); setLoading(false); return; }
    setOpps(rows || []);

    // Applicant counts per opportunity (RLS returns only apps to our opps).
    const { data: appRows } = await supabase.from("applications").select("opportunity_id");
    const counts = {};
    (appRows || []).forEach(a => { counts[a.opportunity_id] = (counts[a.opportunity_id] || 0) + 1; });
    setAppCounts(counts);

    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditingId(null); setForm(EMPTY); setError(""); setFormOpen(true); };
  const openEdit = (o) => {
    setEditingId(o.id);
    setForm({
      title: o.title || "", type: o.type || "free",
      payment_amount: o.payment_amount != null ? String(o.payment_amount) : "",
      currency: o.currency || "USD",
      other_compensation: o.other_compensation || "",
      short_description: o.short_description || "", description: o.description || "",
      whats_included: o.whats_included || "", deliverables: o.deliverables || "",
      service: o.service || "", location: o.location || "",
      social_handles: o.social_handles || "", cta_link: o.cta_link || "",
      application_deadline: o.application_deadline || "", completion_deadline: o.completion_deadline || "",
      content_license_until: o.content_license_until || "",
      brief_url: o.brief_url || "", brief_name: o.brief_name || "",
    });
    setError("");
    setFormOpen(true);
  };

  // Upload a creative brief to the "briefs" bucket (owner-scoped folder).
  const handleBriefFile = async (file) => {
    if (!file || !user) return;
    setUploadingBrief(true); setError("");
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("briefs").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { setError("Brief upload failed: " + upErr.message); setUploadingBrief(false); return; }
    const { data } = supabase.storage.from("briefs").getPublicUrl(path);
    setForm(f => ({ ...f, brief_url: data.publicUrl, brief_name: file.name }));
    setUploadingBrief(false);
  };

  const buildPayload = (status) => {
    const paid = form.type === "paid";
    const clean = (v) => (v && v.trim() ? v.trim() : null);
    return {
      title: form.title.trim(),
      type: form.type,
      payment_amount: paid ? (form.payment_amount ? Number(form.payment_amount) : null) : null,
      currency: paid ? form.currency : null,
      other_compensation: clean(form.other_compensation),
      short_description: clean(form.short_description),
      description: clean(form.description),
      whats_included: clean(form.whats_included),
      deliverables: clean(form.deliverables),
      service: form.service || null,
      location: clean(form.location),
      social_handles: clean(form.social_handles),
      cta_link: clean(form.cta_link),
      application_deadline: form.application_deadline || null,
      completion_deadline: form.completion_deadline || null,
      content_license_until: form.content_license_until || null,
      brief_url: form.brief_url || null,
      brief_name: form.brief_name || null,
      status,
    };
  };

  const save = async (status) => {
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (form.type === "paid" && !form.payment_amount) { setError("Enter a payment amount for a paid opportunity."); return; }
    setSaving(true); setError("");
    const payload = buildPayload(status);
    let err;
    if (editingId) {
      ({ error: err } = await supabase.from("opportunities").update(payload).eq("id", editingId));
    } else {
      ({ error: err } = await supabase.from("opportunities").insert({ ...payload, hotel_id: hotel.id }));
    }
    setSaving(false);
    if (err) {
      setError(err.message?.includes("row-level security")
        ? "Only approved hotels can publish. You can save it as a draft for now."
        : err.message);
      return;
    }
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    load();
  };

  // Quick status change from a card (publish / close / reopen / back to draft).
  const setStatus = async (o, status) => {
    const { error: err } = await supabase.from("opportunities").update({ status }).eq("id", o.id);
    if (err) {
      alert(err.message?.includes("row-level security")
        ? "Only approved hotels can publish opportunities."
        : "Could not update: " + err.message);
      return;
    }
    load();
  };

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Jobs</h1>
          <p style={s.sub}>Post collab opportunities for creators to apply to. Drafts are private; publishing makes them visible on the job board.</p>
        </div>
        {hotel && !noProfile && (
          <button style={s.newBtn} onClick={openNew}>+ New opportunity</button>
        )}
      </div>

      {needsMigration && (
        <div style={s.noticeWarn}>The <code>opportunities</code> table isn’t set up. Run migration <code>0004_opportunities_applications.sql</code>, then reload.</div>
      )}

      {noProfile && (
        <div style={s.noticeWarn}>
          Set up your <Link href="/hotel/profile" style={s.inlineLink}>hotel profile</Link> first — opportunities are attached to it.
        </div>
      )}

      {hotel && !approved && !noProfile && (
        <div style={s.noticeInfo}>
          Your hotel is <b>pending review</b>. You can create and save drafts now — publishing to the job board unlocks once you’re approved.
        </div>
      )}

      {/* Create / edit form */}
      {formOpen && (
        <div style={s.card}>
          <h3 style={s.formTitle}>{editingId ? "Edit opportunity" : "New opportunity"}</h3>

          <div style={s.field}>
            <label style={s.label}>Title <span style={s.req}>*</span></label>
            <input style={s.input} placeholder="Winter content collab — 3 nights" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Type</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["free", "paid"].map(t => (
                  <button key={t} type="button"
                    style={{ ...s.typeBtn, ...(form.type === t ? s.typeBtnActive : {}) }}
                    onClick={() => setForm(f => ({ ...f, type: t }))}>
                    {t === "free" ? "Free collab" : "Paid"}
                  </button>
                ))}
              </div>
            </div>
            {form.type === "paid" && (
              <div style={s.field}>
                <label style={s.label}>Payment <span style={s.req}>*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ ...s.input, width: 90, flex: "none" }} value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input style={s.input} type="number" min="0" step="1" placeholder="500" value={form.payment_amount} onChange={e => setForm(f => ({ ...f, payment_amount: e.target.value }))} />
                </div>
              </div>
            )}
          </div>

          <div style={s.field}>
            <label style={s.label}>Other compensation</label>
            <input style={s.input} placeholder="e.g. free 3-night stay + $300 product credit" value={form.other_compensation} onChange={e => setForm(f => ({ ...f, other_compensation: e.target.value }))} />
          </div>

          <div style={s.field}>
            <label style={s.label}>Short description</label>
            <textarea style={{ ...s.input, minHeight: 60, resize: "vertical" }} placeholder="One or two lines creators see first on the board." value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Campaign description</label>
            <textarea style={{ ...s.input, minHeight: 120, resize: "vertical" }} placeholder="The full brief in your words — the idea, the vibe, what you're looking for." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>What’s included <span style={s.hint}>— what the creator receives</span></label>
            <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} placeholder="e.g. 3 nights, all meals, spa access." value={form.whats_included} onChange={e => setForm(f => ({ ...f, whats_included: e.target.value }))} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Deliverables <span style={s.hint}>— what the creator delivers</span></label>
            <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} placeholder="e.g. 1 Reel, 3 stories, 5 edited photos." value={form.deliverables} onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))} />
          </div>

          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Service type</label>
              <select style={s.input} value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}>
                <option value="">Select…</option>
                {SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>Creator location</label>
              <input style={s.input} placeholder="e.g. United States, or Anywhere" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
          </div>

          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Social hashtags &amp; mentions</label>
              <input style={s.input} placeholder="@yourhotel #stay" value={form.social_handles} onChange={e => setForm(f => ({ ...f, social_handles: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>CTA link</label>
              <input style={s.input} placeholder="https://yourhotel.com/book" value={form.cta_link} onChange={e => setForm(f => ({ ...f, cta_link: e.target.value }))} />
            </div>
          </div>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Application deadline</label>
              <input style={s.input} type="date" value={form.application_deadline} onChange={e => setForm(f => ({ ...f, application_deadline: e.target.value }))} />
            </div>
            <div style={s.field}>
              <label style={s.label}>Content deadline</label>
              <input style={s.input} type="date" value={form.completion_deadline} onChange={e => setForm(f => ({ ...f, completion_deadline: e.target.value }))} />
            </div>
          </div>
          <div style={s.row2}>
            <div style={s.field}>
              <label style={s.label}>Content licensed until</label>
              <input style={s.input} type="date" value={form.content_license_until} onChange={e => setForm(f => ({ ...f, content_license_until: e.target.value }))} />
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Creative brief</label>
            {form.brief_name ? (
              <div style={s.briefRow}>
                <a href={form.brief_url} target="_blank" rel="noreferrer" style={s.briefLink}>📄 {form.brief_name}</a>
                <button type="button" style={s.briefRemove} onClick={() => setForm(f => ({ ...f, brief_url: "", brief_name: "" }))}>Remove</button>
              </div>
            ) : (
              <label style={{ ...s.briefUpload, ...(uploadingBrief ? { opacity: 0.6 } : {}) }}>
                {uploadingBrief ? "Uploading…" : "＋ Upload a brief (PDF, image or doc)"}
                <input type="file" style={{ display: "none" }} accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg"
                  onChange={e => e.target.files?.[0] && handleBriefFile(e.target.files[0])} disabled={uploadingBrief} />
              </label>
            )}
          </div>

          {error && <p style={s.error}>{error}</p>}

          <div style={s.formActions}>
            <button style={s.ghostBtn} onClick={() => { setFormOpen(false); setEditingId(null); }} disabled={saving}>Cancel</button>
            <button style={s.draftBtn} onClick={() => save("draft")} disabled={saving}>{saving ? "Saving…" : "Save draft"}</button>
            <button
              style={{ ...s.publishBtn, ...(approved ? {} : s.disabledBtn) }}
              onClick={() => save("open")}
              disabled={saving || !approved}
              title={approved ? "" : "Publishing unlocks once your hotel is approved"}
            >
              {editingId ? "Save & publish" : "Publish"}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : (!noProfile && opps.length === 0 && !needsMigration) ? (
        <div style={s.empty}>
          <p style={{ fontSize: 15, color: "var(--color-ink-mid)", marginBottom: 14 }}>No opportunities yet.</p>
          <button style={s.newBtn} onClick={openNew}>+ Create your first opportunity</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {opps.map(o => {
            const badge = STATUS_BADGE[o.status] || STATUS_BADGE.draft;
            return (
              <div key={o.id} style={s.oppCard}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <h3 style={s.oppTitle}>{o.title}</h3>
                    <span style={{ ...s.badge, background: badge.bg, color: badge.ink }}>{badge.label}</span>
                    <span style={s.typePill}>{compensationLabel(o)}</span>
                    {o.service && <span style={s.servicePill}>{SERVICE_LABELS[o.service] || o.service}</span>}
                  </div>
                  {o.short_description && <p style={s.oppDesc}>{o.short_description}</p>}
                  {o.other_compensation && <p style={s.otherComp}>🎁 {o.other_compensation}</p>}
                  <div style={s.metaRow}>
                    {o.location && <span>📍 {o.location}</span>}
                    {o.application_deadline && <span>Apply by {fmtDate(o.application_deadline)}</span>}
                    {o.completion_deadline && <span>Content due {fmtDate(o.completion_deadline)}</span>}
                    {o.content_license_until && <span>License till {fmtDate(o.content_license_until)}</span>}
                    {o.brief_url && <a href={o.brief_url} target="_blank" rel="noreferrer" style={s.briefChip}>📄 Brief</a>}
                  </div>
                </div>
                <div style={s.oppActions}>
                  <Link href={`/hotel/jobs/${o.id}`} style={s.applicantsLink}>
                    {(appCounts[o.id] || 0)} applicant{(appCounts[o.id] || 0) === 1 ? "" : "s"}
                  </Link>
                  <button style={s.smallGhost} onClick={() => openEdit(o)}>Edit</button>
                  {o.status === "draft" && (
                    <button style={{ ...s.smallPrimary, ...(approved ? {} : s.disabledBtn) }} onClick={() => setStatus(o, "open")} disabled={!approved} title={approved ? "" : "Approval required to publish"}>Publish</button>
                  )}
                  {o.status === "open" && (
                    <button style={s.smallGhost} onClick={() => setStatus(o, "closed")}>Close</button>
                  )}
                  {o.status === "closed" && (
                    <button style={{ ...s.smallPrimary, ...(approved ? {} : s.disabledBtn) }} onClick={() => setStatus(o, "open")} disabled={!approved}>Reopen</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: "40px 24px 64px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, maxWidth: "56ch", lineHeight: 1.55 },
  newBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "11px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", whiteSpace: "nowrap" },
  noticeWarn: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.5, marginBottom: 18 },
  noticeInfo: { background: "rgba(224,149,74,0.12)", color: "var(--color-ink-primary)", border: "1px solid rgba(224,149,74,0.3)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.5, marginBottom: 18 },
  inlineLink: { color: "var(--color-accent-amber-deep)", fontWeight: 700, textDecoration: "underline" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "24px 24px", boxShadow: "var(--shadow-low)", marginBottom: 24 },
  formTitle: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 16 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field: { marginBottom: 14, minWidth: 0 },
  label: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  req: { color: "var(--color-error)" },
  hint: { fontWeight: 500, color: "var(--color-ink-muted)", textTransform: "none", letterSpacing: 0 },
  briefRow: { display: "flex", alignItems: "center", gap: 12, background: "var(--color-ground-sand)", borderRadius: "var(--radius-md)", padding: "10px 14px" },
  briefLink: { fontSize: 13.5, fontWeight: 600, color: "var(--color-accent-amber-deep)", textDecoration: "none", wordBreak: "break-all", flex: 1 },
  briefRemove: { background: "none", border: "none", color: "var(--color-error)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  briefUpload: { display: "block", textAlign: "center", cursor: "pointer", border: "1.5px dashed var(--color-border)", borderRadius: "var(--radius-md)", padding: "14px", fontSize: 13.5, fontWeight: 600, color: "var(--color-ink-mid)" },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 13px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  typeBtn: { flex: 1, padding: "10px 12px", borderRadius: "var(--radius-md)", border: "1.5px solid var(--color-border)", background: "var(--color-ground-card)", color: "var(--color-ink-mid)", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  typeBtnActive: { borderColor: "var(--color-action-forest)", background: "var(--color-action-forest)", color: "var(--color-ground-page)" },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "2px 0 0" },
  formActions: { marginTop: 18, display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  ghostBtn: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  draftBtn: { background: "var(--color-ground-sand)", color: "var(--color-ink-primary)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  publishBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  disabledBtn: { opacity: 0.45, cursor: "not-allowed" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { textAlign: "center", padding: "48px 24px", background: "var(--color-ground-card)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)" },
  oppCard: { display: "flex", gap: 16, justifyContent: "space-between", alignItems: "flex-start", background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "18px 20px", boxShadow: "var(--shadow-low)", flexWrap: "wrap" },
  oppTitle: { fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)" },
  badge: { fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--radius-pill)" },
  typePill: { fontSize: 11.5, fontWeight: 600, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "3px 10px", borderRadius: "var(--radius-pill)" },
  servicePill: { fontSize: 11.5, fontWeight: 600, color: "var(--color-accent-amber-deep)", background: "rgba(224,149,74,0.14)", padding: "3px 10px", borderRadius: "var(--radius-pill)" },
  oppDesc: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.5, marginBottom: 6 },
  otherComp: { fontSize: 12.5, color: "var(--color-ink-mid)", fontWeight: 600, marginBottom: 8 },
  briefChip: { fontSize: 12, fontWeight: 700, color: "var(--color-accent-amber-deep)", textDecoration: "none" },
  metaRow: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "var(--color-ink-muted)" },
  oppActions: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 },
  applicantsLink: { fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-amber-deep)", textDecoration: "none", padding: "7px 10px", whiteSpace: "nowrap" },
  smallGhost: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "7px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  smallPrimary: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-sm)", padding: "7px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
