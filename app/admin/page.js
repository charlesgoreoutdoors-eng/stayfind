"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

const ADMIN_EMAIL = "chgore618@gmail.com";

const PROPERTY_KEYWORDS = {
  hotels:     ["hotel"],
  vacation:   ["vacation rental", "luxury villa", "boutique guesthouse", "glamping"],
  apartments: ["serviced apartment", "aparthotel", "extended stay", "furnished apartment"],
};
const PROPERTY_OPTIONS = [
  { value: "hotels",     label: "Hotels" },
  { value: "vacation",   label: "Vacation Rentals" },
  { value: "apartments", label: "Apartments" },
  { value: "all",        label: "All Three" },
];
const PLANS = ["spark", "glow", "radiant", "founding"];
const PER_PAGE = 20;

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [data, setData]         = useState(null);
  const [token, setToken]       = useState("");

  // user table state
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [planEdits, setPlanEdits] = useState({}); // userId -> plan
  const [savingId, setSavingId] = useState(null);

  // pre-cache state
  const [cities, setCities]     = useState("");
  const [propType, setPropType] = useState("hotels");
  const [caching, setCaching]   = useState(false);
  const [cacheProgress, setCacheProgress] = useState([]); // { city, status, count }

  // clear cache modal
  const [showClear, setShowClear] = useState(false);
  const [clearing, setClearing]   = useState(false);

  // ── Access control ──────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      router.replace("/");
      return;
    }
    setAuthorized(true);
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authorized) return;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const t = sessionData?.session?.access_token || "";
      setToken(t);
      await loadData(t);
    })();
  }, [authorized]);

  const loadData = async (t) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", { headers: { Authorization: `Bearer ${t}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Plan update ─────────────────────────────────────────────────
  const savePlan = async (u) => {
    const newPlan = planEdits[u.id] ?? u.plan;
    if (newPlan === u.plan) return;
    setSavingId(u.id);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "updatePlan", userId: u.id, plan: newPlan }),
      });
      if (!res.ok) throw new Error("Failed");
      setData(prev => ({ ...prev, users: prev.users.map(x => x.id === u.id ? { ...x, plan: newPlan } : x) }));
      setPlanEdits(prev => { const n = { ...prev }; delete n[u.id]; return n; });
    } catch {
      alert("Could not update plan.");
    } finally {
      setSavingId(null);
    }
  };

  // ── Pre-cache tool ──────────────────────────────────────────────
  const startCaching = async () => {
    const list = cities.split("\n").map(c => c.trim()).filter(Boolean);
    if (list.length === 0) return;
    setCaching(true);
    setCacheProgress(list.map(c => ({ city: c, status: "pending", count: 0 })));

    const types = propType === "all" ? ["hotels", "vacation", "apartments"] : [propType];
    const keywords = types.flatMap(t => PROPERTY_KEYWORDS[t]);

    for (let i = 0; i < list.length; i++) {
      const city = list[i];
      setCacheProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "active" } : p));
      try {
        let total = 0;
        for (const kw of keywords) {
          const res = await fetch(`/api/hotels?query=${encodeURIComponent(city)}&keyword=${encodeURIComponent(kw)}`);
          const json = await res.json();
          total += (json.hotels || []).length;
        }
        setCacheProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "done", count: total } : p));
      } catch {
        setCacheProgress(prev => prev.map((p, idx) => idx === i ? { ...p, status: "error" } : p));
      }
    }
    setCaching(false);
    await loadData(token); // refresh cache stats
  };

  // ── Clear caches ────────────────────────────────────────────────
  const clearCaches = async () => {
    setClearing(true);
    try {
      await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "clearCaches" }),
      });
      setShowClear(false);
      await loadData(token);
    } finally {
      setClearing(false);
    }
  };

  // ── Filtered + paginated users ──────────────────────────────────
  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(u =>
      (u.email || "").toLowerCase().includes(q) || (u.name || "").toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageUsers = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  useEffect(() => { setPage(1); }, [search]);

  if (authLoading || !authorized) {
    return <div style={s.center}><div style={s.spinner} /></div>;
  }

  return (
    <div style={s.root}>
      <div style={s.headerRow}>
        <h1 style={s.h1}>Admin Dashboard</h1>
        <button style={s.refreshBtn} onClick={() => loadData(token)} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {/* ── OVERVIEW STATS ── */}
      <div style={s.statsGrid}>
        {[
          { label: "Total Users",        value: data?.stats.totalUsers,      accent: true },
          { label: "New This Week",      value: data?.stats.newThisWeek },
          { label: "New This Month",     value: data?.stats.newThisMonth },
          { label: "Lists Created",      value: data?.stats.totalLists },
          { label: "Hotels Saved",       value: data?.stats.totalHotels },
          { label: "Active Sequences",   value: data?.stats.activeSequences },
          { label: "Emails Sent",        value: data?.stats.emailsSent },
        ].map((c, i) => (
          <div key={i} style={s.statCard}>
            <p style={{ ...s.statValue, color: c.accent ? "#E85D3D" : "#0F2544" }}>
              {loading || data == null ? "—" : (c.value ?? 0).toLocaleString()}
            </p>
            <p style={s.statLabel}>{c.label}</p>
          </div>
        ))}
      </div>

      {/* ── USER TABLE ── */}
      <section style={s.section}>
        <div style={s.sectionHead}>
          <h2 style={s.h2}>Users {data && <span style={s.countPill}>{filtered.length}</span>}</h2>
          <input
            style={s.searchInput}
            placeholder="Search by email or name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Email", "Name", "Plan", "Joined", "Lists", "Hotels", ""].map((h, i) => (
                  <th key={i} style={{ ...s.th, textAlign: i >= 4 && i <= 5 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageUsers.map(u => {
                const edited = planEdits[u.id] ?? u.plan;
                const dirty = edited !== u.plan;
                return (
                  <tr key={u.id} style={s.tr}>
                    <td style={s.td}>{u.email}</td>
                    <td style={{ ...s.td, color: u.name ? "#1E3A5F" : "#9FB3C8" }}>{u.name || "—"}</td>
                    <td style={s.td}>
                      <select
                        style={s.planSelect}
                        value={edited}
                        onChange={e => setPlanEdits(prev => ({ ...prev, [u.id]: e.target.value }))}
                      >
                        {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td style={{ ...s.td, color: "#64748b" }}>
                      {u.joined ? new Date(u.joined).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>{u.lists}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>{u.hotels}</td>
                    <td style={{ ...s.td, textAlign: "right" }}>
                      {dirty && (
                        <button style={s.saveBtn} onClick={() => savePlan(u)} disabled={savingId === u.id}>
                          {savingId === u.id ? "…" : "Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && pageUsers.length === 0 && (
                <tr><td colSpan={7} style={{ ...s.td, textAlign: "center", color: "#9FB3C8", padding: 32 }}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={s.pagination}>
            <button style={s.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
            <span style={s.pageInfo}>Page {page} of {totalPages}</span>
            <button style={s.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
          </div>
        )}
      </section>

      {/* ── PRE-CACHE TOOL ── */}
      <section style={s.section}>
        <h2 style={s.h2}>Pre-Cache Cities</h2>
        <p style={s.helpText}>Paste city names (one per line). Each will be searched and cached to reduce API costs for users.</p>
        <div style={s.cacheControls}>
          <textarea
            style={s.textarea}
            placeholder={"New York\nLos Angeles\nMiami\nLondon\nParis"}
            value={cities}
            onChange={e => setCities(e.target.value)}
            disabled={caching}
          />
          <div style={s.cacheSide}>
            <label style={s.label}>Property type</label>
            <select style={s.fullSelect} value={propType} onChange={e => setPropType(e.target.value)} disabled={caching}>
              {PROPERTY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button style={{ ...s.primaryBtn, opacity: caching ? 0.6 : 1 }} onClick={startCaching} disabled={caching}>
              {caching ? "Caching…" : "Start Caching"}
            </button>
            {caching && (
              <p style={s.progressText}>
                Caching {cacheProgress.filter(p => p.status === "done" || p.status === "error").length + 1} of {cacheProgress.length}
              </p>
            )}
          </div>
        </div>

        {cacheProgress.length > 0 && (
          <div style={s.progressList}>
            {cacheProgress.map((p, i) => (
              <div key={i} style={s.progressRow}>
                <span style={s.progressIcon}>
                  {p.status === "done" ? <span style={{ color: "#16a34a" }}>✓</span>
                    : p.status === "error" ? <span style={{ color: "#ef4444" }}>✕</span>
                    : p.status === "active" ? <span style={s.miniSpinner} />
                    : <span style={{ color: "#9FB3C8" }}>•</span>}
                </span>
                <span style={s.progressCity}>{p.city}</span>
                {p.status === "done" && <span style={s.progressCount}>{p.count} cached</span>}
                {p.status === "error" && <span style={{ ...s.progressCount, color: "#ef4444" }}>failed</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── CACHE STATS ── */}
      <section style={s.section}>
        <div style={s.sectionHead}>
          <h2 style={s.h2}>Cache</h2>
          <button style={s.dangerBtn} onClick={() => setShowClear(true)}>Clear All Caches</button>
        </div>
        <div style={s.cacheStatsGrid}>
          {[
            { label: "Search Cache",     value: data?.cache.searchCount },
            { label: "Instagram Cache",  value: data?.cache.instagramCount },
            { label: "Email Cache",      value: data?.cache.emailCount },
            { label: "Oldest Entry",     value: data?.cache.oldest ? new Date(data.cache.oldest).toLocaleDateString() : "—", isDate: true },
            { label: "Newest Entry",     value: data?.cache.newest ? new Date(data.cache.newest).toLocaleDateString() : "—", isDate: true },
          ].map((c, i) => (
            <div key={i} style={s.statCard}>
              <p style={{ ...s.statValue, fontSize: c.isDate ? 18 : 28 }}>
                {loading || data == null ? "—" : (c.isDate ? c.value : (c.value ?? 0).toLocaleString())}
              </p>
              <p style={s.statLabel}>{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HUNTER.IO USAGE ── */}
      <section style={s.section}>
        <div style={s.sectionHead}>
          <h2 style={s.h2}>Hunter.io Usage</h2>
        </div>
        <div style={s.cacheStatsGrid}>
          {[
            { label: "Total Searches",          value: data?.hunter?.totalSearches },
            { label: "API Calls This Month",     value: data?.hunter?.apiCallsThisMonth },
            { label: "Cache Hits This Month",    value: data?.hunter?.searchesThisMonth != null && data?.hunter?.apiCallsThisMonth != null ? (data.hunter.searchesThisMonth - data.hunter.apiCallsThisMonth) : null },
            { label: "Cache Hit Rate",           value: data?.hunter?.cacheHitRate != null ? `${data.hunter.cacheHitRate}%` : null, isStr: true },
            { label: "Total Contacts Found",     value: data?.hunter?.contactsFound },
            { label: "Credits Saved by Cache",   value: data?.hunter?.creditsSavedByCache, note: "at $0.01/credit" },
          ].map((c, i) => (
            <div key={i} style={s.statCard}>
              <p style={{ ...s.statValue, fontSize: c.isStr ? 22 : 28 }}>
                {loading || data == null ? "—" : (c.value ?? 0).toLocaleString?.() ?? c.value ?? 0}
              </p>
              <p style={s.statLabel}>{c.label}</p>
              {c.note && <p style={{ fontSize:10, color:"#C4C4C4", marginTop:2 }}>{c.note}</p>}
            </div>
          ))}
        </div>

        {/* Recent searches table */}
        {data?.hunter?.recentSearches?.length > 0 && (
          <div style={{ ...s.tableWrap, marginTop: 20 }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Domain", "Type", "Contacts Found", "User", "Date"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.hunter.recentSearches.map((row, i) => (
                  <tr key={i} style={s.tr}>
                    <td style={s.td}>{row.domain}</td>
                    <td style={s.td}>
                      {row.cache_hit
                        ? <span style={{ fontSize:11, fontWeight:700, background:"#dcfce7", color:"#166534", padding:"2px 9px", borderRadius:20 }}>Cached</span>
                        : <span style={{ fontSize:11, fontWeight:700, background:"#dbeafe", color:"#1d4ed8", padding:"2px 9px", borderRadius:20 }}>API Call</span>
                      }
                    </td>
                    <td style={s.td}>{row.contacts_found ?? 0}</td>
                    <td style={{ ...s.td, fontSize:12, color:"#9FB3C8" }}>{row.user_email}</td>
                    <td style={{ ...s.td, fontSize:12, color:"#9FB3C8" }}>{row.searched_at ? new Date(row.searched_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── CLEAR CONFIRM MODAL ── */}
      {showClear && (
        <div style={s.overlay} onClick={() => !clearing && setShowClear(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Clear all caches?</h3>
            <p style={s.modalText}>This permanently deletes every entry in the search, Instagram, and email caches. Users' next searches will hit the live APIs and cost money.</p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setShowClear(false)} disabled={clearing}>Cancel</button>
              <button style={s.dangerBtn} onClick={clearCaches} disabled={clearing}>
                {clearing ? "Clearing…" : "Clear Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { padding: "32px 24px 80px", maxWidth: 1100, margin: "0 auto" },
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh" },
  spinner: { width: 28, height: 28, border: "3px solid #F0EBE5", borderTopColor: "#E85D3D", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  miniSpinner: { display: "inline-block", width: 12, height: 12, border: "2px solid #F0EBE5", borderTopColor: "#E85D3D", borderRadius: "50%", animation: "spin 0.8s linear infinite" },

  headerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: 700, color: "#0F2544", letterSpacing: "-0.4px" },
  refreshBtn: { padding: "8px 16px", background: "#fff", border: "1px solid #DDD5CC", borderRadius: 9, fontSize: 13, fontWeight: 600, color: "#4A6A8A", cursor: "pointer" },
  errorBox: { background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", padding: "12px 16px", borderRadius: 10, fontSize: 13, marginBottom: 20 },

  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 32 },
  statCard: { background: "#fff", borderRadius: 14, border: "1px solid #DDD5CC", padding: "18px 20px" },
  statValue: { fontSize: 28, fontWeight: 700, color: "#0F2544", letterSpacing: "-0.5px", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "#9FB3C8", fontWeight: 500 },

  section: { background: "#fff", borderRadius: 16, border: "1px solid #DDD5CC", padding: "22px 24px", marginBottom: 28 },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" },
  h2: { fontSize: 16, fontWeight: 700, color: "#0F2544", display: "flex", alignItems: "center", gap: 8 },
  countPill: { fontSize: 12, fontWeight: 600, background: "#F0EBE5", color: "#4A6A8A", padding: "2px 9px", borderRadius: 20 },
  searchInput: { padding: "9px 14px", border: "1px solid #DDD5CC", borderRadius: 9, fontSize: 13, color: "#1E3A5F", width: 260, maxWidth: "100%" },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: { fontSize: 11, fontWeight: 700, color: "#9FB3C8", letterSpacing: "0.4px", textTransform: "uppercase", padding: "0 12px 10px", borderBottom: "1px solid #F0EBE5" },
  tr: { borderBottom: "1px solid #F8F4F0" },
  td: { fontSize: 13, color: "#1E3A5F", padding: "12px", verticalAlign: "middle" },
  planSelect: { padding: "5px 8px", border: "1px solid #DDD5CC", borderRadius: 7, fontSize: 12, color: "#1E3A5F", textTransform: "capitalize", cursor: "pointer", background: "#fff" },
  saveBtn: { padding: "5px 12px", background: "#E85D3D", color: "#fff", border: "none", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" },

  pagination: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 18 },
  pageBtn: { padding: "7px 16px", background: "#fff", border: "1px solid #DDD5CC", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#4A6A8A", cursor: "pointer" },
  pageInfo: { fontSize: 13, color: "#64748b", fontWeight: 500 },

  helpText: { fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 16 },
  cacheControls: { display: "flex", gap: 16, flexWrap: "wrap" },
  textarea: { flex: "1 1 320px", minHeight: 150, padding: "12px 14px", border: "1px solid #DDD5CC", borderRadius: 10, fontSize: 13, color: "#1E3A5F", resize: "vertical", lineHeight: 1.7, fontFamily: "inherit" },
  cacheSide: { display: "flex", flexDirection: "column", gap: 10, width: 220 },
  label: { fontSize: 12, fontWeight: 600, color: "#1E3A5F" },
  fullSelect: { padding: "9px 12px", border: "1px solid #DDD5CC", borderRadius: 9, fontSize: 13, color: "#1E3A5F", background: "#fff", cursor: "pointer" },
  primaryBtn: { padding: "11px 16px", background: "#E85D3D", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" },
  progressText: { fontSize: 12, color: "#9FB3C8", textAlign: "center" },

  progressList: { marginTop: 20, borderTop: "1px solid #F0EBE5", paddingTop: 14, display: "flex", flexDirection: "column", gap: 2 },
  progressRow: { display: "flex", alignItems: "center", gap: 10, padding: "7px 0" },
  progressIcon: { width: 16, display: "flex", justifyContent: "center", fontSize: 13, fontWeight: 700 },
  progressCity: { fontSize: 13, color: "#1E3A5F", fontWeight: 500, flex: 1 },
  progressCount: { fontSize: 12, color: "#16a34a", fontWeight: 600 },

  cacheStatsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 },

  overlay: { position: "fixed", inset: 0, background: "rgba(15,37,68,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 },
  modal: { background: "#fff", borderRadius: 16, padding: 28, maxWidth: 400, width: "100%" },
  modalTitle: { fontSize: 17, fontWeight: 700, color: "#0F2544", marginBottom: 8 },
  modalText: { fontSize: 13, color: "#64748b", lineHeight: 1.6, marginBottom: 20 },
  modalActions: { display: "flex", gap: 10, justifyContent: "flex-end" },
  cancelBtn: { padding: "10px 18px", border: "1.5px solid #DDD5CC", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 500, color: "#4A6A8A", cursor: "pointer" },
  dangerBtn: { padding: "10px 18px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
