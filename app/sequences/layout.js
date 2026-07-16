"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/sequences/templates", label: "Templates" },
  { href: "/sequences/builder",   label: "Flows" },
  { href: "/sequences/tracking",  label: "Tracking" },
];

export default function SequencesLayout({ children }) {
  const pathname = usePathname();
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("seq_intro_seen") !== "1") setShowIntro(true);
    } catch {}
  }, []);

  const dismissIntro = () => {
    setShowIntro(false);
    try { localStorage.setItem("seq_intro_seen", "1"); } catch {}
  };

  return (
    <div style={{ padding:"36px 40px 48px", maxWidth:1160, margin:"0 auto" }}>
      {showIntro && (
        <div style={modal.overlay} onClick={dismissIntro}>
          <div style={modal.card} onClick={e => e.stopPropagation()}>
            <div style={modal.iconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-terracotta)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <h2 style={modal.title}>How we run email outreach at Dapples</h2>
            <p style={modal.body}>
              Dapples spaces your emails randomly throughout the day with minimum 30-minute gaps to protect your Gmail reputation. We recommend sending no more than 30 emails per day — you can adjust your daily limit anytime in Settings.
            </p>
            <p style={modal.body}>
              By using sequences you accept responsibility for your Gmail account. Sending high volumes of cold email can affect your account standing.
            </p>
            <button style={modal.btn} onClick={dismissIntro}>Got it</button>
          </div>
        </div>
      )}
      <div style={{ marginBottom:26 }}>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, letterSpacing:"-0.01em", marginBottom:16, color:"var(--color-ink-primary)" }}>
          Outreach
        </h1>
        <div style={{ display:"flex", gap:4, borderBottom:"2px solid var(--color-ground-sand)" }}>
          {TABS.map(tab => {
            const active = pathname === tab.href || (pathname === "/sequences" && tab.href === "/sequences/templates");
            return (
              <Link key={tab.href} href={tab.href} style={{ textDecoration:"none" }}>
                <div style={{
                  padding:"10px 20px",
                  fontSize:14, fontWeight:600,
                  color: active ? "var(--color-accent-terracotta)" : "var(--color-ink-muted)",
                  borderBottom: active ? "2px solid var(--color-accent-terracotta)" : "2px solid transparent",
                  marginBottom:"-2px",
                  cursor:"pointer",
                  transition:"color 0.15s",
                }}>
                  {tab.label}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      {children}
    </div>
  );
}

const modal = {
  overlay: { position:"fixed", inset:0, background:"rgba(43,39,34,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  card: { background:"var(--color-ground-card)", borderRadius:18, padding:"30px 30px 26px", maxWidth:440, width:"100%", boxShadow:"var(--shadow-lifted)", border:"1px solid var(--color-border)" },
  iconWrap: { width:46, height:46, borderRadius:12, background:"rgba(224,149,74,0.16)", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 },
  title: { fontFamily:"var(--font-display)", fontSize:19, fontWeight:700, color:"var(--color-ink-primary)", letterSpacing:"-0.01em", marginBottom:14, lineHeight:1.3 },
  body: { fontSize:14, color:"var(--color-ink-mid)", lineHeight:1.7, marginBottom:14 },
  btn: { marginTop:6, padding:"12px 22px", background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-lg)", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-display)" },
};
