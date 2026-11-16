"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

function ago(iso) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// Unread messages from hotels, shown on both creator dashboards.
export default function NewMessagesCard() {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState(null);   // null = loading
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      const { data, count } = await supabase
        .from("messages")
        .select("id, application_id, body, created_at, application:applications ( opportunity:opportunities ( title, hotel:hotel_profiles ( name ) ) )", { count: "exact" })
        .is("read_at", null)
        .neq("sender_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (!active) return;
      // One row per conversation (latest message), newest first.
      const seen = new Set();
      const perThread = (data || []).filter(m => !seen.has(m.application_id) && seen.add(m.application_id));
      setMsgs(perThread.slice(0, 4));
      setTotal(count || 0);
    })();
    return () => { active = false; };
  }, [user]);

  if (msgs === null) return null;

  return (
    <div style={s.card}>
      <div style={s.head}>
        <h2 style={s.title}>New messages {total > 0 && <span style={s.badge}>{total}</span>}</h2>
        <Link href="/inbox" style={s.link}>Open inbox</Link>
      </div>
      {msgs.length === 0 ? (
        <p style={s.empty}>You’re all caught up — no new messages.</p>
      ) : msgs.map(m => {
        const opp = m.application?.opportunity;
        return (
          <Link key={m.id} href={`/inbox/${m.application_id}`} style={s.row}>
            <span style={s.dot} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={s.name}>{opp?.hotel?.name || "Hotel"} <span style={s.opp}>· {opp?.title}</span></p>
              <p style={s.preview}>{m.body}</p>
            </div>
            <span style={s.time}>{ago(m.created_at)}</span>
          </Link>
        );
      })}
    </div>
  );
}

const s = {
  card: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-low)", padding: "20px 22px" },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--color-ink-primary)", display: "flex", alignItems: "center", gap: 8 },
  badge: { fontSize: 11, fontWeight: 700, background: "var(--color-accent-terracotta)", color: "#fff", borderRadius: "var(--radius-pill)", padding: "2px 8px" },
  link: { fontSize: 12, color: "var(--color-accent-amber-deep)", fontWeight: 700, textDecoration: "none" },
  empty: { fontSize: 13, color: "var(--color-ink-muted)", padding: "6px 0" },
  row: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(43,39,34,0.07)", textDecoration: "none" },
  dot: { width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent-terracotta)", flexShrink: 0 },
  name: { fontSize: 13, fontWeight: 700, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  opp: { fontWeight: 500, color: "var(--color-ink-muted)" },
  preview: { fontSize: 12, color: "var(--color-ink-mid)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 },
  time: { fontSize: 11, color: "var(--color-ink-muted)", flexShrink: 0 },
};
