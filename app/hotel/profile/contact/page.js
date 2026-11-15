"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/auth";
import { sanitizeText } from "../../../../lib/marketplace";
import { readDraft, writeDraft, clearDraft } from "../../../../lib/draft";
import HotelAccountTabs from "../../../../components/HotelAccountTabs";

const FIELDS = [
  { key: "contact_name",  label: "Contact name",  type: "text",  placeholder: "Who creators will hear from" },
  { key: "contact_email", label: "Contact email", type: "email", placeholder: "you@hotel.com" },
];

const EMPTY = Object.fromEntries(FIELDS.map(f => [f.key, ""]));

export default function HotelContactPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [hotelName, setHotelName] = useState(null); // required NOT NULL column — preserved on save
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [needsMigration, setNeedsMigration] = useState(false);

  const draftKey = user ? `dapples_hotel_contact_draft_${user.id}` : null;
  const hydrated = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("hotel_profiles")
        .select("name, contact_name, contact_email")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      let base = EMPTY;
      if (error) {
        if (error.code === "42P01") setNeedsMigration(true);
        else setError(error.message);
      } else if (data) {
        setHotelName(data.name || null);
        base = { ...EMPTY, ...Object.fromEntries(FIELDS.map(f => [f.key, data[f.key] ?? ""])) };
      }
      const draft = readDraft(draftKey);
      setForm(draft ? { ...base, ...draft } : base);
      hydrated.current = true;
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      if (hydrated.current) writeDraft(draftKey, next);
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!hotelName) { setError("Add your hotel name on the Profile tab first."); return; }
    setSaving(true);
    setError("");
    try {
      const payload = { user_id: user.id, name: hotelName };
      FIELDS.forEach(f => { payload[f.key] = sanitizeText(form[f.key])?.trim() || null; });
      const { error } = await supabase
        .from("hotel_profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (error) {
        if (error.code === "42P01") setNeedsMigration(true);
        else setError(error.message);
        console.error("[hotel contact save]", error);
      } else {
        clearDraft(draftKey);
        setSaved(true);
      }
    } catch (e) {
      console.error("[hotel contact save] threw", e);
      setError(e?.message || "Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.wrap}>
      <HotelAccountTabs />

      <div style={s.header}>
        <h1 style={s.title}>Contact</h1>
        <p style={s.sub}>Who creators hear from when they collaborate with you. This isn’t shown publicly on your listings.</p>
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
          {!hotelName && !needsMigration && (
            <div style={s.noticeInfo}>
              Add your hotel name on the <Link href="/hotel/profile" style={s.inlineLink}>Profile tab</Link> before saving contact details.
            </div>
          )}

          {FIELDS.map(f => (
            <div key={f.key} style={s.field}>
              <label style={s.label}>{f.label}</label>
              <input
                style={s.input}
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => update(f.key, e.target.value)}
              />
            </div>
          ))}

          {error && <p style={s.error}>{error}</p>}

          <div style={s.actions}>
            <button
              style={{ ...s.saveBtn, ...(saving ? { opacity: 0.7, cursor: "default" } : {}) }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save contact"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: "40px 24px 64px" },
  header: { marginBottom: 24 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, maxWidth: "52ch", lineHeight: 1.55 },
  noticeWarn: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 },
  noticeInfo: { background: "rgba(224,149,74,0.12)", color: "var(--color-ink-mid)", border: "1px solid rgba(224,149,74,0.3)", borderRadius: "var(--radius-md)", padding: "11px 16px", fontSize: 13, marginBottom: 18 },
  inlineLink: { color: "var(--color-action-forest)", fontWeight: 600 },
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
