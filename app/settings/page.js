"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useGmail } from "../../lib/useGmail";

const PLAN_LABELS = {
  free:    { label: "Free Plan",    desc: "Basic search and list features." },
  starter: { label: "Starter Plan", desc: "More searches and sequences." },
  pro:     { label: "Pro Plan",     desc: "Full access to outreach tools." },
  agency:  { label: "Agency Plan",  desc: "Unlimited usage for teams." },
};

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail } = useGmail();

  const isGoogleOnly = (user?.app_metadata?.provider === "google");

  // Profile
  const [name, setName]           = useState("");
  const [origName, setOrigName]   = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Email
  const [email, setEmail]         = useState("");
  const [emailMsg, setEmailMsg]   = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // Password
  const [pw1, setPw1]             = useState("");
  const [pw2, setPw2]             = useState("");
  const [pwMsg, setPwMsg]         = useState("");
  const [savingPw, setSavingPw]   = useState(false);

  // Email limit
  const [limit, setLimit]         = useState(30);
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitSaved, setLimitSaved] = useState(false);

  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    supabase.from("profiles").select("full_name, daily_email_limit").eq("id", user.id).single()
      .then(({ data }) => {
        setName(data?.full_name || "");
        setOrigName(data?.full_name || "");
        if (data?.daily_email_limit) setLimit(data.daily_email_limit);
        setLoading(false);
      });
  }, [user]);

  // ── Profile name ──
  const saveName = async () => {
    setSavingName(true);
    await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", user.id);
    setOrigName(name.trim());
    setSavingName(false);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2500);
  };

  // ── Email ──
  const saveEmail = async () => {
    setEmailMsg("");
    if (!email.trim() || email.trim() === user.email) return;
    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setSavingEmail(false);
    if (error) setEmailMsg("err:" + error.message);
    else setEmailMsg("ok:Confirmation sent — check both your old and new inbox to confirm the change.");
  };

  // ── Password ──
  const savePassword = async () => {
    setPwMsg("");
    if (pw1.length < 6) { setPwMsg("err:Password must be at least 6 characters."); return; }
    if (pw1 !== pw2)    { setPwMsg("err:Passwords do not match."); return; }
    setSavingPw(true);
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setSavingPw(false);
    if (error) setPwMsg("err:" + error.message);
    else { setPwMsg("ok:Password updated."); setPw1(""); setPw2(""); }
  };

  // ── Email limit ──
  const saveLimit = async () => {
    setSavingLimit(true);
    await supabase.from("profiles").update({ daily_email_limit: limit }).eq("id", user.id);
    setSavingLimit(false);
    setLimitSaved(true);
    setTimeout(() => setLimitSaved(false), 2500);
  };

  const plan = profile?.plan || "free";
  const planInfo = PLAN_LABELS[plan] || PLAN_LABELS.free;
  const gmailConnected = !!gmailToken;

  const Msg = ({ value }) => {
    if (!value) return null;
    const [kind, ...rest] = value.split(":");
    const text = rest.join(":");
    const ok = kind === "ok";
    return (
      <p style={{ fontSize:12, marginTop:10, lineHeight:1.5, color: ok ? "#16a34a" : "#b91c1c" }}>{text}</p>
    );
  };

  return (
    <div style={s.root}>
      <h2 style={s.heading}>Settings</h2>

      {/* ── PROFILE ── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Profile</h3>

        <div style={s.field}>
          <label style={s.label}>Full name</label>
          <div style={s.inlineRow}>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" disabled={loading} />
            <button
              style={{ ...s.saveBtn, opacity: (savingName || name.trim() === origName) ? 0.5 : 1 }}
              onClick={saveName}
              disabled={savingName || name.trim() === origName}
            >
              {savingName ? "Saving…" : nameSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>

        <div style={{ ...s.field, marginBottom:0 }}>
          <label style={s.label}>Email address</label>
          <div style={s.inlineRow}>
            <input style={s.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" disabled={loading || isGoogleOnly} />
            <button
              style={{ ...s.saveBtn, opacity: (savingEmail || isGoogleOnly || email.trim() === user?.email) ? 0.5 : 1 }}
              onClick={saveEmail}
              disabled={savingEmail || isGoogleOnly || email.trim() === user?.email}
            >
              {savingEmail ? "Sending…" : "Update"}
            </button>
          </div>
          {isGoogleOnly && <p style={s.hint}>You signed in with Google, so your email is managed by your Google account.</p>}
          <Msg value={emailMsg} />
        </div>
      </div>

      {/* ── PASSWORD ── */}
      {!isGoogleOnly && (
        <div style={s.section}>
          <h3 style={s.sectionTitle}>Change Password</h3>
          <div style={s.field}>
            <label style={s.label}>New password</label>
            <input style={s.input} type="password" value={pw1} onChange={e => setPw1(e.target.value)} placeholder="At least 6 characters" autoComplete="new-password" />
          </div>
          <div style={{ ...s.field, marginBottom:0 }}>
            <label style={s.label}>Confirm new password</label>
            <div style={s.inlineRow}>
              <input style={s.input} type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Re-enter password" autoComplete="new-password" />
              <button
                style={{ ...s.saveBtn, opacity: (savingPw || !pw1 || !pw2) ? 0.5 : 1 }}
                onClick={savePassword}
                disabled={savingPw || !pw1 || !pw2}
              >
                {savingPw ? "Saving…" : "Update"}
              </button>
            </div>
            <Msg value={pwMsg} />
          </div>
        </div>
      )}

      {/* ── PLAN & BILLING ── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Plan & Billing</h3>
        <div style={s.planRow}>
          <div>
            <p style={s.planName}>{planInfo.label}</p>
            <p style={s.planDesc}>{planInfo.desc}</p>
          </div>
          <span style={s.planBadge}>{plan.toUpperCase()}</span>
        </div>
        {plan !== "agency" && (
          <a href="mailto:hello@stayfind.app?subject=Upgrade%20my%20plan" style={s.upgradeBtn}>
            Upgrade plan
          </a>
        )}
        <p style={s.hint}>Need a different plan or have a billing question? Contact us and we'll sort it out.</p>
      </div>

      {/* ── GMAIL CONNECTION ── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Gmail Connection</h3>
        <div style={s.planRow}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ ...s.statusDot, background: gmailConnected ? "#16a34a" : "#9FB3C8" }} />
            <div>
              <p style={s.planName}>{gmailConnected ? "Connected" : "Not connected"}</p>
              <p style={s.planDesc}>
                {gmailConnected
                  ? (gmailEmail || "Your Gmail account is linked for sending sequences.")
                  : tokenExpired ? "Your session expired — reconnect to keep sending."
                  : "Connect Gmail to send email sequences."}
              </p>
            </div>
          </div>
          {gmailConnected ? (
            <button style={s.secondaryBtn} onClick={disconnectGmail}>Disconnect</button>
          ) : (
            <button style={{ ...s.saveBtn, opacity: gmailLoading ? 0.6 : 1 }} onClick={connectGmail} disabled={gmailLoading}>
              {gmailLoading ? "Connecting…" : "Connect Gmail"}
            </button>
          )}
        </div>
      </div>

      {/* ── EMAIL SENDING ── */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>Email Sending</h3>
        <div style={s.field}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <label style={s.label}>Daily email limit</label>
            <span style={{ ...s.limitBadge, background: limit > 30 ? "#fffbeb" : "#F0EBE5", color: limit > 30 ? "#92400e" : "#4A6A8A" }}>
              {limit} / day
            </span>
          </div>
          <input type="range" min={5} max={50} step={1} value={limit} onChange={e => setLimit(Number(e.target.value))} disabled={loading} style={s.slider} />
          <div style={s.sliderTicks}><span>5</span><span>25</span><span>50</span></div>
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
          <p style={s.hint}>StayFind spaces your emails randomly throughout the day with 30–90 minute gaps. This limit applies across all active sequences combined.</p>
        </div>
        <button onClick={saveLimit} disabled={savingLimit || loading} style={{ ...s.saveBtn, opacity: savingLimit || loading ? 0.6 : 1 }}>
          {savingLimit ? "Saving…" : limitSaved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

const s = {
  root: { padding:"32px 24px 80px", maxWidth:580 },
  heading: { fontSize:22, fontWeight:700, color:"#0F2544", letterSpacing:"-0.4px", marginBottom:28 },
  section: { background:"#fff", borderRadius:16, border:"1px solid #DDD5CC", padding:"24px 24px 22px", marginBottom:20 },
  sectionTitle: { fontSize:14, fontWeight:700, color:"#0F2544", marginBottom:20 },
  field: { marginBottom:18 },
  label: { display:"block", fontSize:13, fontWeight:600, color:"#1E3A5F", marginBottom:7 },
  input: { flex:1, width:"100%", padding:"10px 13px", border:"1px solid #DDD5CC", borderRadius:9, fontSize:14, color:"#1E3A5F", background:"#fff" },
  inlineRow: { display:"flex", gap:10, alignItems:"center" },
  saveBtn: { padding:"10px 18px", background:"#E85D3D", color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"opacity 0.15s" },
  secondaryBtn: { padding:"10px 18px", background:"#fff", color:"#4A6A8A", border:"1px solid #DDD5CC", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  hint: { fontSize:12, color:"#9FB3C8", lineHeight:1.6, marginTop:10 },

  planRow: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 },
  planName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:3 },
  planDesc: { fontSize:12, color:"#9FB3C8", lineHeight:1.5 },
  planBadge: { fontSize:11, fontWeight:700, background:"#F0EBE5", color:"#4A6A8A", padding:"4px 11px", borderRadius:20, letterSpacing:"0.4px", flexShrink:0 },
  upgradeBtn: { display:"inline-block", marginTop:18, padding:"10px 20px", background:"#0F2544", color:"#F7F3EF", borderRadius:9, fontSize:13, fontWeight:600, textDecoration:"none" },
  statusDot: { width:10, height:10, borderRadius:"50%", flexShrink:0 },

  limitBadge: { fontSize:13, fontWeight:700, padding:"3px 10px", borderRadius:20 },
  slider: { width:"100%", accentColor:"#E85D3D", cursor:"pointer", marginTop:4 },
  sliderTicks: { display:"flex", justifyContent:"space-between", fontSize:11, color:"#9FB3C8", marginTop:4, paddingInline:2 },
  warnBox: { display:"flex", alignItems:"flex-start", gap:8, background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"10px 12px", marginTop:12 },
};
