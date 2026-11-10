"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { sanitizeText } from "../../lib/marketplace";
import AccountTabs from "../../components/AccountTabs";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not", label: "Prefer not to say" },
];

const TEXT_FIELDS = ["username", "first_name", "last_name", "headline", "portfolio_url", "phone", "bio"];
const EMPTY = { ...Object.fromEntries(TEXT_FIELDS.map(k => [k, ""])), gender: "", avatar_url: "" };

export default function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (data) {
        // Seed first/last from full_name if they're not set yet.
        const [fn, ...rest] = (data.full_name || "").trim().split(" ");
        setForm({
          ...EMPTY,
          ...Object.fromEntries(TEXT_FIELDS.map(k => [k, data[k] ?? ""])),
          first_name: data.first_name ?? (fn || ""),
          last_name: data.last_name ?? (rest.join(" ") || ""),
          gender: data.gender ?? "",
          avatar_url: data.avatar_url ?? "",
        });
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const uploadAvatar = async (file) => {
    if (!file || !user) return;
    setUploading(true); setError("");
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { setError("Photo upload failed: " + upErr.message); setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setForm(f => ({ ...f, avatar_url: data.publicUrl })); setSaved(false);
    setUploading(false);
  };

  const save = async () => {
    setSaving(true); setError("");
    try {
      const clean = (v) => { const t = sanitizeText(v); return t && t.trim() ? t.trim() : null; };
      const payload = {};
      TEXT_FIELDS.forEach(k => { payload[k] = clean(form[k]); });
      payload.gender = form.gender || null;
      payload.avatar_url = form.avatar_url || null;
      const full = [form.first_name, form.last_name].map(x => (x || "").trim()).filter(Boolean).join(" ");
      if (full) payload.full_name = full;
      const { error: err } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (err) { setError(err.message); console.error("[account save]", err); }
      else setSaved(true);
    } catch (e) {
      console.error("[account save] threw", e); setError(e?.message || "Could not save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  const initial = (form.first_name || user?.email || "C").trim()[0]?.toUpperCase() || "C";

  return (
    <div style={s.wrap}>
      <AccountTabs />

      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : (
        <div style={s.cols}>
          {/* Left — avatar card */}
          <div style={s.avatarCard}>
            {form.avatar_url
              ? <img src={form.avatar_url} alt="" style={s.avatar} />
              : <div style={s.avatarFallback}>{initial}</div>}
            <p style={s.avatarHint}>Allowed *.jpeg, *.jpg, *.png, *.gif<br />max size of 30 Mb</p>
            <label style={{ ...s.choosePhoto, ...(uploading ? { opacity: 0.6 } : {}) }}>
              {uploading ? "Uploading…" : "Choose profile picture"}
              <input type="file" style={{ display: "none" }} accept="image/jpeg,image/png,image/gif"
                onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} disabled={uploading} />
            </label>
          </div>

          {/* Right — form */}
          <div style={s.form}>
            <div style={s.row2}>
              <Field label="Username" required>
                <input style={s.input} placeholder="your-handle" value={form.username} onChange={e => set("username", e.target.value)} />
                <p style={s.helper}>Your profile URL: dapples.io/@{form.username || "your-handle"}</p>
              </Field>
              <Field label="Email">
                <input style={{ ...s.input, background: "var(--color-ground-sand)", color: "var(--color-ink-muted)" }} value={user?.email || ""} readOnly />
              </Field>
            </div>

            <div style={s.row2}>
              <Field label="First name" required>
                <input style={s.input} value={form.first_name} onChange={e => set("first_name", e.target.value)} />
              </Field>
              <Field label="Last name" required>
                <input style={s.input} value={form.last_name} onChange={e => set("last_name", e.target.value)} />
              </Field>
            </div>

            <Field label="Gender">
              <div style={s.radios}>
                {GENDERS.map(g => (
                  <label key={g.value} style={s.radioLabel}>
                    <input type="radio" name="gender" checked={form.gender === g.value} onChange={() => set("gender", g.value)} style={{ accentColor: "var(--color-action-forest)" }} />
                    <span>{g.label}</span>
                  </label>
                ))}
              </div>
            </Field>

            <div style={s.row2}>
              <Field label="Headline">
                <input style={s.input} placeholder="Photographer | Videographer" value={form.headline} onChange={e => set("headline", e.target.value)} />
              </Field>
              <Field label="Portfolio URL">
                <input style={s.input} placeholder="https://…" value={form.portfolio_url} onChange={e => set("portfolio_url", e.target.value)} />
              </Field>
            </div>

            <Field label="Phone">
              <input style={s.input} placeholder="+61 400 000 000" value={form.phone} onChange={e => set("phone", e.target.value)} />
            </Field>

            <Field label="Tell us about yourself">
              <textarea style={{ ...s.input, minHeight: 110, resize: "vertical" }} placeholder="A short bio about you and the content you make." value={form.bio} onChange={e => set("bio", e.target.value)} />
            </Field>

            {error && <p style={s.error}>{error}</p>}

            <button style={{ ...s.saveBtn, ...(saving ? { opacity: 0.7, cursor: "default" } : {}) }} onClick={save} disabled={saving}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <label style={s.label}>{label}{required && <span style={{ color: "var(--color-error)" }}> *</span>}</label>
      {children}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },

  cols: { display: "grid", gridTemplateColumns: "minmax(240px, 300px) 1fr", gap: 24, alignItems: "start" },
  avatarCard: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "28px 24px", boxShadow: "var(--shadow-low)", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 14 },
  avatar: { width: 108, height: 108, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)" },
  avatarFallback: { width: 108, height: 108, borderRadius: "50%", background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 40 },
  avatarHint: { fontSize: 12, color: "var(--color-ink-muted)", lineHeight: 1.5 },
  choosePhoto: { display: "inline-block", cursor: "pointer", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 600, color: "var(--color-ink-primary)" },

  form: { minWidth: 0 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  label: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  helper: { fontSize: 12, color: "var(--color-ink-muted)", marginTop: 6 },
  radios: { display: "flex", gap: 20, flexWrap: "wrap", paddingTop: 4 },
  radioLabel: { display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "var(--color-ink-primary)", cursor: "pointer" },

  sizesDivider: { display: "flex", alignItems: "center", justifyContent: "center", margin: "22px 0 18px", position: "relative" },
  sizesLabel: { fontSize: 12.5, fontWeight: 700, color: "var(--color-ground-page)", background: "var(--color-ink-primary)", padding: "5px 16px", borderRadius: "var(--radius-pill)" },
  sizesGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 14 },

  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "4px 0 0" },
  saveBtn: { width: "100%", marginTop: 24, background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
