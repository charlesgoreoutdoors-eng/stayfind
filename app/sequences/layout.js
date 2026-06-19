"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/sequences/templates", label: "Templates" },
  { href: "/sequences/builder",   label: "Sequences" },
  { href: "/sequences/compose",   label: "Compose" },
  { href: "/sequences/tracking",  label: "Email Tracking" },
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
    <div style={{ padding:"28px 20px 80px", maxWidth:1100, margin:"0 auto" }}>
      {showIntro && (
        <div style={modal.overlay} onClick={dismissIntro}>
          <div style={modal.card} onClick={e => e.stopPropagation()}>
            <div style={modal.iconWrap}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            </div>
            <h2 style={modal.title}>How we run email outreach at StayFind</h2>
            <p style={modal.body}>
              StayFind spaces your emails randomly throughout the day with minimum 30-minute gaps to protect your Gmail reputation. We recommend sending no more than 30 emails per day — you can adjust your daily limit anytime in Settings.
            </p>
            <p style={modal.body}>
              By using sequences you accept responsibility for your Gmail account. Sending high volumes of cold email can affect your account standing.
            </p>
            <button style={modal.btn} onClick={dismissIntro}>Got it</button>
          </div>
        </div>
      )}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:16 }}>
          Sequences
        </h1>
        <div style={{ display:"flex", gap:4, borderBottom:"2px solid #F0EBE5" }}>
          {TABS.map(tab => {
            const active = pathname === tab.href || (pathname === "/sequences" && tab.href === "/sequences/templates");
            return (
              <Link key={tab.href} href={tab.href} style={{ textDecoration:"none" }}>
                <div style={{
                  padding:"10px 20px",
                  fontSize:14, fontWeight:600,
                  color: active ? "#E85D3D" : "#9FB3C8",
                  borderBottom: active ? "2px solid #E85D3D" : "2px solid transparent",
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
  overlay: { position:"fixed", inset:0, background:"rgba(15,37,68,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  card: { background:"#fff", borderRadius:18, padding:"30px 30px 26px", maxWidth:440, width:"100%", boxShadow:"0 20px 50px rgba(15,37,68,0.22)" },
  iconWrap: { width:46, height:46, borderRadius:12, background:"#FDEEE9", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:18 },
  title: { fontSize:19, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:14, lineHeight:1.3 },
  body: { fontSize:14, color:"#4A6A8A", lineHeight:1.7, marginBottom:14 },
  btn: { marginTop:6, padding:"12px 22px", background:"#E85D3D", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
};
