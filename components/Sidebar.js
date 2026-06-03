"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

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
    href: "/sequences",
    label: "Sequences",
    icon: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9",
    children: [
      { href: "/sequences/templates", label: "Templates" },
      { href: "/sequences/builder",   label: "Sequences" },
      { href: "/sequences/compose",   label: "Compose" },
      { href: "/sequences/tracking",  label: "Tracking" },
    ],
  },
  {
    href: "/messages",
    label: "Messages",
    icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  },
];

export default function Sidebar({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  // Track which dropdowns are expanded
  const [expanded, setExpanded] = useState({ "/sequences": true });

  const toggleExpanded = (href) => {
    setExpanded(prev => ({ ...prev, [href]: !prev[href] }));
  };

  if (pathname === "/login") return <>{children}</>;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F7F3EF; font-family: "Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: #1E3A5F; }
        ::placeholder { color: #9FB3C8; }
        a { text-decoration: none; color: inherit; }
        input, select, textarea, button { font-family: "Plus Jakarta Sans", system-ui, sans-serif; }

        .sf-layout { display: flex; min-height: 100vh; }

        .sf-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 220px;
          background: #0F2544; z-index: 150;
          display: flex; flex-direction: column; padding: 0 12px 24px;
          transform: translateX(-100%); transition: transform 0.25s ease;
        }
        .sf-sidebar.open { transform: translateX(0); }

        @media (min-width: 768px) {
          .sf-sidebar { transform: translateX(0) !important; position: sticky; top: 0; height: 100vh; flex-shrink: 0; }
          .sf-topbar { display: none !important; }
          .sf-main { padding-top: 0 !important; }
        }

        .sf-topbar {
          position: fixed; top: 0; left: 0; right: 0; height: 52px;
          background: #0F2544; display: flex; align-items: center;
          padding: 0 16px; gap: 14px; z-index: 200;
        }
        .sf-main { flex: 1; padding-top: 52px; min-width: 0; overflow-x: hidden; }
        .sf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 149; }

        .sf-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; cursor: pointer; transition: background 0.15s; }
        .sf-nav-item:hover { background: rgba(255,255,255,0.07); }
        .sf-nav-item.active { background: rgba(232,93,61,0.18); }
        .sf-nav-label { font-size: 14px; font-weight: 500; color: #7A9BBF; flex: 1; }
        .sf-nav-item.active .sf-nav-label { color: #F5A882; }

        .sf-child-item { display: flex; align-items: center; gap: 8px; padding: 7px 12px 7px 42px; border-radius: 8px; cursor: pointer; transition: background 0.15s; }
        .sf-child-item:hover { background: rgba(255,255,255,0.05); }
        .sf-child-item.active { background: rgba(232,93,61,0.12); }
        .sf-child-label { font-size: 13px; font-weight: 400; color: #4A6A8A; }
        .sf-child-item.active .sf-child-label { color: #F5A882; font-weight: 500; }

        .sf-chevron { transition: transform 0.2s; }
        .sf-chevron.open { transform: rotate(180deg); }

        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .hotel-card { transition: transform 0.2s, box-shadow 0.2s; }
        .hotel-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(15,37,68,0.13) !important; }

        .pac-container { font-family: "Plus Jakarta Sans",system-ui,sans-serif; border-radius:12px; border:1px solid #DDD5CC; box-shadow:0 8px 24px rgba(15,37,68,0.1); margin-top:4px; z-index:9999 !important; }
        .pac-item { padding:10px 14px; font-size:14px; cursor:pointer; color:#1E3A5F; }
        .pac-item:hover { background:#F7F3EF; }
      `}</style>

      <div className="sf-layout">
        {/* Mobile top bar */}
        <div className="sf-topbar">
          <button onClick={() => setOpen(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", color:"#F7F3EF", display:"flex", alignItems:"center", padding:4 }}>
            {open
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
          </button>
          <span style={{ fontSize:16, fontWeight:700, color:"#F7F3EF", letterSpacing:"-0.3px" }}>StayFind</span>
        </div>

        {open && <div className="sf-overlay" onClick={() => setOpen(false)} />}

        <div className={`sf-sidebar${open ? " open" : ""}`}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:10, padding:"24px 8px 28px" }}>
            <div style={{ width:32, height:32, background:"#E85D3D", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <span style={{ fontSize:16, fontWeight:700, color:"#F7F3EF", letterSpacing:"-0.3px" }}>StayFind</span>
          </div>

          {/* Nav */}
          <nav style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(item => {
              const isActive = pathname === item.href || (item.children && pathname.startsWith(item.href));
              const isExpanded = expanded[item.href];

              return (
                <div key={item.href}>
                  {/* Main nav item */}
                  <div
                    className={`sf-nav-item${isActive ? " active" : ""}`}
                    onClick={() => {
                      if (item.children) {
                        toggleExpanded(item.href);
                      } else {
                        router.push(item.href);
                        setOpen(false);
                      }
                    }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                      stroke={isActive ? "#F5A882" : "#4A6A8A"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={item.icon}/>
                    </svg>
                    <span className="sf-nav-label">{item.label}</span>
                    {item.children && (
                      <svg
                        className={`sf-chevron${isExpanded ? " open" : ""}`}
                        width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#4A6A8A" strokeWidth="2.5">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    )}
                  </div>

                  {/* Children dropdown */}
                  {item.children && isExpanded && (
                    <div style={{ marginTop:2, marginBottom:4 }}>
                      {item.children.map(child => {
                        const childActive = pathname === child.href;
                        return (
                          <Link key={child.href} href={child.href} onClick={() => setOpen(false)}>
                            <div className={`sf-child-item${childActive ? " active" : ""}`}>
                              <div style={{ width:4, height:4, borderRadius:"50%", background: childActive ? "#F5A882" : "#2D5A8A", flexShrink:0 }} />
                              <span className="sf-child-label">{child.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User info + sign out */}
          <div style={{ marginTop:"auto", paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.06)" }}>
            {user && (
              <div style={{ padding:"10px 8px" }}>
                <p style={{ fontSize:12, color:"#4A6A8A", fontWeight:500, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {profile?.full_name || user.email}
                </p>
                <p style={{ fontSize:11, color:"#2D5A8A", marginBottom:10 }}>
                  {profile?.plan === "pro" ? "Pro Plan" : "Free Plan"}
                </p>
                <button
                  onClick={async () => { await signOut(); router.push("/login"); }}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"8px 12px", cursor:"pointer", color:"#4A6A8A", fontSize:12, fontFamily:"inherit", width:"100%" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>

        <main className="sf-main">{children}</main>
      </div>
    </>
  );
}
