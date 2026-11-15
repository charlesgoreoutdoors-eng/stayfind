"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";

// Same vocab the creator Preferences page writes into the profile.
const CATEGORIES = ["Travel", "Luxury Travel", "Adventure & Outdoor", "Family Travel", "Food & Drink", "Wellness & Spa", "Couples / Honeymoon", "Budget / Backpacking", "City / Urban", "Beach / Coastal", "Road Trips / Vanlife", "Photography", "Lifestyle", "Nature & Wildlife"];
const SERVICES = ["UGC", "Videography / Video Editing", "Photography / Photo Editing", "Reels / Short-form", "Blogging", "Stories / Live"];
const CREATOR_TYPES = ["Photographer", "Videographer", "Blogger", "Influencer", "Vlogger", "UGC Creator"];
const EXPERIENCE = ["Beginner", "Intermediate", "Advanced", "Professional"];

const asArr = (v) => (Array.isArray(v) ? v : []);

export default function HotelCreatorSearchPage() {
  const { user } = useAuth();
  const [creators, setCreators] = useState([]);
  const [ratings, setRatings] = useState({});     // creatorId -> { avg, n }
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [savedOnly, setSavedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [cats, setCats] = useState([]);
  const [svcs, setSvcs] = useState([]);
  const [creatorType, setCreatorType] = useState("");
  const [experience, setExperience] = useState("");
  const [freeStaysOnly, setFreeStaysOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      // RLS limits this to discoverable creators, and only hotels can read them.
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, first_name, last_name, headline, bio, avatar_url, city, state, country, content_categories, services, creator_type, experience_level, audience, open_to_gifting")
        .eq("discoverable", true)
        .order("full_name", { ascending: true });
      if (!active) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const rows = (data || []).filter(p => (p.full_name || p.first_name || p.headline));
      setCreators(rows);

      // Aggregate review ratings for the visible creators.
      const ids = rows.map(r => r.id);
      if (ids.length) {
        const { data: rv } = await supabase
          .from("reviews")
          .select("reviewee_id, rating")
          .in("reviewee_id", ids);
        const map = {};
        (rv || []).forEach(r => {
          const m = map[r.reviewee_id] || { sum: 0, n: 0 };
          m.sum += r.rating; m.n += 1; map[r.reviewee_id] = m;
        });
        const out = {};
        Object.entries(map).forEach(([id, m]) => { out[id] = { avg: m.sum / m.n, n: m.n }; });
        setRatings(out);
      }

      // Which of these the hotel has already saved.
      const { data: sv } = await supabase.from("saved_creators").select("creator_id");
      if (active) setSavedIds(new Set((sv || []).map(r => r.creator_id)));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [user]);

  const toggleSave = async (e, creatorId) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) return;
    const isSaved = savedIds.has(creatorId);
    // Optimistic update.
    setSavedIds(prev => { const n = new Set(prev); isSaved ? n.delete(creatorId) : n.add(creatorId); return n; });
    if (isSaved) {
      await supabase.from("saved_creators").delete().eq("creator_id", creatorId).eq("hotel_user_id", user.id);
    } else {
      await supabase.from("saved_creators").insert({ hotel_user_id: user.id, creator_id: creatorId });
    }
  };

  const toggle = (list, setList, val) =>
    setList(list.includes(val) ? list.filter(v => v !== val) : [...list, val]);

  const results = useMemo(() => {
    const kw = q.trim().toLowerCase();
    const loc = location.trim().toLowerCase();
    return creators.filter(p => {
      const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ");
      if (kw) {
        const hay = `${name} ${p.headline || ""} ${p.bio || ""}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      if (loc) {
        const where = [p.city, p.state, p.country].filter(Boolean).join(" ").toLowerCase();
        if (!where.includes(loc)) return false;
      }
      if (cats.length && !cats.some(c => asArr(p.content_categories).includes(c))) return false;
      if (svcs.length && !svcs.some(sv => asArr(p.services).includes(sv))) return false;
      if (creatorType && p.creator_type !== creatorType) return false;
      if (experience && p.experience_level !== experience) return false;
      if (freeStaysOnly && p.open_to_gifting !== true) return false;
      if (savedOnly && !savedIds.has(p.id)) return false;
      return true;
    });
  }, [creators, q, location, cats, svcs, creatorType, experience, freeStaysOnly, savedOnly, savedIds]);

  const activeCount = cats.length + svcs.length + (creatorType ? 1 : 0) + (experience ? 1 : 0) + (freeStaysOnly ? 1 : 0) + (location.trim() ? 1 : 0);
  const clearAll = () => { setQ(""); setLocation(""); setCats([]); setSvcs([]); setCreatorType(""); setExperience(""); setFreeStaysOnly(false); };

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <h1 style={s.title}>Find creators</h1>
        <p style={s.sub}>Search discoverable creators on Dapples and open a full profile to see their work.</p>
      </div>

      {/* Search bar */}
      <div style={s.searchRow}>
        <div style={s.searchBox}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
          <input style={s.searchInput} placeholder="Search by name, headline or bio…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div style={s.searchBox}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          <input style={s.searchInput} placeholder="Location…" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <button style={{ ...s.filterToggle, ...(savedOnly ? s.savedToggleOn : {}) }} onClick={() => setSavedOnly(v => !v)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={savedOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6, verticalAlign: "-2px" }}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          Saved{savedIds.size ? ` · ${savedIds.size}` : ""}
        </button>
        <button style={s.filterToggle} onClick={() => setShowFilters(v => !v)}>
          Filters{activeCount ? ` · ${activeCount}` : ""}
        </button>
      </div>

      {showFilters && (
        <div style={s.filters}>
          <FilterGroup label="Content categories">
            <Chips options={CATEGORIES} selected={cats} onToggle={v => toggle(cats, setCats, v)} />
          </FilterGroup>
          <FilterGroup label="Services">
            <Chips options={SERVICES} selected={svcs} onToggle={v => toggle(svcs, setSvcs, v)} />
          </FilterGroup>
          <div style={s.selectRow}>
            <FilterGroup label="Creator type">
              <select style={s.select} value={creatorType} onChange={e => setCreatorType(e.target.value)}>
                <option value="">Any type</option>
                {CREATOR_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FilterGroup>
            <FilterGroup label="Experience">
              <select style={s.select} value={experience} onChange={e => setExperience(e.target.value)}>
                <option value="">Any level</option>
                {EXPERIENCE.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </FilterGroup>
            <FilterGroup label="Availability">
              <label style={s.check}>
                <input type="checkbox" checked={freeStaysOnly} onChange={e => setFreeStaysOnly(e.target.checked)} style={{ accentColor: "var(--color-action-forest)" }} />
                <span>Open to free stays</span>
              </label>
            </FilterGroup>
          </div>
          {activeCount > 0 && <button style={s.clearBtn} onClick={clearAll}>Clear filters</button>}
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading creators…</div>
      ) : error ? (
        <div style={s.errorBox}>{error}</div>
      ) : results.length === 0 ? (
        <div style={s.empty}>
          <div style={s.emptyTitle}>No creators match your filters</div>
          <div style={s.emptySub}>{creators.length === 0 ? "No discoverable creators yet." : "Try removing a filter or searching more broadly."}</div>
        </div>
      ) : (
        <>
          <div style={s.count}>{results.length} creator{results.length === 1 ? "" : "s"}</div>
          <div style={s.grid}>
            {results.map(p => {
              const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "Creator";
              const where = [p.city, p.state, p.country].filter(Boolean).join(", ");
              const r = ratings[p.id];
              const cats2 = asArr(p.content_categories).slice(0, 3);
              return (
                <Link key={p.id} href={`/hotel/creators/view/${p.id}`} style={s.cardLink}>
                  <button
                    style={{ ...s.heart, ...(savedIds.has(p.id) ? s.heartOn : {}) }}
                    onClick={e => toggleSave(e, p.id)}
                    aria-label={savedIds.has(p.id) ? "Remove from saved" : "Save creator"}
                    title={savedIds.has(p.id) ? "Saved" : "Save"}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={savedIds.has(p.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                  </button>
                  <div style={s.cardTop}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} alt="" style={s.avatar} />
                      : <div style={s.avatarFallback}>{name[0]?.toUpperCase() || "C"}</div>}
                    <div style={{ minWidth: 0, flex: 1, paddingRight: 30 }}>
                      <div style={s.cardName}>{name}</div>
                      {p.headline && <div style={s.cardHeadline}>{p.headline}</div>}
                      <div style={s.cardMeta}>
                        {where && <span style={s.metaLoc}>📍 {where}</span>}
                        {r
                          ? <span style={s.metaRating}>★ {r.avg.toFixed(1)} <span style={s.metaRatingN}>({r.n})</span></span>
                          : <span style={s.metaMuted}>No reviews</span>}
                      </div>
                    </div>
                  </div>
                  {(cats2.length > 0 || p.open_to_gifting === true) && (
                    <div style={s.pills}>
                      {cats2.map(c => <span key={c} style={s.pill}>{c}</span>)}
                      {p.open_to_gifting === true && <span style={s.pillGreen}>Free stays</span>}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={s.fg}>
      <div style={s.fgLabel}>{label}</div>
      {children}
    </div>
  );
}
function Chips({ options, selected, onToggle }) {
  return (
    <div style={s.chips}>
      {options.map(o => {
        const on = selected.includes(o);
        return <button key={o} style={{ ...s.chip, ...(on ? s.chipOn : {}) }} onClick={() => onToggle(o)}>{o}</button>;
      })}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 1080, margin: "0 auto", padding: "40px 24px 64px" },
  head: { marginBottom: 22 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, lineHeight: 1.55 },

  searchRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  searchBox: { flex: "1 1 240px", display: "flex", alignItems: "center", gap: 10, border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0 14px", background: "var(--color-ground-card)" },
  searchInput: { flex: 1, border: "none", outline: "none", padding: "12px 0", fontSize: 14, fontFamily: "inherit", background: "transparent", color: "var(--color-ink-primary)" },
  filterToggle: { border: "1.5px solid var(--color-border)", background: "var(--color-ground-card)", borderRadius: "var(--radius-md)", padding: "0 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", color: "var(--color-ink-primary)", fontFamily: "inherit" },
  savedToggleOn: { color: "var(--color-accent-amber-deep)", borderColor: "var(--color-accent-amber)", background: "rgba(224,149,74,0.10)" },

  filters: { background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "18px 20px", marginBottom: 22, boxShadow: "var(--shadow-low)" },
  fg: { marginBottom: 16 },
  fgLabel: { fontSize: 12, fontWeight: 700, color: "var(--color-ink-muted)", textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 8 },
  selectRow: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 },
  select: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 12px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none", background: "var(--color-ground-card)" },
  check: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--color-ink-primary)", cursor: "pointer", paddingTop: 8 },
  clearBtn: { marginTop: 4, background: "none", border: "none", color: "var(--color-error)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 },

  chips: { display: "flex", flexWrap: "wrap", gap: 7 },
  chip: { border: "1.5px solid var(--color-border)", background: "var(--color-ground-card)", color: "var(--color-ink-mid)", borderRadius: "var(--radius-pill)", padding: "6px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  chipOn: { background: "var(--status-success-bg)", color: "var(--status-success-ink)", borderColor: "transparent" },

  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },
  errorBox: { background: "var(--status-error-bg)", color: "var(--color-error)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 14 },
  empty: { textAlign: "center", padding: "56px 20px", border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)", background: "var(--color-ground-card)" },
  emptyTitle: { fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--color-ink-primary)" },
  emptySub: { fontSize: 13.5, color: "var(--color-ink-muted)", marginTop: 6 },

  count: { fontSize: 13, fontWeight: 600, color: "var(--color-ink-muted)", marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  cardLink: { position: "relative", display: "flex", flexDirection: "column", gap: 12, background: "var(--color-ground-card)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-card)", padding: "16px 18px", textDecoration: "none", boxShadow: "var(--shadow-low)", transition: "border-color .12s, transform .12s" },
  heart: { position: "absolute", top: 10, right: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "1px solid var(--color-border)", background: "var(--color-ground-card)", color: "var(--color-ink-muted)", cursor: "pointer", padding: 0, zIndex: 2 },
  heartOn: { color: "var(--color-accent-amber-deep)", borderColor: "var(--color-accent-amber)", background: "rgba(224,149,74,0.12)" },
  cardTop: { display: "flex", gap: 13, alignItems: "flex-start" },
  avatar: { width: 54, height: 54, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)", flexShrink: 0 },
  avatarFallback: { width: 54, height: 54, borderRadius: "50%", background: "var(--color-action-forest)", color: "var(--color-ground-page)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0, fontFamily: "var(--font-display)" },
  cardName: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardHeadline: { fontSize: 13, color: "var(--color-ink-mid)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  cardMeta: { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 7 },
  metaLoc: { fontSize: 12, color: "var(--color-ink-mid)", fontWeight: 600 },
  metaRating: { fontSize: 12.5, fontWeight: 700, color: "var(--color-accent-amber-deep)" },
  metaRatingN: { fontWeight: 500, color: "var(--color-ink-muted)" },
  metaMuted: { fontSize: 12, color: "var(--color-ink-muted)" },
  pills: { display: "flex", flexWrap: "wrap", gap: 6 },
  pill: { fontSize: 11.5, fontWeight: 600, color: "var(--color-ink-mid)", background: "var(--color-ground-sand)", padding: "3px 10px", borderRadius: "var(--radius-pill)" },
  pillGreen: { fontSize: 11.5, fontWeight: 600, color: "var(--status-success-ink)", background: "var(--status-success-bg)", padding: "3px 10px", borderRadius: "var(--radius-pill)" },
};
