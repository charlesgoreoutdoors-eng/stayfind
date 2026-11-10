"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { sanitizeText } from "../../lib/marketplace";
import AccountTabs from "../../components/AccountTabs";

const COUNTRIES = ["Australia", "United States", "United Kingdom", "Canada", "New Zealand", "Ireland", "France", "Germany", "Italy", "Spain", "Portugal", "Netherlands", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Greece", "Mexico", "Brazil", "Argentina", "Japan", "Thailand", "Indonesia", "Singapore", "United Arab Emirates", "South Africa", "India", "Other"];
const FIELDS = ["street1", "street2", "city", "state", "postal_code"];

export default function AddressPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ street1: "", street2: "", city: "", state: "", postal_code: "", country: "", show_on_map: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("street1, street2, city, state, postal_code, country, show_on_map").eq("id", user.id).maybeSingle();
      if (!active) return;
      if (data) setForm({
        street1: data.street1 || "", street2: data.street2 || "", city: data.city || "", state: data.state || "",
        postal_code: data.postal_code || "", country: data.country || "", show_on_map: data.show_on_map !== false,
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true); setError("");
    const clean = (v) => { const t = sanitizeText(v); return t && t.trim() ? t.trim() : null; };
    const payload = { country: form.country || null, show_on_map: form.show_on_map };
    FIELDS.forEach(k => { payload[k] = clean(form[k]); });
    const { error: err } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (err) setError(err.message); else setSaved(true);
  };

  return (
    <div style={s.wrap}>
      <AccountTabs />
      {loading ? <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div> : (
        <div style={s.card}>
          <Field label="Street 1"><input style={s.input} value={form.street1} onChange={e => set("street1", e.target.value)} /></Field>
          <Field label="Street 2"><input style={s.input} value={form.street2} onChange={e => set("street2", e.target.value)} /></Field>
          <Field label="City"><input style={s.input} value={form.city} onChange={e => set("city", e.target.value)} /></Field>
          <Field label="State"><input style={s.input} value={form.state} onChange={e => set("state", e.target.value)} /></Field>
          <Field label="Postal code"><input style={s.input} value={form.postal_code} onChange={e => set("postal_code", e.target.value)} /></Field>
          <Field label="Country">
            <select style={s.input} value={form.country} onChange={e => set("country", e.target.value)}>
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>

          <div style={s.privacy}>
            <h3 style={s.privacyTitle}>Location privacy</h3>
            <p style={s.privacyText}>Control whether hotels can see your location when searching on the map. Your exact address stays private and anonymised — hotels only see your general area, not your exact address.</p>
            <label style={s.radioLabel}>
              <input type="radio" checked={form.show_on_map} onChange={() => set("show_on_map", true)} style={{ accentColor: "var(--color-action-forest)" }} />
              <span>Include me on the map (Recommended)</span>
            </label>
            <label style={s.radioLabel}>
              <input type="radio" checked={!form.show_on_map} onChange={() => set("show_on_map", false)} style={{ accentColor: "var(--color-action-forest)" }} />
              <span>Hide me from the map</span>
            </label>
          </div>

          {error && <p style={s.error}>{error}</p>}
          <button style={s.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save"}</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div style={{ marginBottom: 16 }}><label style={s.label}>{label}</label>{children}</div>;
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "30px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "28px 30px", boxShadow: "var(--shadow-low)", maxWidth: 820, margin: "0 auto" },
  label: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 6 },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  privacy: { marginTop: 10, borderTop: "1px solid var(--color-border)", paddingTop: 20 },
  privacyTitle: { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 6 },
  privacyText: { fontSize: 13, color: "var(--color-ink-muted)", lineHeight: 1.55, marginBottom: 14, maxWidth: "64ch" },
  radioLabel: { display: "flex", alignItems: "center", gap: 9, fontSize: 14, color: "var(--color-ink-primary)", cursor: "pointer", marginBottom: 10 },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "4px 0 0" },
  saveBtn: { width: "100%", marginTop: 20, background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
