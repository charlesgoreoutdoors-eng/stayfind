import Link from "next/link";

// Add new links here and they appear in the footer on every page.
const LINKS = [
  { label: "Privacy Policy",   href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact",          href: "/contact" },
];

const SOCIALS = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/dapples.io",
    svg: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></>,
  },
];

export default function SiteFooter() {
  return (
    <footer style={s.footer}>
      <div style={s.inner}>
        <span style={s.copy}>© {new Date().getFullYear()} Dapples</span>
        <nav style={s.links} aria-label="Footer">
          {LINKS.map(l => <Link key={l.href} href={l.href} style={s.link}>{l.label}</Link>)}
        </nav>
        <div style={s.socials}>
          {SOCIALS.map(so => (
            <a key={so.label} href={so.href} target="_blank" rel="noreferrer" aria-label={so.label} title={so.label} style={s.social}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{so.svg}</svg>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

const s = {
  footer: { borderTop: "1px solid var(--color-border)", background: "var(--color-ground-page)", padding: "18px 24px", fontFamily: "var(--font-body)" },
  inner: { maxWidth: 1160, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" },
  copy: { fontSize: 12.5, color: "var(--color-ink-muted)" },
  links: { display: "flex", gap: 20, flexWrap: "wrap" },
  link: { fontSize: 12.5, fontWeight: 600, color: "var(--color-ink-mid)", textDecoration: "none" },
  socials: { display: "flex", gap: 12 },
  social: { color: "var(--color-ink-mid)", display: "flex" },
};
