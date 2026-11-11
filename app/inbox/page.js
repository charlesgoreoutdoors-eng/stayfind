"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

const STATUS = {
  new: "Applied", shortlisted: "Shortlisted", offered: "Offer received", booked: "Booked",
  content_submitted: "Content submitted", completed: "Completed", declined: "Declined", withdrawn: "Withdrawn",
};

export default function CreatorInboxPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("applications")
      .select("id, status, created_at, opportunity:opportunities ( title, hotel:hotel_profiles ( name, logo_url ) )")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={s.wrap}>
      <h1 style={s.title}>Inbox</h1>
      <p style={s.sub}>Your conversations with hotels about the collabs you’ve applied to.</p>

      {loading ? <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
        : rows.length === 0 ? <div style={s.empty}>No conversations yet. Apply to opportunities on the <Link href="/jobs" style={s.link}>Job Board</Link> to start one.</div>
        : (
          <div style={s.list}>
            {rows.map(r => {
              const hotel = r.opportunity?.hotel || {};
              return (
                <Link key={r.id} href={`/inbox/${r.id}`} style={s.row}>
                  {hotel.logo_url ? <img src={hotel.logo_url} alt="" style={s.logo} /> : <div style={s.logoFallback}>{(hotel.name || "H")[0]}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.rowName}>{hotel.name || "Hotel"}</div>
                    <div style={s.rowOpp}>{r.opportunity?.title}</div>
                  </div>
                  <span style={s.rowStatus}>{STATUS[r.status] || r.status}</span>
                </Link>
              );
            })}
          </div>
        )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 760, margin: "0 auto", padding: "40px 24px 64px" },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14.5, color: "var(--color-ink-muted)", marginTop: 6, marginBottom: 22 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "30px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  empty: { background: "var(--color-ground-card)", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", padding: "40px 24px", textAlign: "center", color: "var(--color-ink-muted)", fontSize: 14 },
  link: { color: "var(--color-accent-amber-deep)", fontWeight: 700, textDecoration: "none" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "flex", alignItems: "center", gap: 14, background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "14px 16px", textDecoration: "none", boxShadow: "var(--shadow-low)" },
  logo: { width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0, border: "1px solid var(--color-border)" },
  logoFallback: { width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 },
  rowName: { fontSize: 14.5, fontWeight: 700, color: "var(--color-ink-primary)" },
  rowOpp: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowStatus: { fontSize: 11.5, fontWeight: 700, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "5px 12px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap", flexShrink: 0 },
};
