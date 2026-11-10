"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PATHS = {
  account:  "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  prefs:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  address:  "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  security: "M12.65 10A6 6 0 1 0 7 14l-5 5 2 2 2-2 2 2 2-2-2-2 .35-.35A6 6 0 0 0 18 10z M16.5 7.5h.01",
  payment:  "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  bell:     "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9z M13.73 21a2 2 0 0 1-3.46 0",
};

const TABS = [
  { href: "/account",          label: "Account",          d: PATHS.account },
  { href: "/preferences",      label: "Preferences",      d: PATHS.prefs },
  { href: "/socials",          label: "Socials",          instagram: true },
  { href: "/address",          label: "Address",          d: PATHS.address },
  { href: "/security",         label: "Security",         d: PATHS.security },
  { href: "/payment-settings", label: "Payment settings", d: PATHS.payment },
  { href: "/notifications",    label: "Notifications",    d: PATHS.bell },
];

function Icon({ d, instagram }) {
  if (instagram) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );
}

export default function AccountTabs() {
  const pathname = usePathname();
  return (
    <div style={s.scroll}>
      <div style={s.row}>
        {TABS.map(t => {
          const active = pathname === t.href;
          return (
            <Link key={t.href} href={t.href} style={{ ...s.tab, ...(active ? s.tabActive : {}) }}>
              <Icon d={t.d} instagram={t.instagram} />
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
