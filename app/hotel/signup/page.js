"use client";
import { useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

function Wordmark() {
  return (
    <span style={{ position:"relative", display:"inline-block", fontFamily:"var(--font-display)", fontWeight:600, fontSize:26, letterSpacing:"-0.01em", color:"var(--color-ink-primary)", lineHeight:1 }}>
      <span style={{ position:"absolute", top:"-0.24em", left:"4%", width:"0.30em", height:"0.30em", borderRadius:"50%", background:"var(--color-glow-1)", opacity:0.8, filter:"blur(2px)" }} />
      <span style={{ position:"absolute", top:"0.30em", left:"60%", width:"0.18em", height:"0.18em", borderRadius:"50%", background:"var(--color-cool-olive)", opacity:0.75, filter:"blur(1.5px)" }} />
      <span style={{ position:"relative" }}>Dapples</span>
    </span>
  );
}

export default function HotelSignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");
    // role: 'hotel' is read by the handle_new_user() trigger (migration 0003)
    // to tag this account as a hotel.
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim(), role: "hotel" } },
    });
    if (error) setError(error.message);
    else {
      setSuccess("Account created! We've sent a confirmation email to " + email.trim() + ". Click the link, then sign in to set up your hotel profile.");
      setName(""); setEmail(""); setPassword("");
    }
    setLoading(false);
  };

  const canSubmit = name.trim() && email.trim() && password.trim() && !loading;

  return (
    <div style={s.root}>
      <style>{`
        .dp-in:focus { border-color: var(--color-action-forest) !important; }
        .dp-primary { transition: background .15s ease; }
        .dp-primary:hover:not(:disabled) { background: var(--color-action-forest-hover) !important; }
      `}</style>

      <span style={{ ...orb, top:-60, left:"12%", width:260, height:260, background:"var(--color-glow-1)", opacity:0.4, filter:"blur(70px)" }} />
      <span style={{ ...orb, bottom:-60, right:"10%", width:240, height:240, background:"var(--color-glow-3)", opacity:0.3, filter:"blur(65px)" }} />

      <div style={s.card}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <Wordmark />
          <div style={s.badge}>For hotels</div>
          <div style={s.title}>List your hotel on Dapples</div>
          <div style={s.sub}>Create a hotel account to post collab opportunities and reach travel creators.</div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}
        {success && <div style={s.successBox}>{success}</div>}

        <div style={s.field}>
          <label style={s.label}>Hotel / contact name</label>
          <input className="dp-in" style={s.input} placeholder="The Dapple House" value={name} onChange={e => setName(e.target.value)} autoComplete="organization" />
        </div>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input className="dp-in" style={s.input} type="email" placeholder="you@hotel.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input className="dp-in" style={s.input} type="password" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()} autoComplete="new-password" />
        </div>

        <button className="dp-primary" style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "default" }} onClick={handleSubmit} disabled={!canSubmit}>
          {loading ? "Creating account…" : "Create hotel account"}
        </button>

        <p style={s.switchText}>
          Already have a hotel account? <Link href="/login" style={s.switchBtn}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

const orb = { position:"absolute", borderRadius:"50%", pointerEvents:"none" };

const s = {
  root: { position:"relative", overflow:"hidden", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--color-ground-nav-tint)", fontFamily:"var(--font-body)", color:"var(--color-ink-primary)" },
  card: { position:"relative", width:"100%", maxWidth:420, background:"var(--color-ground-card)", borderRadius:22, border:"1px solid rgba(43,39,34,0.08)", boxShadow:"0 26px 56px -34px rgba(120,80,30,0.5)", padding:"44px 40px" },
  badge: { display:"inline-block", fontSize:11, fontWeight:700, letterSpacing:"0.06em", textTransform:"uppercase", color:"var(--color-accent-amber-deep)", background:"rgba(224,149,74,0.14)", borderRadius:"var(--radius-pill)", padding:"4px 12px", margin:"14px 0 10px" },
  title: { fontFamily:"var(--font-display)", fontSize:20, fontWeight:700 },
  sub: { fontSize:13, color:"var(--color-ink-muted)", marginTop:6, lineHeight:1.5 },
  errorBox: { background:"#FBEDE9", border:"1px solid rgba(180,67,46,0.3)", borderRadius:"var(--radius-md)", padding:"11px 14px", color:"var(--color-error)", fontSize:13, marginBottom:16 },
  successBox: { background:"rgba(139,154,106,0.16)", border:"1px solid rgba(139,154,106,0.4)", borderRadius:"var(--radius-md)", padding:"11px 14px", color:"var(--color-ink-primary)", fontSize:13, marginBottom:16 },
  field: { marginBottom:13 },
  label: { display:"block", fontSize:12, fontWeight:700, color:"var(--color-ink-mid)", marginBottom:6 },
  input: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-md)", padding:"11px 14px", fontSize:14, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", background:"var(--color-ground-card)", transition:"border-color 0.15s" },
  submitBtn: { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:13, background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-lg)", fontSize:14, fontWeight:700, fontFamily:"var(--font-display)", marginTop:6, marginBottom:14 },
  switchText: { fontSize:12.5, color:"var(--color-ink-muted)", textAlign:"center", margin:0 },
  switchBtn: { background:"none", border:"none", cursor:"pointer", color:"var(--color-accent-amber-deep)", fontWeight:700, fontSize:12.5, fontFamily:"inherit", padding:0 },
};
