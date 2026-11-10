"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth";

// Icons (stroke SVGs)
const I = {
  account:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  prefs:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  address:  "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  security: "M12.65 10A6 6 0 1 0 7 14l-5 5 2 2 2-2 2 2 2-2-2-2 .35-.35A6 6 0 0 0 18 10z M16.5 7.5h.01",
  payment:  "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  bell:     "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z M13.73 21a2 2 0 0 1-3.46 0",
};

const ITEMS = [
  { href: "/account",          label: "Account",          d: I.account, instagram: false },
  { href: "/preferences",      label: "Preferences",      d: I.prefs,   instagram: false },
  { href: "/socials",          label: "Socials",          d: null,      instagram: true },
  { href: "/address",          label: "Address",          d: I.address, instagram: false },
  { href: "/security",         label: "Security",         d: I.security,instagram: false },
  { href: "/payment-settings", label: "Payment settings", d: I.payment, instagram: false },
  { href: "/notifications",    label: "Notifications",    d: I.bell,    instagram: false },
  { href: "/sending",          label: "Sending",          d: "M22 2 11 13 M22 2l-7 20-4-9-9-4 20-7z", instagram: false },
];

function ItemIcon({ d, instagram }) {
  if (instagram) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export default function ProfileMenu() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    try {
      const t = localStorage.getItem("dapples_theme") || "light";
      setTheme(t);
      document.documentElement.dataset.theme = t;
    } catch {}
  }, []);

  const setThemePref = (t) => {
    setTheme(t);
    try { localStorage.setItem("dapples_theme", t); document.documentElement.dataset.theme = t; } catch {}
  };

  if (!user) return null;

  const name = profile?.full_name || user.email?.split("@")[0] || "Account";
  const email = user.email || "";
  const avatar = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const initial = (name || "C").trim()[0]?.toUpperCase() || "C";

  return (
    <div ref={ref} style={s.wrap}>
      <button style={s.avatarBtn} onClick={() => setOpen(v => !v)} aria-label="Account menu">
        {avatar
          ? <img src={avatar} alt="" style={s.avatarImg} />
          : <span style={s.avatarInitial}>{initial}</span>}
      </button>

      {open && (
        <div style={s.menu}>
          {/* Header */}
          <div style={s.head}>
            {avatar
              ? <img src={avatar} alt="" style={s.headAvatar} />
              : <span style={s.headInitial}>{initial}</span>}
            <div style={{ minWidth: 0 }}>
              <div style={s.hName}>{name}</div>
              <div style={s.hEmail}>{email}</div>
            </div>
          </div>

          <div style={s.divider} />

          {/* Items */}
          <div style={{ padding: 6 }}>
            {ITEMS.map(it => (
              <Link key={it.href} href={it.href} style={s.item} onClick={() => setOpen(false)}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-ground-sand)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <span style={s.itemIcon}><ItemIcon d={it.d} instagram={it.instagram} /></span>
                <span style={s.itemLabel}>{it.label}</span>
              </Link>
            ))}
          </div>

          <div style={s.divider} />

          {/* Appearance */}
          <div style={s.appearance}>
            <span style={s.appLabel}>Appearance</span>
            <div style={s.toggle}>
              <button style={{ ...s.toggleBtn, ...(theme === "light" ? s.toggleActive : {}) }} onClick={() => setThemePref("light")} aria-label="Light">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
              </button>
              <button style={{ ...s.toggleBtn, ...(theme === "dark" ? s.toggleActive : {}) }} onClick={() => setThemePref("dark")} aria-label="Dark">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
              </button>
            </div>
          </div>

          <div style={s.divider} />

          {/* Logout */}
          <button style={s.logout} onClick={async () => { setOpen(false); await signOut(); router.push("/login"); }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(180,67,46,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { position: "fixed", top: 12, right: 18, zIndex: 300 },
  avatarBtn: { width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--color-ground-card)", background: "var(--color-action-forest)", cursor: "pointer", padding: 0, overflow: "hidden", boxShadow: "0 4px 14px -4px rgba(43,39,34,0.35)", display: "flex", alignItems: "center", justifyContent: "center" },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarInitial: { color: "var(--color-ground-page)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 },

  menu: { position: "absolute", top: 48, right: 0, width: 292, background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: 18, boxShadow: "0 24px 60px -24px rgba(43,39,34,0.45)", overflow: "hidden", fontFamily: "var(--font-body)" },
  head: { display: "flex", alignItems: "center", gap: 12, padding: "16px 18px" },
  headAvatar: { width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0 },
  headInitial: { width: 44, height: 44, borderRadius: "50%", background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, flexShrink: 0 },
  hName: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  hEmail: { fontSize: 13, color: "var(--color-ink-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 },
  divider: { height: 1, background: "var(--color-border)" },

  item: { display: "flex", alignItems: "center", gap: 13, padding: "10px 12px", borderRadius: 10, textDecoration: "none", color: "var(--color-ink-primary)", transition: "background .12s" },
  itemIcon: { color: "var(--color-ink-mid)", display: "flex", alignItems: "center" },
  itemLabel: { fontSize: 14.5, fontWeight: 500 },

  appearance: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px" },
  appLabel: { fontSize: 14, fontWeight: 600, color: "var(--color-ink-mid)" },
  toggle: { display: "flex", gap: 4, background: "var(--color-ground-sand)", borderRadius: 10, padding: 3 },
  toggleBtn: { width: 36, height: 30, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "var(--color-ink-muted)", display: "flex", alignItems: "center", justifyContent: "center" },
  toggleActive: { background: "var(--color-ground-card)", color: "var(--color-accent-amber-deep)", boxShadow: "0 1px 4px rgba(43,39,34,0.12)" },

  logout: { display: "flex", alignItems: "center", gap: 13, width: "100%", padding: "14px 18px", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-error)", fontSize: 14.5, fontWeight: 600, fontFamily: "inherit", transition: "background .12s" },
};
