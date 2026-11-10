"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import AccountTabs from "../../components/AccountTabs";

export default function SecurityPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const provider = user?.app_metadata?.provider || "email";
  const isGoogle = provider === "google";

  const doDelete = async () => {
    setDeleting(true); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not delete account.");
      await signOut();
      router.replace("/login");
    } catch (e) {
      setError(e.message);
      setDeleting(false);
    }
  };

  return (
    <div style={s.wrap}>
      <AccountTabs />

      <div style={s.card}>
        <h3 style={s.title}>Sign-in</h3>
        {isGoogle
          ? <div style={s.badge}>Connected with Google</div>
          : <div style={s.plain}>Signed in with email &amp; password ({user?.email})</div>}
        {!isGoogle && (
          <button style={s.secondaryBtn} onClick={async () => {
            await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + "/login" });
            alert("Password reset email sent to " + user.email);
          }}>Change password</button>
        )}
      </div>

      <div style={s.dangerZone}>
        <div>
          <div style={s.dangerTitle}>Delete account</div>
          <div style={s.dangerText}>Permanently delete your account and all your data. This can’t be undone.</div>
        </div>
        <button style={s.deleteBtn} onClick={() => setConfirming(true)}>Delete account</button>
      </div>

      {error && <p style={s.error}>{error}</p>}

      {confirming && (
        <div style={s.overlay} onClick={() => !deleting && setConfirming(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Delete your account?</h3>
            <p style={s.modalText}>This permanently deletes your Dapples account, profile, lists, applications and everything tied to it. This action cannot be undone.</p>
            {error && <p style={s.error}>{error}</p>}
            <div style={s.modalActions}>
              <button style={s.ghost} onClick={() => setConfirming(false)} disabled={deleting}>Cancel</button>
              <button style={s.deleteBtn} onClick={doDelete} disabled={deleting}>{deleting ? "Deleting…" : "Yes, delete my account"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  card: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "24px 26px", boxShadow: "var(--shadow-low)", maxWidth: 820, margin: "0 auto 18px" },
  title: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 14 },
  badge: { display: "inline-block", fontSize: 13, fontWeight: 600, color: "var(--status-sent-ink)", background: "var(--status-sent-bg)", padding: "8px 14px", borderRadius: "var(--radius-md)" },
  plain: { fontSize: 14, color: "var(--color-ink-mid)" },
  secondaryBtn: { display: "block", marginTop: 14, background: "transparent", color: "var(--color-ink-primary)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  dangerZone: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, maxWidth: 820, margin: "0 auto", background: "var(--color-ground-card)", border: "1px solid rgba(180,67,46,0.3)", borderRadius: "var(--radius-card)", padding: "20px 24px", flexWrap: "wrap" },
  dangerTitle: { fontSize: 15, fontWeight: 700, color: "var(--color-error)" },
  dangerText: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 3 },
  deleteBtn: { background: "var(--color-error)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "11px 20px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, textAlign: "center", marginTop: 14 },
  overlay: { position: "fixed", inset: 0, background: "rgba(43,39,34,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-popup)", padding: "28px 30px", maxWidth: 440, width: "100%" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 10 },
  modalText: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.6, marginBottom: 20 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" },
  ghost: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "11px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
