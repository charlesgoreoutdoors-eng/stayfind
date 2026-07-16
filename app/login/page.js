"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

// Dapples wordmark on light ground — the "Scattered Light" mark.
function Wordmark() {
  return (
    <span style={{ position:"relative", display:"inline-block", fontFamily:"var(--font-display)", fontWeight:600, fontSize:26, letterSpacing:"-0.01em", color:"var(--color-ink-primary)", lineHeight:1 }}>
      <span style={{ position:"absolute", top:"-0.24em", left:"4%", width:"0.30em", height:"0.30em", borderRadius:"50%", background:"var(--color-glow-1)", opacity:0.8, filter:"blur(2px)" }} />
      <span style={{ position:"absolute", top:"0.30em", left:"60%", width:"0.18em", height:"0.18em", borderRadius:"50%", background:"var(--color-cool-olive)", opacity:0.75, filter:"blur(1.5px)" }} />
      <span style={{ position:"relative" }}>Dapples</span>
    </span>
  );
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError) setError(urlError);
  }, [searchParams]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && !name.trim()) return;
    setLoading(true);
    setError("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() } },
      });
      if (error) setError(error.message);
      else {
        setSuccess("Account created! We've sent a confirmation email to " + email.trim() + ". Click the link in that email then come back here to sign in.");
        setMode("signin");
        setEmail("");
        setPassword("");
        setName("");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setError(error.message);
      else router.push("/dashboard");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        skipBrowserRedirect: false,
      },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const canSubmit = email.trim() && password.trim() && (mode === "signin" || name.trim()) && !loading;

  return (
    <div style={s.root}>
      <style>{`
        .dp-login-in:focus { border-color: var(--color-action-forest) !important; }
        .dp-login-primary { transition: background .15s ease; }
        .dp-login-primary:hover:not(:disabled) { background: var(--color-action-forest-hover) !important; }
        .dp-login-google:hover:not(:disabled) { border-color: var(--color-accent-amber-deep) !important; }
        @media (max-width: 520px) { .dp-login-card { padding: 32px 22px !important; } }
      `}</style>

      {/* Golden-hour glow orbs */}
      <span style={{ ...orb, top:-60, left:"12%", width:260, height:260, background:"var(--color-glow-1)", opacity:0.4, filter:"blur(70px)" }} />
      <span style={{ ...orb, bottom:-60, right:"10%", width:240, height:240, background:"var(--color-glow-3)", opacity:0.3, filter:"blur(65px)" }} />
      <span style={{ ...orb, top:"35%", right:"30%", width:140, height:140, background:"var(--color-cool-olive)", opacity:0.25, filter:"blur(50px)" }} />

      <div className="dp-login-card" style={s.card}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <Wordmark />
          <div style={s.title}>{mode === "signin" ? "Welcome back" : "Create your account"}</div>
          <div style={s.sub}>
            {mode === "signin" ? "Sign in to keep landing collaborations" : "Start finding hotel partners today"}
          </div>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}
        {success && <div style={s.successBox}>{success}</div>}

        {/* Google */}
        <button className="dp-login-google" style={s.googleBtn} onClick={handleGoogle} disabled={googleLoading}>
          {googleLoading ? (
            <><span style={s.spinnerDark} />Connecting...</>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div style={s.divider}>
          <div style={s.dividerLine} /><span style={s.dividerText}>or</span><div style={s.dividerLine} />
        </div>

        {/* Name — signup only */}
        {mode === "signup" && (
          <div style={s.field}>
            <label style={s.label}>Full Name</label>
            <input className="dp-login-in" style={s.input} placeholder="Your name"
              value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input className="dp-login-in" style={s.input} type="email" placeholder="you@example.com"
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>

        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input className="dp-login-in" style={s.input} type="password"
            placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
            value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </div>

        <button
          className="dp-login-primary"
          style={{ ...s.submitBtn, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? "pointer" : "default" }}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading
            ? <><span style={s.spinnerLight} />{mode === "signup" ? "Creating account..." : "Signing in..."}</>
            : mode === "signup" ? "Create Account" : "Sign In"}
        </button>

        <p style={s.switchText}>
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button style={s.switchBtn} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess(""); }}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
          {mode === "signin" && (
            <>
              {" · "}
              <button style={s.forgotBtn} onClick={async () => {
                if (!email.trim()) {
                  setError("Enter your email address above first, then click Forgot password.");
                  return;
                }
                const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                  redirectTo: window.location.origin + "/login",
                });
                if (error) setError(error.message);
                else setSuccess("Password reset email sent to " + email.trim() + ". Check your inbox!");
              }}>
                Forgot password?
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"var(--color-ground-nav-tint)" }} />}>
      <LoginInner />
    </Suspense>
  );
}

