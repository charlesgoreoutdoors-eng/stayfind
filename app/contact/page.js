export const metadata = {
  title: "Contact — Dapples",
  description: "Get in touch with the Dapples team.",
};

export default function ContactPage() {
  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <a href="/" style={s.back}>← Dapples</a>
        <h1 style={s.h1}>Contact us</h1>
        <p style={s.p}>Questions, feedback, a bug to report, or want to upgrade your plan? We read every message.</p>

        <div style={s.card}>
          <div style={s.label}>Email</div>
          <a href="mailto:hello@dapples.io" style={s.email}>hello@dapples.io</a>
          <p style={s.small}>We’ll reply within 48 hours.</p>
        </div>

        <div style={s.card}>
          <div style={s.label}>Instagram</div>
          <a href="https://www.instagram.com/dapples.io" target="_blank" rel="noreferrer" style={s.email}>@dapples.io</a>
          <p style={s.small}>Follow along for updates and new features.</p>
        </div>

        <div style={s.card}>
          <div style={s.label}>Hotels</div>
          <p style={{ ...s.p, marginBottom: 0 }}>
            Want your property listed or have a collab opportunity for creators? Email us and we&rsquo;ll get you set up.
          </p>
        </div>
      </div>
    </main>
  );
}

const s = {
  page: { minHeight: "70vh", background: "var(--color-ground-page)", color: "var(--color-ink-primary)", fontFamily: "var(--font-body)", padding: "40px 20px 60px" },
  wrap: { maxWidth: 620, margin: "0 auto" },
  back: { display: "inline-block", fontSize: 13, fontWeight: 700, color: "var(--color-ink-mid)", textDecoration: "none", marginBottom: 20 },
  h1: { fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 10 },
  p: { fontSize: 15, lineHeight: 1.7, color: "var(--color-ink-mid)", marginBottom: 20 },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-low)", padding: "20px 22px", marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-ink-muted)", marginBottom: 6 },
  email: { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-accent-amber-deep)", textDecoration: "none" },
  small: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 6 },
};
