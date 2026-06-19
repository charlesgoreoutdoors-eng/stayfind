"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function SettingsPage() {
  const { user } = useAuth();
  const [limit, setLimit]     = useState(30);
  const [saved, setSaved]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("daily_email_limit").eq("id", user.id).single()
      .then(({ data }) => {
        if (data?.daily_email_limit) setLimit(data.daily_email_limit);
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ daily_email_limit: limit }).eq("id", user.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Settings</h2>

      <div style={s.section}>
        <h3 style={s.sectionTitle}>Email Sending</h3>

        <div style={s.field}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <label style={s.label}>Daily email limit</label>
            <span style={{ ...s.limitBadge, background: limit > 30 ? "#fffbeb" : "#F0EBE5", color: limit > 30 ? "#92400e" : "#4A6A8A" }}>
              {limit} / day
            </span>
          </div>

          <input
            type="range"
            min={5}
            max={50}
            step={1}
            value={limit}
            onChange={e => setLimit(Number(e.target.value))}
            disabled={loading}
            style={s.slider}
          />

          <div style={s.sliderTicks}>
            <span>5</span>
            <span>25</span>
            <span>50</span>
          </div>

          {limit > 30 && (
            <div style={s.warnBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p style={{ fontSize:12, color:"#92400e", lineHeight:1.6 }}>
                Sending more than 30 emails per day increases the risk of Gmail flagging your account as spam. We recommend staying at or below 30.
              </p>
            </div>
          )}

          <p style={s.hint}>
            StayFind spaces your emails randomly throughout the day with 30–90 minute gaps. This limit applies across all active sequences combined.
          </p>
        </div>

        <button
          onClick={save}
          disabled={saving || loading}
          style={{ ...s.saveBtn, opacity: saving || loading ? 0.6 : 1 }}
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

const s = {
  root: { padding:"32px 24px 80px", maxWidth:560 },
  heading: { fontSize:22, fontWeight:700, color:"#0F2544", letterSpacing:"-0.4px", marginBottom:28 },
  section: { background:"#fff", borderRadius:16, border:"1px solid #DDD5CC", padding:"24px 24px 20px" },
  sectionTitle: { fontSize:14, fontWeight:700, color:"#0F2544", marginBottom:20 },
  field: { marginBottom:20 },
  label: { fontSize:13, fontWeight:600, color:"#1E3A5F" },
  limitBadge: { fontSize:13, fontWeight:700, padding:"3px 10px", borderRadius:20 },
  slider: { width:"100%", accentColor:"#E85D3D", cursor:"pointer", marginTop:4 },
  sliderTicks: { display:"flex", justifyContent:"space-between", fontSize:11, color:"#9FB3C8", marginTop:4, paddingInline:2 },
  warnBox: { display:"flex", alignItems:"flex-start", gap:8, background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"10px 12px", marginTop:12 },
  hint: { fontSize:12, color:"#9FB3C8", lineHeight:1.6, marginTop:12 },
  saveBtn: { padding:"11px 24px", background:"#E85D3D", color:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"opacity 0.15s" },
};
