"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useGmail } from "../../lib/useGmail";

const TIMEZONES = [
  { label: "Pacific/Honolulu — Hawaii (UTC−10)",          value: "Pacific/Honolulu" },
  { label: "America/Anchorage — Alaska (UTC−9)",          value: "America/Anchorage" },
  { label: "America/Los_Angeles — Pacific Time (UTC−8)",  value: "America/Los_Angeles" },
  { label: "America/Denver — Mountain Time (UTC−7)",      value: "America/Denver" },
  { label: "America/Chicago — Central Time (UTC−6)",      value: "America/Chicago" },
  { label: "America/New_York — Eastern Time (UTC−5)",     value: "America/New_York" },
  { label: "America/Halifax — Atlantic Time (UTC−4)",     value: "America/Halifax" },
  { label: "America/Sao_Paulo — Brazil (UTC−3)",          value: "America/Sao_Paulo" },
  { label: "UTC — Universal Time (UTC+0)",                value: "UTC" },
  { label: "Europe/London — UK (UTC+0/+1)",               value: "Europe/London" },
  { label: "Europe/Paris — Central Europe (UTC+1/+2)",    value: "Europe/Paris" },
  { label: "Europe/Helsinki — Eastern Europe (UTC+2/+3)", value: "Europe/Helsinki" },
  { label: "Europe/Moscow — Moscow (UTC+3)",              value: "Europe/Moscow" },
  { label: "Asia/Dubai — Gulf (UTC+4)",                   value: "Asia/Dubai" },
  { label: "Asia/Kolkata — India (UTC+5:30)",             value: "Asia/Kolkata" },
  { label: "Asia/Bangkok — Indochina (UTC+7)",            value: "Asia/Bangkok" },
  { label: "Asia/Singapore — Singapore/Perth (UTC+8)",    value: "Asia/Singapore" },
  { label: "Asia/Tokyo — Japan/Korea (UTC+9)",            value: "Asia/Tokyo" },
  { label: "Australia/Brisbane — QLD (UTC+10)",           value: "Australia/Brisbane" },
  { label: "Australia/Sydney — NSW/VIC (UTC+10/+11)",     value: "Australia/Sydney" },
  { label: "Pacific/Auckland — New Zealand (UTC+12/+13)", value: "Pacific/Auckland" },
];

// Left-rail sections. Client-side switch only — no routing.
const SECTIONS = [
  { id: "profile",  label: "Profile" },
  { id: "password", label: "Password" },
  { id: "plan",     label: "Plan & Billing" },
  { id: "gmail",    label: "Gmail" },
  { id: "sending",  label: "Email Sending" },
];

