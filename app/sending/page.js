"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useGmail } from "../../lib/useGmail";
import { sanitizeText } from "../../lib/marketplace";
import AccountTabs from "../../components/AccountTabs";

export default function SendingPage() {
  const { user } = useAuth();
  const { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail } = useGmail();

  const [signature, setSignature] = useState("");
  const [dailyLimit, setDailyLimit] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from("profiles").select("email_signature, daily_email_limit").eq("id", user.id).maybeSingle();
      if (!active) return;
      setSignature(data?.email_signature || "");
      setDailyLimit(data?.daily_email_limit != null ? String(data.daily_email_limit) : "");
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const save = async () => {
    setSaving(true); setError("");
    const payload = {
      email_signature: sanitizeText(signature)?.trim() || null,
      daily_email_limit: dailyLimit ? Math.max(1, Math.min(500, Number(dailyLimit))) : null,
    };
    const { error: err } = await supabase.from("profiles").update(payload).eq("id", user.id);
    setSaving(false);
    if (err) setError(err.message); else { setSaved(true); }
  };

  const connected = !!gmailToken && !tokenExpired;

  return (
    <div style={s.wrap}>
      <AccountTabs />

      {/* Gmail connection */}
      <div style={s.card}>
        <h3 style={s.h3}>Gmail connection</h3>
        <p style={s.cardText}>Connect the Gmail you’ll send hotel outreach from. Flows send through your own inbox, and replies land there too.</p>

        {gmailLoading ? (
          <div style={s.statusRow}><span style={s.spinner} /> Connecting…</div>
        ) : connected ? (
          <div style={s.connectedRow}>
            <span style={s.connectedBadge}><span style={s.dot} /> Connected{gmailEmail ? ` · ${gmailEmail}` : ""}</span>
            <button style={s.ghost} onClick={disconnectGmail}>Disconnect</button>
          </div>
        ) : tokenExpired ? (
          <div style={s.connectedRow}>
            <span style={s.expiredBadge}>Connection expired — reconnect to keep sending</span>
            <button style={s.connectBtn} onClick={connectGmail}>Reconnect Gmail</button>
          </div>
        ) : (
          <button style={s.connectBtn} onClick={connectGmail}>Connect Gmail</button>
        )}
      </div>

      {/* Sending settings */}
      <div style={s.card}>
        <h3 style={s.h3}>Email sending</h3>

        {loading ? <div style={s.statusRow}><span style={s.spinner} /> Loading…</div> : (
          <>
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>Email signature</label>
              <p style={s.hint}>Appended to the bottom of every outreach email. Plain text or simple HTML.</p>
              <textarea style={{ ...s.input, minHeight: 120, resize: "vertical" }} placeholder={"Charles Gore\nCreator · dapples.io"} value={signature} onChange={e => { setSignature(e.target.value); setSaved(false); }} />
            </div>

            <div style={{ marginBottom: 8, maxWidth: 240 }}>
              <label style={s.label}>Daily send limit</label>
              <p style={s.hint}>Max outreach emails sent per day (1–500). Default 30.</p>
              <input style={s.input} type="number" min="1" max="500" placeholder="30" value={dailyLimit} onChange={e => { setDailyLimit(e.target.value); setSaved(false); }} />
            </div>

            {error && <p style={s.error}>{error}</p>}
            <button style={s.saveBtn} onClick={save} disabled={saving}>{saving ? "Saving…" : saved ? "Saved ✓" : "Save"}</button>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "24px 26px", boxShadow: "var(--shadow-low)", maxWidth: 820, margin: "0 auto 18px" },
  h3: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 8 },
  cardText: { fontSize: 13.5, color: "var(--color-ink-muted)", lineHeight: 1.55, marginBottom: 16, maxWidth: "62ch" },
  statusRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14 },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  connectedRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  connectedBadge: { display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "8px 14px", borderRadius: "var(--radius-md)" },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "var(--status-success-ink)" },
  expiredBadge: { fontSize: 13, fontWeight: 600, color: "var(--color-error)", background: "var(--status-error-bg)", padding: "8px 14px", borderRadius: "var(--radius-md)" },
  connectBtn: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  ghost: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  label: { display: "block", fontSize: 12.5, fontWeight: 700, color: "var(--color-ink-mid)", marginBottom: 4 },
  hint: { fontSize: 12.5, color: "var(--color-ink-muted)", marginBottom: 8, lineHeight: 1.5 },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "4px 0 0" },
  saveBtn: { marginTop: 16, background: "var(--color-ink-primary)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "13px 28px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
