"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

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

  return (
    <div style={s.root}>
      <style>{`
        @media (max-width: 640px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; padding: 32px 20px !important; }
        }
      `}</style>
      {/* Left panel - branding */}
      <div style={s.left} className="login-left">
        <div style={s.leftInner}>
          <div style={s.logo}>
            <div style={s.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={s.logoText}>StayFind</span>
          </div>
          <h1 style={s.leftHeadline}>The outreach platform for content creators</h1>
          <p style={s.leftSub}>Find hotels, build relationships, grow your brand.</p>

          <div style={s.features}>
            {[
              { icon: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z", text: "Search hotels by location and budget" },
              { icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2", text: "Organise contacts into lists" },
              { icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9", text: "Send personalised outreach at scale" },
              { icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", text: "Manage all replies in one inbox" },
            ].map((f, i) => (
              <div key={i} style={s.feature}>
                <div style={s.featureIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon}/>
                  </svg>
                </div>
                <span style={s.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div style={s.right} className="login-right">
        <div style={s.formWrap}>
          <h2 style={s.formTitle}>
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p style={s.formSub}>
            {mode === "signin" ? "Sign in to your StayFind account" : "Start finding hotel partners today"}
          </p>

          {error && <div style={s.errorBox}>{error}</div>}
          {success && <div style={s.successBox}>{success}</div>}

          {/* Google button */}
          <button style={s.googleBtn} onClick={handleGoogle} disabled={googleLoading}>
            {googleLoading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <span style={s.spinnerDark} />Connecting...
              </span>
            ) : (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </span>
            )}
          </button>

          <div style={s.divider}>
            <div style={s.dividerLine} />
            <span style={s.dividerText}>or</span>
            <div style={s.dividerLine} />
          </div>

          {/* Name field - signup only */}
          {mode === "signup" && (
            <div style={s.field}>
              <label style={s.label}>Full Name</label>
              <input
                style={s.input}
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Email</label>
            <input
              style={s.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Password</label>
            <input
              style={s.input}
              type="password"
              placeholder={mode === "signup" ? "Min 6 characters" : "Your password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
          </div>

          <button
            style={{ ...s.submitBtn, opacity: email.trim() && password.trim() && (mode === "signin" || name.trim()) && !loading ? 1 : 0.45 }}
            onClick={handleSubmit}
            disabled={loading || !email.trim() || !password.trim() || (mode === "signup" && !name.trim())}
          >
            {loading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <span style={s.spinnerLight} />{mode === "signup" ? "Creating account..." : "Signing in..."}
              </span>
            ) : mode === "signup" ? "Create Account" : "Sign In"}
          </button>

          <p style={s.switchText}>
            {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
            <button style={s.switchBtn} onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setSuccess(""); }}>
              {mode === "signin" ? "Sign up free" : "Sign in"}
            </button>
          </p>

          {mode === "signin" && (
            <div style={s.forgotWrap}>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:"100vh", background:"#F7F3EF" }} />}>
      <LoginInner />
    </Suspense>
  );
}

const s = {
  root: { display:"flex", minHeight:"100vh", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  left: { width:"45%", background:"#0F2544", display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 40px" },
  leftInner: { maxWidth:360 },
  logo: { display:"flex", alignItems:"center", gap:10, marginBottom:48 },
  logoIcon: { width:36, height:36, background:"#E85D3D", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center" },
  logoText: { fontSize:20, fontWeight:700, color:"#F7F3EF", letterSpacing:"-0.3px" },
  leftHeadline: { fontSize:32, fontWeight:700, color:"#F7F3EF", lineHeight:1.2, marginBottom:12, letterSpacing:"-0.5px" },
  leftSub: { fontSize:15, color:"#4A6A8A", lineHeight:1.6, marginBottom:40 },
  features: { display:"flex", flexDirection:"column", gap:16 },
  feature: { display:"flex", alignItems:"center", gap:12 },
  featureIcon: { width:28, height:28, background:"rgba(232,93,61,0.15)", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  featureText: { fontSize:14, color:"#7A9BBF", lineHeight:1.4 },
  right: { flex:1, background:"#F7F3EF", display:"flex", alignItems:"center", justifyContent:"center", padding:"48px 40px" },
  formWrap: { width:"100%", maxWidth:400 },
  formTitle: { fontSize:26, fontWeight:700, color:"#0F2544", marginBottom:6, letterSpacing:"-0.3px" },
  formSub: { fontSize:14, color:"#9FB3C8", marginBottom:28 },
  errorBox: { background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:10, padding:"11px 14px", color:"#B83A22", fontSize:13, marginBottom:16 },
  successBox: { background:"#E8F8F5", border:"1px solid #A8E6E0", borderRadius:10, padding:"11px 14px", color:"#1A6B5A", fontSize:13, marginBottom:16 },
  googleBtn: { width:"100%", padding:13, background:"#fff", border:"1.5px solid #DDD5CC", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", color:"#1E3A5F", marginBottom:20, fontFamily:"inherit", transition:"border-color 0.15s" },
  divider: { display:"flex", alignItems:"center", gap:12, marginBottom:20 },
  dividerLine: { flex:1, height:1, background:"#DDD5CC" },
  dividerText: { fontSize:12, color:"#9FB3C8", fontWeight:500 },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:7 },
  input: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"#1E3A5F", outline:"none", background:"#fff", transition:"border-color 0.15s" },
  submitBtn: { width:"100%", padding:13, background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"opacity 0.2s", marginBottom:16 },
  spinnerDark: { display:"inline-block", width:14, height:14, border:"2px solid rgba(30,58,95,0.2)", borderTopColor:"#1E3A5F", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  spinnerLight: { display:"inline-block", width:14, height:14, border:"2px solid rgba(247,243,239,0.3)", borderTopColor:"#F7F3EF", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  switchText: { fontSize:13, color:"#9FB3C8", textAlign:"center", marginBottom:8 },
  switchBtn: { background:"none", border:"none", cursor:"pointer", color:"#E85D3D", fontWeight:600, fontSize:13, fontFamily:"inherit" },
  forgotWrap: { textAlign:"right", marginTop:-8, marginBottom:16 },
  forgotBtn: { background:"none", border:"none", cursor:"pointer", color:"#9FB3C8", fontSize:12, fontFamily:"inherit", textDecoration:"underline" },
};
