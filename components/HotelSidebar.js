"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

// Hotel-side navigation. Starts with just Profile — we'll add Opportunities,
// Applications, etc. as the hotel site grows.
const NAV = [
  {
    href: "/hotel/profile",
    label: "Profile",
    icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
];

// The "Scattered Light" wordmark — Dapples with soft blurred accent dots.
function Wordmark({ size = 17 }) {
  return (
    <span style={{ position: "relative", display: "inline-block", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: size, letterSpacing: "-0.01em", color: "var(--color-ground-page)", lineHeight: 1 }}>
      <span style={{ position: "absolute", top: "-0.24em", left: "4%", width: "0.30em", height: "0.30em", borderRadius: "50%", background: "var(--color-glow-1)", opacity: 0.85, filter: "blur(1.5px)" }} />
      <span style={{ position: "absolute", top: "0.16em", left: "56%", width: "0.22em", height: "0.22em", borderRadius: "50%", background: "var(--color-cool-olive)", opacity: 0.8, filter: "blur(1px)" }} />
      <span style={{ position: "relative" }}>Dapples</span>
    </span>
  );
}

export default function HotelSidebar({ children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();

  // Logged-out visitors are redirected to /login by AuthGuard; render nothing
  // extra here in the meantime.
  if (!user) return <>{children}</>;

  return (
    <>
      <style>{`
        a { text-decoration: none; color: inherit; }
        input, select, textarea, button { font-family: inherit; }

        .hs-layout { display: flex; min-height: 100vh; }

        .hs-sidebar {
          position: fixed; top: 0; left: 0; bottom: 0; width: 220px;
          background: var(--color-action-forest); z-index: 150;
          display: flex; flex-direction: column; padding: 0 12px 24px;
          transform: translateX(-100%); transition: transform 0.25s ease;
        }
        .hs-sidebar.open { transform: translateX(0); }

        @media (min-width: 768px) {
          .hs-sidebar { transform: translateX(0) !important; position: sticky; top: 0; height: 100vh; flex-shrink: 0; }
          .hs-topbar { display: none !important; }
          .hs-main { padding-top: 0 !important; }
        }

        .hs-topbar {
          position: fixed; top: 0; left: 0; right: 0; height: 52px;
          background: var(--color-action-forest); display: flex; align-items: center;
          padding: 0 16px; gap: 14px; z-index: 200;
        }
        .hs-main { flex: 1; padding-top: 52px; min-width: 0; overflow-x: hidden; background: var(--color-ground-page); }
        .hs-overlay { position: fixed; inset: 0; background: rgba(43,39,34,0.55); z-index: 149; }

        .hs-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: var(--radius-md); cursor: pointer; transition: background 0.15s; }
        .hs-nav-item:hover { background: rgba(251,245,234,0.1); }
        .hs-nav-item.active { background: rgba(224,149,74,0.2); }
        .hs-nav-label { font-size: 14px; font-weight: 500; color: rgba(251,245,234,0.6); flex: 1; }
        .hs-nav-item.active .hs-nav-label { color: var(--color-glow-1); }

        .hs-sidebar :focus-visible { outline-color: var(--color-glow-1); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
      `}</style>

      <div className="hs-layout">
        {/* Mobile top bar */}
        <div className="hs-topbar">
          <button onClick={() => setOpen(v => !v)} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-ground-page)", display:"flex", alignItems:"center", padding:4 }}>
            {open
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>}
          </button>
          <Wordmark size={16} />
          <span style={badge}>Hotels</span>
        </div>

        {open && <div className="hs-overlay" onClick={() => setOpen(false)} />}

        <div className={`hs-sidebar${open ? " open" : ""}`}>
          {/* Logo + hotel badge */}
          <Link href="/hotel/profile" style={{ display:"flex", alignItems:"center", gap:8, padding:"24px 8px 28px" }}>
            <Wordmark size={17} />
            <span style={badge}>Hotels</span>
          </Link>

          {/* Nav */}
          <nav style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {NAV.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <div
                  key={item.href}
                  className={`hs-nav-item${isActive ? " active" : ""}`}
                  onClick={() => { router.push(item.href); setOpen(false); }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                    stroke={isActive ? "var(--color-glow-1)" : "rgba(251,245,234,0.5)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={item.icon}/>
                  </svg>
                  <span className="hs-nav-label">{item.label}</span>
                </div>
              );
            })}
          </nav>

          {/* User info + sign out */}
          <div style={{ marginTop:"auto", paddingTop:16, borderTop:"1px solid rgba(251,245,234,0.08)" }}>
            <div style={{ padding:"10px 8px" }}>
              <p style={{ fontSize:12, color:"rgba(251,245,234,0.5)", fontWeight:500, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {profile?.full_name || user.email}
              </p>
              <p style={{ fontSize:11, color:"rgba(251,245,234,0.35)", marginBottom:10 }}>Hotel account</p>
              {profile?.is_admin && (
                <button
                  onClick={() => { setOpen(false); router.push("/admin"); }}
                  style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid rgba(251,245,234,0.12)", borderRadius:"var(--radius-sm)", padding:"8px 12px", cursor:"pointer", color:"rgba(251,245,234,0.6)", fontSize:12, fontFamily:"inherit", width:"100%", marginBottom:8 }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                  Back to creator site
                </button>
              )}
              <button
                onClick={async () => { await signOut(); router.push("/login"); }}
                style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"1px solid rgba(251,245,234,0.12)", borderRadius:"var(--radius-sm)", padding:"8px 12px", cursor:"pointer", color:"rgba(251,245,234,0.6)", fontSize:12, fontFamily:"inherit", width:"100%" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <main className="hs-main">{children}</main>
      </div>
    </>
  );
}

const badge = {
  fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
  color: "var(--color-glow-1)", background: "rgba(224,149,74,0.18)",
  borderRadius: "var(--radius-pill)", padding: "3px 8px", lineHeight: 1,
};
