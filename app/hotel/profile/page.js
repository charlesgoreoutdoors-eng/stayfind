"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";

const FIELDS = [
  { key: "name",            label: "Hotel name",     type: "text",     placeholder: "The Dapple House", required: true },
  { key: "city",            label: "City",           type: "text",     placeholder: "Byron Bay" },
  { key: "country",         label: "Country",        type: "text",     placeholder: "Australia" },
  { key: "description",     label: "Description",    type: "textarea", placeholder: "Tell creators what makes your property special." },
  { key: "website",         label: "Website URL",    type: "url",      placeholder: "https://…" },
  { key: "instagram",       label: "Instagram URL",  type: "url",      placeholder: "https://instagram.com/…" },
  { key: "logo_url",        label: "Logo image URL", type: "url",      placeholder: "https://…" },
  { key: "cover_image_url", label: "Cover image URL",type: "url",      placeholder: "https://…" },
  { key: "contact_name",    label: "Contact name",   type: "text",     placeholder: "Who creators will hear from" },
  { key: "contact_email",   label: "Contact email",  type: "email",    placeholder: "you@hotel.com" },
];

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, ""]));

const STATUS_BADGE = {
  pending:  { label: "Pending review", bg: "var(--status-sent-bg)",    ink: "var(--status-sent-ink)" },
  approved: { label: "Approved",       bg: "var(--status-success-bg)", ink: "var(--status-success-ink)" },
  rejected: { label: "Not approved",   bg: "var(--status-error-bg)",   ink: "var(--color-error)" },
};

export default function HotelProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState(null);     // row status, or null if no row yet
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("hotel_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error) {
        // 42P01 = relation does not exist (migration 0002 not run yet).
        if (error.code === "42P01") setNeedsMigration(true);
        else setError(error.message);
      } else if (data) {
        setForm({ ...EMPTY, ...Object.fromEntries(FIELDS.map(f => [f.key, data[f.key] ?? ""])) });
        setStatus(data.status);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const update = (key, val) => { setForm(prev => ({ ...prev, [key]: val })); setSaved(false); };

  const handleSave = async () => {
    if (!user || !form.name.trim()) { setError("Hotel name is required."); return; }
    setSaving(true);
    setError("");
    const payload = { user_id: user.id };
    FIELDS.forEach(f => { payload[f.key] = form[f.key]?.trim() || null; });
    const { data, error } = await supabase
      .from("hotel_profiles")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .single();
    if (error) {
      if (error.code === "42P01") setNeedsMigration(true);
      else setError(error.message);
    } else {
      setStatus(data.status);
      setSaved(true);
    }
    setSaving(false);
  };

  const badge = status ? STATUS_BADGE[status] : null;

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Hotel profile</h1>
          <p style={s.sub}>This is how your property appears to creators. New profiles are reviewed before they go live.</p>
        </div>
        {badge && <span style={{ ...s.statusBadge, background: badge.bg, color: badge.ink }}>{badge.label}</span>}
      </div>

      {needsMigration && (
        <div style={s.noticeWarn}>
          The <code>hotel_profiles</code> table isn’t set up yet. Run migration{" "}
          <code>0002_hotel_profiles.sql</code> in Supabase, then reload this page.
        </div>
      )}

      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : (
        <div style={s.card}>
          {FIELDS.map(f => (
            <div key={f.key} style={s.field}>
              <label style={s.label}>{f.label}{f.required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
              {f.type === "textarea" ? (
                <textarea
                  style={{ ...s.input, minHeight: 92, resize: "vertical" }}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => update(f.key, e.target.value)}
                />
              ) : (
                <input
                  style={s.input}
                  type={f.type}
                  placeholder={f.placeholder}
                  value={form[f.key]}
                  onChange={e => update(f.key, e.target.value)}
                />
              )}
            </div>
          ))}

          {error && <p style={s.error}>{error}</p>}

          <div style={s.actions}>
            <button
              style={{ ...s.saveBtn, ...(saving ? { opacity: 0.7, cursor: "default" } : {}) }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 64px" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, maxWidth: "52ch", lineHeight: 1.55 },
  statusBadge: { fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap" },
  noticeWarn: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "28px 26px", boxShadow: "var(--shadow-low)" },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "4px 0 0" },
  actions: { marginTop: 22, display: "flex", justifyContent: "flex-end" },
  saveBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "13px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
