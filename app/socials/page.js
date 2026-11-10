"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AccountTabs from "../../components/AccountTabs";

const PLATFORMS = [
  { key: "instagram", name: "Instagram", svg: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></> },
  { key: "tiktok",    name: "TikTok",    svg: <path d="M9 12a4 4 0 1 0 4 4V4c.5 2 2 3.5 4 4" /> },
  { key: "youtube",   name: "YouTube",   svg: <><rect x="2" y="5" width="20" height="14" rx="4" /><polygon points="10 9 15 12 10 15" fill="currentColor" stroke="none" /></> },
  { key: "facebook",  name: "Facebook",  svg: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /> },
  { key: "x",         name: "X",         svg: <path d="M4 4l16 16M20 4L4 20" /> },
  { key: "linkedin",  name: "LinkedIn",  svg: <><rect x="2" y="2" width="20" height="20" rx="3" /><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4M11 10v7" /></> },
];

export default function SocialsPage() {
  const { user } = useAuth();
  const [socials, setSocials] = useState({});
  const [editing, setEditing] = useState(null);     // platform key being edited
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("socials").eq("id", user.id).maybeSingle();
      if (!active) return;
      setSocials(data?.socials || {});
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const startEdit = (key) => { setEditing(key); setDraft(socials[key] || ""); };

  const persist = async (next) => {
    const { error } = await supabase.from("profiles").update({ socials: next }).eq("id", user.id);
    if (!error) setSocials(next);
    return error;
  };

  const saveHandle = async (key) => {
    setSavingKey(key);
    const next = { ...socials, [key]: draft.trim() };
    if (!next[key]) delete next[key];
    await persist(next);
    setSavingKey(null); setEditing(null);
  };

  const disconnect = async (key) => {
    const next = { ...socials }; delete next[key];
    setSavingKey(key); await persist(next); setSavingKey(null);
  };

  return (
    <div style={s.wrap}>
      <AccountTabs />
      <div style={s.card}>
        <p style={s.intro}>Connect your accounts to show your socials on your profile and applications. Paste your handle or profile link for each platform.</p>
        <div style={s.banner}>ℹ️ Full stats sync (follower counts, engagement) is coming — for now this links your profiles.</div>

        {loading ? <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div> : (
          <div>
            {PLATFORMS.map(p => {
              const connected = !!socials[p.key];
              const isEditing = editing === p.key;
              return (
                <div key={p.key} style={s.row}>
                  <div style={s.rowLeft}>
                    <span style={s.pIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{p.svg}</svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={s.pName}>{p.name}</div>
                      {connected && !isEditing && <div style={s.pHandle}>{socials[p.key]}</div>}
                    </div>
                  </div>

                  {isEditing ? (
                    <div style={s.editRow}>
                      <input style={s.editInput} placeholder={`@handle or link`} value={draft} autoFocus
                        onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && saveHandle(p.key)} />
                      <button style={s.saveBtn} onClick={() => saveHandle(p.key)} disabled={savingKey === p.key}>{savingKey === p.key ? "…" : "Save"}</button>
                      <button style={s.ghost} onClick={() => setEditing(null)}>Cancel</button>
                    </div>
                  ) : connected ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={s.ghost} onClick={() => startEdit(p.key)}>Edit</button>
                      <button style={s.removeBtn} onClick={() => disconnect(p.key)} disabled={savingKey === p.key}>Remove</button>
                    </div>
                  ) : (
                    <button style={s.connect} onClick={() => startEdit(p.key)}>Connect</button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "30px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "26px 28px", boxShadow: "var(--shadow-low)", maxWidth: 820, margin: "0 auto" },
  intro: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.55, marginBottom: 14 },
  banner: { background: "rgba(139,154,106,0.14)", color: "var(--color-ink-mid)", borderRadius: "var(--radius-md)", padding: "10px 14px", fontSize: 13, marginBottom: 20 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 0", borderBottom: "1px solid var(--color-border)", flexWrap: "wrap" },
  rowLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },
  pIcon: { color: "var(--color-ink-primary)", display: "flex" },
  pName: { fontSize: 14.5, fontWeight: 600, color: "var(--color-ink-primary)" },
  pHandle: { fontSize: 12.5, color: "var(--color-ink-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  connect: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 22px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  editRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  editInput: { border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "9px 12px", fontSize: 13.5, fontFamily: "inherit", outline: "none", minWidth: 180, color: "var(--color-ink-primary)", background: "var(--color-ground-card)" },
  saveBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  ghost: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  removeBtn: { background: "transparent", color: "var(--color-error)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
