"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";

const asArr = (v) => (Array.isArray(v) ? v : []);

export default function HotelSavedCreatorsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);       // { creator_id, created_at, profile }
  const [ratings, setRatings] = useState({}); // creatorId -> { avg, n }
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Saved rows with the creator profile embedded (RLS still applies to the
    // embedded profile, so a creator who turned off discovery comes back null).
    const { data } = await supabase
      .from("saved_creators")
      .select("creator_id, created_at, profile:profiles ( id, full_name, first_name, last_name, headline, avatar_url, city, state, country, content_categories, open_to_gifting )")
      .order("created_at", { ascending: false });
    const list = data || [];
    setRows(list);

    const ids = list.map(r => r.creator_id);
    if (ids.length) {
      const { data: rv } = await supabase.from("reviews").select("reviewee_id, rating").in("reviewee_id", ids);
      const map = {};
      (rv || []).forEach(r => { const m = map[r.reviewee_id] || { sum: 0, n: 0 }; m.sum += r.rating; m.n += 1; map[r.reviewee_id] = m; });
      const out = {};
      Object.entries(map).forEach(([id, m]) => { out[id] = { avg: m.sum / m.n, n: m.n }; });
      setRatings(out);
    } else {
      setRatings({});
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const remove = async (creatorId) => {
    setRemoving(creatorId);
    const { error } = await supabase.from("saved_creators").delete().eq("creator_id", creatorId).eq("hotel_user_id", user.id);
    setRemoving(null);
    if (!error) setRows(prev => prev.filter(r => r.creator_id !== creatorId));
  };

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <h1 style={s.title}>Saved creators</h1>
        <p style={s.sub}>Creators you’ve bookmarked from search. Open a profile to message or invite them to a job.</p>
      </div>

      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : rows.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyTitle}>No saved creators yet</div>
          <div style={s.emptySub}>Tap the bookmark on a creator in <Link href="/hotel/search" style={s.link}>Find creators</Link> to save them here.</div>
        </div>
      ) : (
        <div style={s.list}>
          {rows.map(r => {
            const p = r.profile;
            const creatorId = r.creator_id;
            if (!p) {
              return (
                <div key={creatorId} style={s.row}>
                  <div style={s.avatarFallback}>?</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.name}>Creator unavailable</div>
                    <div style={s.meta}>This creator turned off discovery.</div>
                  </div>
                  <button style={s.removeBtn} onClick={() => remove(creatorId)} disabled={removing === creatorId}>Remove</button>
                </div>
              );
            }
            const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Creator";
            const where = [p.city, p.state, p.country].filter(Boolean).join(", ");
            const rt = ratings[creatorId];
            const cats = asArr(p.content_categories).slice(0, 2);
            return (
              <div key={creatorId} style={s.row}>
                <Link href={`/hotel/creators/view/${creatorId}`} style={s.rowMain}>
                  {p.avatar_url
                    ? <img src={p.avatar_url} alt="" style={s.avatar} />
                    : <div style={s.avatarFallback}>{name[0]?.toUpperCase() || "C"}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={s.name}>{name}</div>
                    {p.headline && <div style={s.headline}>{p.headline}</div>}
                    <div style={s.meta}>
                      {where && <span style={s.metaLoc}>📍 {where}</span>}
                      {rt
                        ? <span style={s.metaRating}>★ {rt.avg.toFixed(1)} <span style={s.metaRatingN}>({rt.n})</span></span>
                        : <span style={s.metaMuted}>No reviews</span>}
                      {p.open_to_gifting === true && <span style={s.freePill}>Free stays</span>}
                      {cats.map(c => <span key={c} style={s.pill}>{c}</span>)}
                    </div>
                  </div>
                </Link>
                <div style={s.rowActions}>
                  <Link href={`/hotel/creators/view/${creatorId}`} style={s.viewBtn}>View</Link>
                  <button style={s.removeBtn} onClick={() => remove(creatorId)} disabled={removing === creatorId}>
                    {removing === creatorId ? "…" : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: "40px 24px 64px" },
  head: { marginBottom: 22 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, lineHeight: 1.55 },

  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },

  empty: { textAlign: "center", padding: "56px 20px", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", background: "var(--color-ground-card)" },
  emptyTitle: { fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--color-ink-primary)" },
  emptySub: { fontSize: 13.5, color: "var(--color-ink-muted)", marginTop: 6 },
  link: { color: "var(--color-accent-amber-deep)", fontWeight: 700, textDecoration: "none" },

  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "flex", alignItems: "center", gap: 14, background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "14px 16px", boxShadow: "var(--shadow-low)" },
  rowMain: { display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0, textDecoration: "none" },
  avatar: { width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)", flexShrink: 0 },
  avatarFallback: { width: 48, height: 48, borderRadius: "50%", background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-display)" },
  name: { fontFamily: "var(--font-display)", fontSize: 15.5, fontWeight: 700, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  headline: { fontSize: 13, color: "var(--color-ink-mid)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  meta: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 },
  metaLoc: { fontSize: 12, color: "var(--color-ink-mid)", fontWeight: 600 },
  metaRating: { fontSize: 12, fontWeight: 700, color: "var(--color-accent-amber-deep)" },
  metaRatingN: { fontWeight: 500, color: "var(--color-ink-muted)" },
  metaMuted: { fontSize: 12, color: "var(--color-ink-muted)" },
  freePill: { fontSize: 11, fontWeight: 600, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "2px 9px", borderRadius: "var(--radius-pill)" },
  pill: { fontSize: 11, fontWeight: 600, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "2px 9px", borderRadius: "var(--radius-pill)" },

  rowActions: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  viewBtn: { padding: "8px 14px", background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", textDecoration: "none" },
  removeBtn: { padding: "8px 12px", background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