const orb = { position:"absolute", borderRadius:"50%", pointerEvents:"none" };

const s = {
  root: { position:"relative", overflow:"hidden", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, background:"var(--color-ground-nav-tint)", fontFamily:"var(--font-body)", color:"var(--color-ink-primary)" },
  card: { position:"relative", width:"100%", maxWidth:420, background:"var(--color-ground-card)", borderRadius:22, border:"1px solid rgba(43,39,34,0.08)", boxShadow:"0 26px 56px -34px rgba(120,80,30,0.5)", padding:"44px 40px" },
  title: { fontFamily:"var(--font-display)", fontSize:20, fontWeight:700, marginTop:14 },
  sub: { fontSize:13, color:"var(--color-ink-muted)", marginTop:4 },
  errorBox: { background:"#FBEDE9", border:"1px solid rgba(180,67,46,0.3)", borderRadius:"var(--radius-md)", padding:"11px 14px", color:"var(--color-error)", fontSize:13, marginBottom:16 },
  successBox: { background:"rgba(139,154,106,0.16)", border:"1px solid rgba(139,154,106,0.4)", borderRadius:"var(--radius-md)", padding:"11px 14px", color:"var(--color-ink-primary)", fontSize:13, marginBottom:16 },
  googleBtn: { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:13, background:"var(--color-ground-card)", border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-lg)", fontSize:14, fontWeight:600, cursor:"pointer", color:"var(--color-ink-primary)", marginBottom:16, fontFamily:"inherit", transition:"border-color 0.15s" },
  divider: { display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  dividerLine: { flex:1, height:1, background:"rgba(43,39,34,0.12)" },
  dividerText: { fontSize:12, color:"var(--color-ink-muted)" },
  field: { marginBottom:13 },
  label: { display:"block", fontSize:12, fontWeight:700, color:"var(--color-ink-mid)", marginBottom:6 },
  input: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-md)", padding:"11px 14px", fontSize:14, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", background:"var(--color-ground-card)", transition:"border-color 0.15s" },
  submitBtn: { width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:13, background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-lg)", fontSize:14, fontWeight:700, fontFamily:"var(--font-display)", marginTop:3, marginBottom:12 },
  spinnerDark: { display:"inline-block", width:14, height:14, border:"2px solid rgba(43,39,34,0.2)", borderTopColor:"var(--color-ink-primary)", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  spinnerLight: { display:"inline-block", width:14, height:14, border:"2px solid rgba(251,245,234,0.3)", borderTopColor:"var(--color-ground-page)", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  switchText: { fontSize:12.5, color:"var(--color-ink-muted)", textAlign:"center", margin:0 },
  switchBtn: { background:"none", border:"none", cursor:"pointer", color:"var(--color-accent-amber-deep)", fontWeight:700, fontSize:12.5, fontFamily:"inherit", padding:0 },
  forgotBtn: { background:"none", border:"none", cursor:"pointer", color:"var(--color-ink-muted)", fontSize:12.5, fontFamily:"inherit", textDecoration:"underline", padding:0 },
};
