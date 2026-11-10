"use client";
import AccountTabs from "../../components/AccountTabs";

export default function PaymentSettingsPage() {
  const soon = () => alert("Stripe payouts are coming soon.");
  return (
    <div style={s.wrap}>
      <AccountTabs />

      <div style={s.comingSoon}>Stripe payouts & cards are coming soon — the layout’s here, we’ll wire it up next.</div>

      {/* Payouts */}
      <h2 style={s.h2}>Payouts</h2>
      <p style={s.sub}>Connect Stripe to invoice hotels and receive payouts for paid collabs.</p>
      <div style={s.card}>
        <p style={s.cardText}>To start invoicing hotels and receiving payments on Dapples, finish verifying your Stripe Connect account.</p>
        <div style={s.btnRow}>
          <button style={s.greenBtn} onClick={soon}>Stripe Connect Dashboard</button>
          <button style={s.greenBtn} onClick={soon}>Continue setup →</button>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0 28px" }}>
        <button style={s.unlinkBtn} onClick={soon}>Unlink Stripe Connect account</button>
      </div>

      {/* Payment methods */}
      <div style={s.card}>
        <div style={s.methodsHead}>
          <div>
            <h3 style={s.h3}>Payment methods</h3>
            <p style={s.methodsText}>Cards on file for gift claims. You’re only charged if you take a gift and don’t deliver what was agreed upon.</p>
          </div>
          <button style={s.addCard} onClick={soon}>+ Add card</button>
        </div>
        <p style={s.empty}>No cards on file yet.</p>
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  comingSoon: { background: "rgba(224,149,74,0.12)", color: "var(--color-ink-mid)", border: "1px solid rgba(224,149,74,0.3)", borderRadius: "var(--radius-md)", padding: "11px 16px", fontSize: 13, marginBottom: 24 },
  h2: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, marginBottom: 14 },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "22px 24px", boxShadow: "var(--shadow-low)", maxWidth: 860 },
  cardText: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.55, marginBottom: 16 },
  btnRow: { display: "flex", gap: 10, flexWrap: "wrap" },
  greenBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  unlinkBtn: { background: "var(--color-error)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  methodsHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 14 },
  h3: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)" },
  methodsText: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 4, maxWidth: "60ch", lineHeight: 1.5 },
  addCard: { background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", whiteSpace: "nowrap" },
  empty: { fontSize: 13.5, color: "var(--color-ink-muted)" },
};
