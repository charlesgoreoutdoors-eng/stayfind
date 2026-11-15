"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PATHS = {
  account:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  contact:  "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M22 7l-10 6L2 7",
  bell:     "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z M13.73 21a2 2 0 0 1-3.46 0",
  security: "M12.65 10A6 6 0 1 0 7 14l-5 5 2 2 2-2 2 2 2-2-2-2 .35-.35A6 6 0 0 0 18 10z M16.5 7.5h.01",
};

const TABS = [
  { href: "/hotel/profile",               label: "Profile",       d: PATHS.account },
  { href: "/hotel/profile/contact",       label: "Contact",       d: PATHS.contact },
  { href: "/hotel/profile/notifications", label: "Notifications", d: PATHS.bell },
  { href: "/hotel/profile/security",      label: "Security",      d: PATHS.security },
];

function Icon({ d }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}

export default function HotelAccountTabs() {
  const pathname = usePathname();
  return (
    <div style={s.scroll}>
      <div style={s.row}>
        {TABS.map(t => {
          // /hotel/profile is the exact-match Profile tab; the sub-routes match on prefix.
          const active = t.href === "/hotel/profile" ? pathname === t.href : pathname === t.href || pathname.startsWith(t.href + "/");
          return (
            <Link key={t.href} href={t.href} style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
              <Icon d={t.d} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  scroll: { overflowX: "auto", borderBottom: "1px solid var(--color-border)", marginBottom: 32 },
  row: { display: "flex", gap: 4, minWidth: "max-content" },
  tab: { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", fontSize: 14, fontWeight: 600, color: "var(--color-ink-muted)", textDecoration: "none", borderBottom: "2px solid transparent", whiteSpace: "nowrap", marginBottom: -1 },
  tabActive: { color: "var(--color-ink-primary)", borderBottomColor: "var(--color-action-forest)" },
};
