"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";

const STATUS = {
  new: "New", shortlisted: "Shortlisted", offered: "Offer sent", booked: "Booked",
  content_submitted: "Content submitted", completed: "Completed", declined: "Declined", withdrawn: "Withdrawn",
};

export default function HotelInboxPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    // RLS returns only applications to this hotel's own opportunities.
    const { data } = await supabase
      .from("applications")
      .select("id, status, creator_name, created_at, opportunity:opportunities ( title )")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={s.wrap}>
      <h1 style={s.title}>Inbox</h1>
      <p style={s.sub}>Your conversations with creators who’ve applied to your jobs.</p>

      {loading ? <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
        : rows.length === 0 ? <div style={s.empty}>No conversations yet. Applicants appear here as creators apply to your <Link href="/hotel/jobs" style={s.link}>jobs</Link>.</div>
        : (
          <div style={s.list}>
            {rows.map(r => (
              <Link key={r.id} href={`/hotel/inbox/${r.id}`} style={s.row}>
                <div style={s.logoFallback}>{(r.creator_name || "C")[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.rowName}>{r.creator_name || "Creator"}</div>
                  <div style={s.rowOpp}>{r.opportunity?.title}</div>
                </div>
                <span style={s.rowStatus}>{STATUS[r.status] || r.status}</span>
              </Link>
            ))}
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
  logoFallback: { width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 },
  rowName: { fontSize: 14.5, fontWeight: 700, color: "var(--color-ink-primary)" },
  rowOpp: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  rowStatus: { fontSize: 11.5, fontWeight: 700, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "5px 12px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap", flexShrink: 0 },
};