const PLAN_LABELS = {
  spark:    { label: "Spark Plan",    desc: "Basic search and list features." },
  glow:     { label: "Glow Plan",     desc: "More searches, sequences, and direct contacts." },
  radiant:  { label: "Radiant Plan",  desc: "Full access to outreach tools." },
  founding: { label: "Founding Plan", desc: "Founding member — unlimited access." },
};

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail } = useGmail();

  const isGoogleOnly = (user?.app_metadata?.provider === "google");

  const [active, setActive] = useState("profile");

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

  // Timezone
  const [timezone, setTimezone]     = useState("UTC");
  const [origTimezone, setOrigTimezone] = useState("UTC");
  const [savingTz, setSavingTz]     = useState(false);
  const [tzSaved, setTzSaved]       = useState(false);

  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    // Auto-detect browser timezone as a sensible default
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    supabase.from("profiles").select("full_name, daily_email_limit, timezone").eq("id", user.id).single()
      .then(({ data }) => {
        setName(data?.full_name || "");
        setOrigName(data?.full_name || "");
        if (data?.daily_email_limit) setLimit(data.daily_email_limit);
        const tz = data?.timezone || detected;
        setTimezone(tz);
        setOrigTimezone(tz);
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

  // ── Timezone ──
  const saveTz = async () => {
    setSavingTz(true);
    await supabase.from("profiles").update({ timezone }).eq("id", user.id);
    setOrigTimezone(timezone);
    setSavingTz(false);
    setTzSaved(true);
    setTimeout(() => setTzSaved(false), 2500);
  };

  // ── Email limit ──
  const saveLimit = async () => {
    setSavingLimit(true);
    await supabase.from("profiles").update({ daily_email_limit: limit }).eq("id", user.id);
    setSavingLimit(false);
    setLimitSaved(true);
    setTimeout(() => setLimitSaved(false), 2500);
  };

  const plan = profile?.plan || "spark";
  const planInfo = PLAN_LABELS[plan] || PLAN_LABELS.spark;
  const gmailConnected = !!gmailToken;

  const Msg = ({ value }) => {
    if (!value) return null;
    const [kind, ...rest] = value.split(":");
    const text = rest.join(":");
    const ok = kind === "ok";
    return (
      <p style={{ fontSize:12, marginTop:10, lineHeight:1.5, color: ok ? "var(--status-success-ink)" : "var(--color-error)" }}>{text}</p>
    );
  };

  // Google-only accounts can't set a password, so that section is omitted.
  const sections = SECTIONS.filter(sec => sec.id !== "password" || !isGoogleOnly);

  return (
    <div style={s.root}>
      <style>{`
        .dp-rail-item:hover { background: var(--color-ground-sand); }
        .dp-rail-item.active:hover { background: var(--color-action-forest); }
        @media (max-width: 760px) {
          .dp-settings-grid { grid-template-columns: 1fr !important; }
          .dp-settings-rail { flex-direction: row !important; overflow-x: auto; padding-bottom: 4px; }
          .dp-settings-rail .dp-rail-item { white-space: nowrap; }
        }
      `}</style>

      <h2 style={s.heading}>Settings</h2>

      <div className="dp-settings-grid" style={s.grid}>
        {/* Left rail */}
        <nav className="dp-settings-rail" style={s.rail}>
          {sections.map(sec => (
            <button
              key={sec.id}
              className={`dp-rail-item${active === sec.id ? " active" : ""}`}
              style={{ ...s.railItem, ...(active === sec.id ? s.railItemActive : {}) }}
              onClick={() => setActive(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </nav>

        {/* Active panel */}
        <div style={s.card}>

      {/* ── PROFILE ── */}
      {active === "profile" && (
      <div>
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
      )}

      {/* ── PASSWORD ── */}
      {active === "password" && !isGoogleOnly && (
        <div>
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
      {active === "plan" && (
      <div>
        <h3 style={s.sectionTitle}>Plan & Billing</h3>
        <div style={s.planRow}>
          <div>
            <p style={s.planName}>{planInfo.label}</p>
            <p style={s.planDesc}>{planInfo.desc}</p>
          </div>
          <span style={s.planBadge}>{plan.toUpperCase()}</span>
        </div>
        {!["radiant", "founding"].includes(plan) && (
          <a href="mailto:hello@stayfind.app?subject=Upgrade%20my%20plan" style={s.upgradeBtn}>
            Upgrade plan
          </a>
        )}
        <p style={s.hint}>Need a different plan or have a billing question? Contact us and we'll sort it out.</p>
      </div>
      )}

      {/* ── GMAIL CONNECTION ── */}
      {active === "gmail" && (
      <div>
        <h3 style={s.sectionTitle}>Gmail Connection</h3>
        <div style={s.planRow}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ ...s.statusDot, background: gmailConnected ? "var(--status-success-ink)" : "var(--color-ink-muted)" }} />
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
      )}

      {/* ── EMAIL SENDING ── */}
      {active === "sending" && (
      <div>
        <h3 style={s.sectionTitle}>Email Sending</h3>

        <div style={s.field}>
          <label style={s.label}>Your timezone</label>
          <p style={s.hint} >Dapples sends emails between 8am and 6pm in your local time.</p>
          <div style={{ ...s.inlineRow, marginTop:8 }}>
            <select
              style={{ ...s.input, cursor:"pointer" }}
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              disabled={loading}
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
            <button
              style={{ ...s.saveBtn, opacity: (savingTz || timezone === origTimezone) ? 0.5 : 1 }}
              onClick={saveTz}
              disabled={savingTz || timezone === origTimezone}
            >
              {savingTz ? "Saving…" : tzSaved ? "Saved ✓" : "Save"}
            </button>
          </div>
        </div>

        <div style={s.field}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <label style={s.label}>Daily email limit</label>
            <span style={{ ...s.limitBadge, background: limit > 30 ? "var(--color-amber-tint)" : "var(--color-ground-sand)", color: limit > 30 ? "var(--color-accent-amber-deeper)" : "var(--color-ink-mid)" }}>
              {limit} / day
            </span>
          </div>
          <input type="range" min={5} max={50} step={1} value={limit} onChange={e => setLimit(Number(e.target.value))} disabled={loading} style={s.slider} />
          <div style={s.sliderTicks}><span>5</span><span>25</span><span>50</span></div>
          {limit > 30 && (
            <div style={s.warnBox}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-amber-deeper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p style={{ fontSize:12, color:"var(--color-accent-amber-deeper)", lineHeight:1.6 }}>
                Sending more than 30 emails per day increases the risk of Gmail flagging your account as spam. We recommend staying at or below 30.
              </p>
            </div>
          )}
          <p style={s.hint}>Dapples spaces your emails randomly throughout the day with 30–90 minute gaps. This limit applies across all active sequences combined.</p>
        </div>
        <button onClick={saveLimit} disabled={savingLimit || loading} style={{ ...s.saveBtn, opacity: savingLimit || loading ? 0.6 : 1 }}>
          {savingLimit ? "Saving…" : limitSaved ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
      )}

        </div>
      </div>
    </div>
  );
}

const s = {
  root: { padding:"32px 36px 40px", maxWidth:1160, margin:"0 auto" },
  heading: { fontFamily:"var(--font-display)", fontSize:22, fontWeight:700, color:"var(--color-ink-primary)", letterSpacing:"-0.01em", marginBottom:22 },

  grid: { display:"grid", gridTemplateColumns:"200px 1fr", gap:24, alignItems:"start" },
  rail: { display:"flex", flexDirection:"column", gap:2 },
  railItem: { padding:"10px 14px", borderRadius:"var(--radius-md)", fontSize:13, fontWeight:600, color:"var(--color-ink-mid)", background:"none", border:"none", textAlign:"left", cursor:"pointer", fontFamily:"inherit", transition:"background 0.15s, color 0.15s" },
  railItemActive: { background:"var(--color-action-forest)", color:"var(--color-ground-page)", fontWeight:700 },
  card: { background:"var(--color-ground-card)", borderRadius:"var(--radius-card)", border:"1px solid var(--color-border)", boxShadow:"var(--shadow-low)", padding:26 },

  sectionTitle: { fontFamily:"var(--font-display)", fontSize:17, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:20 },
  field: { marginBottom:18 },
  label: { display:"block", fontSize:13, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:7 },
  input: { flex:1, width:"100%", padding:"10px 13px", border:"1px solid var(--color-border)", borderRadius:9, fontSize:14, color:"var(--color-ink-primary)", background:"var(--color-ground-card)" },
  inlineRow: { display:"flex", gap:10, alignItems:"center" },
  saveBtn: { padding:"10px 18px", background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", transition:"opacity 0.15s" },
  secondaryBtn: { padding:"10px 18px", background:"var(--color-ground-card)", color:"var(--color-ink-mid)", border:"1px solid var(--color-border)", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  hint: { fontSize:12, color:"var(--color-ink-muted)", lineHeight:1.6, marginTop:10 },

  planRow: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 },
  planName: { fontSize:14, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:3 },
  planDesc: { fontSize:12, color:"var(--color-ink-muted)", lineHeight:1.5 },
  planBadge: { fontSize:11, fontWeight:700, background:"var(--color-ground-sand)", color:"var(--color-ink-mid)", padding:"4px 11px", borderRadius:20, letterSpacing:"0.4px", flexShrink:0 },
  upgradeBtn: { display:"inline-block", marginTop:18, padding:"10px 20px", background:"var(--color-ink-primary)", color:"var(--color-ground-page)", borderRadius:9, fontSize:13, fontWeight:600, textDecoration:"none" },
  statusDot: { width:10, height:10, borderRadius:"50%", flexShrink:0 },

  limitBadge: { fontSize:13, fontWeight:700, padding:"3px 10px", borderRadius:20 },
  slider: { width:"100%", accentColor:"var(--color-accent-terracotta)", cursor:"pointer", marginTop:4 },
  sliderTicks: { display:"flex", justifyContent:"space-between", fontSize:11, color:"var(--color-ink-muted)", marginTop:4, paddingInline:2 },
  warnBox: { display:"flex", alignItems:"flex-start", gap:8, background:"var(--color-amber-tint)", border:"1px solid var(--color-glow-1)", borderRadius:10, padding:"10px 12px", marginTop:12 },
};
