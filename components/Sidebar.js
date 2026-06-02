"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",          label: "Search",    icon: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" },
  { href: "/lists",     label: "Lists",     icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2" },
  { href: "/templates", label: "Templates", icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9" },
  { href: "/compose",   label: "Compose",   icon: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" },
];

export default function Sidebar({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div style={s.root}>
      {/* Mobile top bar */}
      <div style={s.topBar}>
        <button style={s.hamburger} onClick={() => setOpen(v => !v)}>
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          )}
        </button>
        <span style={s.topBarLogo}>StayFind</span>
      </div>

      {/* Overlay for mobile */}
      {open && <div style={s.overlay} onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <div style={{ ...s.sidebar, transform: open ? "translateX(0)" : undefined }}>
        <div style={s.sidebarLogo}>
          <span style={s.logoMark}>SF</span>
          <span style={s.logoText}>StayFind</span>
        </div>
        <nav style={s.nav}>
          {NAV.map(item => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration:"none" }} onClick={() => setOpen(false)}>
                <div style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                    stroke={active ? "#6366f1" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon}/>
                  </svg>
                  <span style={{ ...s.navLabel, color: active ? "#6366f1" : "#64748b" }}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div style={s.main}>
        {children}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-el { transform: translateX(0) !important; position: relative !important; }
          .topbar-el { display: none !important; }
          .main-el { margin-left: 220px !important; }
        }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .hotel-card { transition: transform 0.2s, box-shadow 0.2s; }
        .hotel-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.11) !important; }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .pac-container { font-family: system-ui,sans-serif; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 8px 24px rgba(0,0,0,0.1); margin-top:4px; }
        .pac-item { padding:10px 14px; font-size:14px; cursor:pointer; }
        .pac-item:hover { background:#f1f5f9; }
        * { box-sizing: border-box; margin:0; padding:0; }
        body { background:#f8f7f4; font-family:system-ui,sans-serif; }
        ::placeholder { color:#b0bac6; }
        a { text-decoration: none; }
      `}</style>
    </div>
  );
}

const s = {
  root: { display:"flex", minHeight:"100vh", background:"#f8f7f4" },
  topBar: { position:"fixed", top:0, left:0, right:0, height:52, background:"#0f0e17", display:"flex", alignItems:"center", padding:"0 16px", gap:14, zIndex:200, className:"topbar-el" },
  hamburger: { background:"none", border:"none", cursor:"pointer", color:"#e2e8f0", display:"flex", alignItems:"center", justifyContent:"center", padding:4 },
  topBarLogo: { fontFamily:"Georgia,serif", fontSize:16, color:"#e2e8f0" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:149 },
  sidebar: { position:"fixed", top:0, left:0, bottom:0, width:220, background:"#0f0e17", zIndex:150, display:"flex", flexDirection:"column", padding:"0 12px 24px", transform:"translateX(-100%)", transition:"transform 0.25s ease", className:"sidebar-el" },
  sidebarLogo: { display:"flex", alignItems:"center", gap:10, padding:"24px 8px 28px" },
  logoMark: { fontSize:12, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,0.15)", padding:"3px 7px", borderRadius:5 },
  logoText: { fontFamily:"Georgia,serif", fontSize:16, color:"#e2e8f0" },
  nav: { display:"flex", flexDirection:"column", gap:4 },
  navItem: { display:"flex", alignItems:"center", gap:12, padding:"11px 12px", borderRadius:10, cursor:"pointer", transition:"background 0.15s" },
  navItemActive: { background:"rgba(99,102,241,0.12)" },
  navLabel: { fontSize:14, fontWeight:500 },
  main: { flex:1, paddingTop:52, minWidth:0, className:"main-el" },
};
