// Shared scaffold for the creator account pages we'll build out together.
export default function SettingsPlaceholder({ title, description }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 64px" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" }}>{title}</h1>
      {description && (
        <p style={{ fontSize: 14.5, color: "var(--color-ink-muted)", marginTop: 8, maxWidth: "58ch", lineHeight: 1.6 }}>{description}</p>
      )}
      <div style={{ marginTop: 28, background: "var(--color-ground-card)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", padding: "52px 24px", textAlign: "center", color: "var(--color-ink-muted)", fontSize: 14, lineHeight: 1.6 }}>
        We’ll build this page out together — tell me what should go here.
      </div>
    </div>
  );
}
