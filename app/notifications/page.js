"use client";
import { useState } from "react";
import AccountTabs from "../../components/AccountTabs";

// Dapples-relevant notification types. (Display only for now — wiring/saving
// comes later.)
const TYPES = [
  { key: "opportunities", title: "Opportunities", desc: "New hotel collabs, application status and approved content.", email: true, app: true },
  { key: "new_opps",      title: "New opportunities", desc: "Daily digest of new collabs on the job board.", email: true, app: false },
  { key: "messages",      title: "Messages", desc: "Get notified about new messages.", email: true, app: true },
  { key: "connections",   title: "Connections", desc: "Connection requests and acceptances.", email: true, app: true },
  { key: "giftings",      title: "Giftings", desc: "Gifting invitations and updates.", email: true, app: true },
  { key: "reviews",       title: "Reviews", desc: "Review requests, submitted reviews and replies.", email: true, app: true },
  { key: "socials",       title: "Connected socials", desc: "Reminders to reconnect your social accounts.", email: true, app: true },
  { key: "product",       title: "Product updates", desc: "Tips, news and product updates from Dapples.", email: true, app: null },
  { key: "newsletter",    title: "Creator newsletter", desc: "News, tips and updates for creators.", email: true, app: null },
];

function Toggle({ on, onClick }) {
  return (
    <button onClick={onClick} aria-pressed={on} style={{ ...sw.track, ...(on ? sw.trackOn : {}) }}>
      <span style={{ ...sw.knob, ...(on ? sw.knobOn : {}) }} />
    </button>
  );
}

export default function NotificationsPage() {
  const init = {};
  TYPES.forEach(t => { init[t.key] = { email: !!t.email, app: !!t.app }; });
  const [state, setState] = useState(init);
  const flip = (key, col) => setState(s => ({ ...s, [key]: { ...s[key], [col]: !s[key][col] } }));

  return (
    <div style={s.wrap}>
      <AccountTabs />
      <div style={s.note}>Choose what you’re notified about. (Saving these is coming next — toggles are a preview for now.)</div>

      <div style={s.card}>
        <div style={s.headRow}>
          <span style={s.headType}>Notification type</span>
          <div style={s.headCols}><span style={s.colLabel}>Email</span><span style={s.colLabel}>App</span></div>
        </div>
        {TYPES.map(t => (
          <div key={t.key} style={s.row}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={s.rowTitle}>{t.title}</div>
              <div style={s.rowDesc}>{t.desc}</div>
            </div>
            <div style={s.rowCols}>
              <div style={s.cell}>{t.email !== null ? <Toggle on={state[t.key].email} onClick={() => flip(t.key, "email")} /> : <span style={s.dash}>—</span>}</div>
              <div style={s.cell}>{t.app !== null ? <Toggle on={state[t.key].app} onClick={() => flip(t.key, "app")} /> : <span style={s.dash}>—</span>}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const sw = {
  track: { width: 40, height: 24, borderRadius: 999, border: "none", background: "var(--color-border)", cursor: "pointer", padding: 0, position: "relative", transition: "background .15s" },
  trackOn: { background: "var(--color-action-forest)" },
  knob: { position: "absolute", top: 3, left: 3, width: 18, height: 18, borderRadius: "50%", background: "var(--color-ground-card)", transition: "left .15s", boxShadow: "0 1px 3px rgba(43,39,34,0.3)" },
  knobOn: { left: 19 },
};

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  note: { background: "rgba(224,149,74,0.12)", color: "var(--color-ink-mid)", border: "1px solid rgba(224,149,74,0.3)", borderRadius: "var(--radius-md)", padding: "11px 16px", fontSize: 13, marginBottom: 20 },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-low)", overflow: "hidden" },
  headRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", background: "var(--color-ground-sand)", borderBottom: "1px solid var(--color-border)" },
  headType: { fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)" },
  headCols: { display: "flex", gap: 24 },
  colLabel: { width: 40, textAlign: "center", fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 22px", borderBottom: "1px solid var(--color-border)" },
  rowTitle: { fontSize: 14.5, fontWeight: 700, color: "var(--color-ink-primary)" },
  rowDesc: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 3, lineHeight: 1.45 },
  rowCols: { display: "flex", gap: 24, flexShrink: 0 },
  cell: { width: 40, display: "flex", justifyContent: "center" },
  dash: { color: "var(--color-ink-muted)" },
};
