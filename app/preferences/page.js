"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { readDraft, writeDraft, clearDraft } from "../../lib/draft";
import AccountTabs from "../../components/AccountTabs";

const CATEGORIES = ["Travel", "Luxury Travel", "Adventure & Outdoor", "Family Travel", "Food & Drink", "Wellness & Spa", "Couples / Honeymoon", "Budget / Backpacking", "City / Urban", "Beach / Coastal", "Road Trips / Vanlife", "Photography", "Lifestyle", "Nature & Wildlife"];
const SERVICES = ["UGC", "Videography / Video Editing", "Photography / Photo Editing", "Reels / Short-form", "Blogging", "Stories / Live"];
const CREATOR_TYPES = ["Photographer", "Videographer", "Blogger", "Influencer", "Vlogger", "UGC Creator"];
const EXPERIENCE = ["Beginner", "Intermediate", "Advanced", "Professional"];
const AUDIENCE = ["Families", "Couples", "Solo travellers", "Adventure seekers", "Luxury travellers", "Budget travellers", "Digital nomads", "Groups / Friends"];

export default function PreferencesPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ content_categories: [], services: [], creator_type: "", experience_level: "", audience: "", favorite_brands: [], open_to_gifting: null, discoverable: true });
  const [brandInput, setBrandInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const draftKey = user ? `dapples_preferences_draft_${user.id}` : null;
  const hydrated = useRef(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("content_categories, services, creator_type, experience_level, audience, favorite_brands, open_to_gifting, discoverable").eq("id", user.id).maybeSingle();
      if (!active) return;
      const base = data ? {
        content_categories: data.content_categories || [], services: data.services || [],
        creator_type: data.creator_type || "", experience_level: data.experience_level || "", audience: data.audience || "",
        favorite_brands: data.favorite_brands || [], open_to_gifting: data.open_to_gifting,
        discoverable: data.discoverable !== false,
      } : null;
      const draft = readDraft(`dapples_preferences_draft_${user.id}`);
      if (base || draft) setForm(f => ({ ...f, ...(base || {}), ...(draft || {}) }));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  // Keep unsaved edits in the browser so the fields remember them on return.
  useEffect(() => {
    if (loading) return;
    if (!hydrated.current) { hydrated.current = true; return; }
    writeDraft(draftKey, form);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, loading]);

  const toggle = (key, val) => { setForm(f => ({ ...f, [key]: f[key].includes(val) ? f[key].filter(v => v !== val) : [...f[key], val] })); setSaved(false); };
  const set = (key, val) => { setForm(f => ({ ...f, [key]: val })); setSaved(false); };
  const addBrand = () => { const b = brandInput.trim(); if (b && !form.favorite_brands.includes(b)) { set("favorite_brands", [...form.favorite_brands, b]); } setBrandInput(""); };

  const save = async () => {
    setSaving(true); setError("");
    const payload = {
      content_categories: form.content_categories, services: form.services,
      creator_type: form.creator_type || null, experience_level: form.experience_level || null, audience: form.audience || null,
      favorite_brands: form.favorite_brands,
      open_to_gifting: form.open_to_gifting,
      discoverable: form.discoverable !== false,
    };
    const { error: err } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (err) setError(err.message); else { setSaved(true); clearDraft(draftKey); }
  };

  return (
    <div style={s.wrap}>
      <AccountTabs />
      {loading ? <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div> : (
        <>
          <div style={s.sectionHead}>
            <h2 style={s.h2}>Categories</h2>
            <button style={s.saveTop} onClick={save} disabled={saving}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save"}</button>
          </div>

          <Field label="What categories best describe your content?">
            <Chips options={CATEGORIES} selected={form.content_categories} onToggle={v => toggle("content_categories", v)} />
          </Field>
          <Field label="What services do you offer?">
            <Chips options={SERVICES} selected={form.services} onToggle={v => toggle("services", v)} />
          </Field>
          <div style={s.row2}>
            <Field label="What type of content creator are you?">
              <Select value={form.creator_type} onChange={v => set("creator_type", v)} options={CREATOR_TYPES} placeholder="Select…" />
            </Field>
            <Field label="What's your experience level?">
              <Select value={form.experience_level} onChange={v => set("experience_level", v)} options={EXPERIENCE} placeholder="Select level…" />
            </Field>
          </div>
          <Field label="Who do you create content for?">
            <Select value={form.audience} onChange={v => set("audience", v)} options={AUDIENCE} placeholder="Select audience…" />
          </Field>
          <Field label="Favourite brands & hotels">
            <div style={s.tagWrap}>
              {form.favorite_brands.map(b => (
                <span key={b} style={s.tag}>{b}<button style={s.tagX} onClick={() => set("favorite_brands", form.favorite_brands.filter(x => x !== b))}>×</button></span>
              ))}
              <input style={s.tagInput} placeholder="Type a brand and press Enter" value={brandInput}
                onChange={e => setBrandInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addBrand())} />
            </div>
          </Field>

          <div style={s.divider}><span style={s.dividerLabel}>Availability</span></div>

          <Field label="Free stays" hint="Are you open to creating content in exchange for a free stay?">
            <YesNo value={form.open_to_gifting} onChange={v => set("open_to_gifting", v)} />
          </Field>

          <div style={s.divider}><span style={s.dividerLabel}>Visibility</span></div>

          <Field label="Discoverable to hotels" hint="Let hotels find your profile in creator search. Turn this off to hide from search — hotels you’ve already applied to can still see you.">
            <YesNo value={form.discoverable} onChange={v => set("discoverable", v)} />
          </Field>

          {error && <p style={s.error}>{error}</p>}
          <button style={s.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save"}</button>
        </>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={s.label}>{label}</label>
      {hint && <p style={s.hint}>{hint}</p>}
      {children}
    </div>
  );
}
function Chips({ options, selected, onToggle }) {
  return (
    <div style={s.chips}>
      {options.map(o => {
        const on = selected.includes(o);
        return <button key={o} style={{ ...s.chip, ...(on ? s.chipOn : {}) }} onClick={() => onToggle(o)}>{o}</button>;
      })}
    </div>
  );
}
function Select({ value, onChange, options, placeholder }) {
  return (
    <select style={s.input} value={value} onChange={e => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function YesNo({ value, onChange }) {
  return (
    <div style={{ display: "flex", gap: 22, paddingTop: 4 }}>
      {[["Yes", true], ["No", false]].map(([lbl, v]) => (
        <label key={lbl} style={s.radioLabel}>
          <input type="radio" checked={value === v} onChange={() => onChange(v)} style={{ accentColor: "var(--color-action-forest)" }} />
          <span>{lbl}</span>
        </label>
      ))}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  h2: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)" },
  saveTop: { background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "8px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  label: { display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 6 },
  hint: { fontSize: 12.5, color: "var(--color-ink-muted)", marginBottom: 8, lineHeight: 1.5 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  chips: { display: "flex", flexWrap: "wrap", gap: 8 },
  chip: { border: "1.5px solid var(--color-border)", background: "var(--color-ground-card)", color: "var(--color-ink-mid)", borderRadius: "var(--radius-pill)", padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  chipOn: { background: "var(--status-success-bg)", color: "var(--status-success-ink)", borderColor: "transparent" },
  tagWrap: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "8px 10px", background: "var(--color-ground-card)" },
  tag: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--status-success-bg)", color: "var(--status-success-ink)", borderRadius: "var(--radius-pill)", padding: "4px 10px", fontSize: 13, fontWeight: 600 },
  tagX: { background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 15, lineHeight: 1, padding: 0 },
  tagInput: { flex: 1, minWidth: 160, border: "none", outline: "none", fontSize: 14, fontFamily: "inherit", background: "transparent", color: "var(--color-ink-primary)" },
  divider: { display: "flex", alignItems: "center", justifyContent: "center", margin: "28px 0 20px", borderTop: "1px solid var(--color-border)" },
  dividerLabel: { fontSize: 12.5, fontWeight: 700, color: "var(--color-ground-page)", background: "var(--color-ink-primary)", padding: "5px 16px", borderRadius: "var(--radius-pill)", marginTop: -14 },
  rateWrap: { display: "flex", alignItems: "center", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", background: "var(--color-ground-card)", maxWidth: 220, padding: "0 12px" },
  ratePrefix: { color: "var(--color-ink-muted)", fontSize: 14 },
  rateInput: { flex: 1, border: "none", outline: "none", padding: "11px 8px", fontSize: 14, fontFamily: "inherit", background: "transparent", color: "var(--color-ink-primary)" },
  radioLabel: { display: "flex", alignItems: "center", gap: 7, fontSize: 14, color: "var(--color-ink-primary)", cursor: "pointer" },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "4px 0 0" },
  saveBtn: { width: "100%", marginTop: 24, background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "15px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
