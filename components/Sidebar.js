"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/",
    label: "Search",
    icon: "M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z",
  },
  {
    href: "/lists",
    label: "Lists",
    icon: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2",
  },
  {
    href: "/templates",
    label: "Templates",
    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9",
  },
  {
    href: "/compose",
    label: "Compose",
    icon: "M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z",
  },
];

export default function Sidebar({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f7f4; font-family: system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        ::placeholder { color: #b0bac6; }
        a { text-decoration: none; color: inherit; }

        .sf-layout { display: flex; min-height: 100vh; }

        /* Sidebar - mobile: hidden off left */
        .sf-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 220px;
          background: #0f0e17; z-index: 150;
          display: flex; flex-direction: column; padding: 0 12px 24px;
          transform: translateX(-100%); transition: transform 0.25s ease;
        }
        .sf-sidebar.open { transform: translateX(0); }

        /* Desktop: always show sidebar */
        @media (min-width: 768px) {
          .sf-sidebar { transform: translateX(0) !important; position: sticky; top: 0; height: 100vh; flex-shrink: 0; }
          .sf-topbar { display: none !important; }
          .sf-main { padding-top: 0 !important; }
        }

        .sf-topbar {
          position: fixed; top: 0; left: 0; right: 0; height: 52px;
          background: #0f0e17; display: flex; align-items: center;
          padding: 0 16px; gap: 14px; z-index: 200;
        }
        .sf-main { flex: 1; padding-top: 52px; min-width: 0; overflow-x: hidden; }
        .sf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 149; }

        .sf-nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
        .sf-nav-item:hover { background: rgba(255,255,255,0.06); }
        .sf-nav-item.active { background: rgba(99,102,241,0.18); }
        .sf-nav-label { font-size: 14px; font-weight: 500; color: #64748b; }
        .sf-nav-item.active .sf-nav-label { color: #a5b4fc; }

        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .hotel-card { transition: transform 0.2s, box-shadow 0.2s; }
        .hotel-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.11) !important; }

        .pac-container { font-family: system-ui,sans-serif; border-radius:12px; border:1px solid #e2e8f0; box-shadow:0 8px 24px rgba(0,0,0,0.1); margin-top:4px; z-index: 9999 !important; }
        .pac-item { padding:10px 14px; font-size:14px; cursor:pointer; }
        .pac-item:hover { background:#f1f5f9; }
      `}</style>

      <div className="sf-layout">
        {/* Mobile top bar */}
        <div className="sf-topbar">
          <button
            onClick={() => setOpen(v => !v)}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#e2e8f0", display:"flex", alignItems:"center", padding:4 }}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
          <span style={{ fontFamily:"Georgia,serif", fontSize:16, color:"#e2e8f0" }}>StayFind</span>
        </div>

        {/* Overlay */}
        {open && <div className="sf-overlay" onClick={() => setOpen(false)} />}

        {/* Sidebar */}
        <div className={`sf-sidebar${open ? " open" : ""}`}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"24px 8px 32px" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,0.15)", padding:"3px 7px", borderRadius:5 }}>SF</span>
            <span style={{ fontFamily:"Georgia,serif", fontSize:16, color:"#e2e8f0" }}>StayFind</span>
          </div>

          {/* Nav */}
          <nav style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(item => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  <div className={`sf-nav-item${active ? " active" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                      stroke={active ? "#a5b4fc" : "#475569"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon}/>
                    </svg>
                    <span className="sf-nav-label">{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Bottom hint */}
          <div style={{ marginTop:"auto", padding:"12px 8px 0" }}>
            <p style={{ fontSize:11, color:"#334155", lineHeight:1.5 }}>Add hotels from Search, organise in Lists, then Compose your outreach.</p>
          </div>
        </div>

        {/* Main content */}
        <main className="sf-main">
          {children}
        </main>
      </div>
    </>
  );
}
