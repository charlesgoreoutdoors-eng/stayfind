"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

function StatCard({ label, value, sub, color = "#0F2544", icon }) {
  return (
    <div style={s.statCard}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
        <div>
          <p style={s.statLabel}>{label}</p>
          <p style={{ ...s.statValue, color }}>{value}</p>
          {sub && <p style={s.statSub}>{sub}</p>}
        </div>
        <div style={{ ...s.statIcon, background: color + "15" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={icon}/>
          </svg>
        </div>
      </div>
    </div>
  );
}

function SimpleBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={s.barRow}>
      <div style={s.barLabel}>{label}</div>
      <div style={s.barTrack}>
        <div style={{ ...s.barFill, width: `${pct}%`, background: color }} />
      </div>
      <div style={s.barValue}>{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLists: 0,
    totalHotels: 0,
    hotelsWithEmail: 0,
    hotelsWithIg: 0,
    hotelsContacted: 0,
    hotelsIgContacted: 0,
    hotelsReplied: 0,
    totalTemplates: 0,
    totalSequences: 0,
    activeJobs: 0,
    completedJobs: 0,
    listBreakdown: [],
    recentActivity: [],
    contactRate: 0,
    replyRate: 0,
    emailFoundRate: 0,
  });

  useEffect(() => { if (user) fetchStats(); }, [user]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { data: lists },
        { data: hotels },
        { data: templates },
        { data: sequences },
        { data: jobs },
      ] = await Promise.all([
        supabase.from("lists").select("id, name, created_at").eq("user_id", user.id),
        supabase.from("list_hotels").select("*").eq("user_id", user.id),
        supabase.from("templates").select("id, type").eq("user_id", user.id),
        supabase.from("sequences").select("id").eq("user_id", user.id),
        supabase.from("sequence_jobs").select("*").eq("user_id", user.id),
      ]);

      const hotelList = hotels || [];
      const jobList = jobs || [];
      const listList = lists || [];

      const hotelsWithEmail = hotelList.filter(h => h.email).length;
      const hotelsWithIg = hotelList.filter(h => h.instagram).length;
      const hotelsContacted = hotelList.filter(h => h.contacted).length;
      const hotelsIgContacted = hotelList.filter(h => h.ig_contacted).length;
      const hotelsReplied = jobList.filter(j => j.replied_at).length;
      const activeJobs = jobList.filter(j => j.status === "active").length;
      const completedJobs = jobList.filter(j => j.status === "completed").length;

      // Per-list breakdown
      const listBreakdown = listList.map(list => {
        const listHotels = hotelList.filter(h => h.list_id === list.id);
        return {
          name: list.name,
          total: listHotels.length,
          withEmail: listHotels.filter(h => h.email).length,
          contacted: listHotels.filter(h => h.contacted).length,
          igDms: listHotels.filter(h => h.ig_contacted).length,
          emailsSent: listHotels.filter(h => h.contacted).length,
          created: list.created_at,
        };
      }).sort((a, b) => b.total - a.total);

      // Recent activity - hotels added in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentHotels = hotelList
        .filter(h => h.created_at && new Date(h.created_at) > thirtyDaysAgo)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8);

      // Activity by day (last 14 days)
      const last14 = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return d.toISOString().split("T")[0];
      });
      const recentActivity = last14.map(date => ({
        date,
        label: new Date(date).toLocaleDateString([], { month:"short", day:"numeric" }),
        hotels: hotelList.filter(h => h.created_at?.startsWith(date)).length,
        contacted: hotelList.filter(h => h.contacted_at?.startsWith(date)).length,
      }));

      const maxActivity = Math.max(...recentActivity.map(d => d.hotels + d.contacted), 1);

      setStats({
        totalLists: listList.length,
        totalHotels: hotelList.length,
        hotelsWithEmail,
        hotelsWithIg,
        hotelsContacted,
        hotelsIgContacted,
        hotelsReplied,
        totalTemplates: (templates || []).length,
        totalSequences: (sequences || []).length,
        activeJobs,
        completedJobs,
        listBreakdown,
        recentActivity,
        maxActivity,
        contactRate: hotelsWithEmail > 0 ? Math.round((hotelsContacted / hotelsWithEmail) * 100) : 0,
        replyRate: hotelsContacted > 0 ? Math.round((hotelsReplied / hotelsContacted) * 100) : 0,
        emailFoundRate: hotelList.length > 0 ? Math.round((hotelsWithEmail / hotelList.length) * 100) : 0,
      });
    } catch (e) {
      console.error("Analytics error:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding:"28px 20px" }}>
        <h1 style={s.title}>Analytics</h1>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 0" }}>
          <div style={{ width:32, height:32, border:"3px solid #DDD5CC", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Analytics</h1>
          <p style={s.subtitle}>Track your outreach performance across all campaigns</p>
        </div>
        <button style={s.refreshBtn} onClick={fetchStats}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* Top stats */}
      <div style={s.statsGrid}>
        <StatCard label="Total Hotels" value={stats.totalHotels} sub={`across ${stats.totalLists} lists`} color="#0F2544"
          icon="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <StatCard label="Emails Found" value={`${stats.emailFoundRate}%`} sub={`${stats.hotelsWithEmail} hotels`} color="#2A9D8F"
          icon="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9" />
        <StatCard label="Contacted via Email" value={stats.hotelsContacted} sub={`${stats.contactRate}% of emails found`} color="#E85D3D"
          icon="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        <StatCard label="Contacted via Instagram" value={stats.hotelsIgContacted} sub={`of ${stats.hotelsWithIg} with IG handle`} color="#C13584"
          icon="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069z" />
        <StatCard label="Replies Received" value={stats.hotelsReplied} sub={`${stats.replyRate}% reply rate`} color="#1E3A5F"
          icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </div>

      <div style={s.secondaryGrid}>
        <StatCard label="Active Sequences" value={stats.activeJobs} sub={`${stats.completedJobs} completed`} color="#1E3A5F"
          icon="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9" />
        <StatCard label="Templates" value={stats.totalTemplates} color="#4A6A8A"
          icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" />
        <StatCard label="Sequences Built" value={stats.totalSequences} color="#6B7280"
          icon="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      </div>

      <div style={s.twoCol}>
        {/* Activity chart - last 14 days */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Activity — Last 14 Days</h2>
          <p style={s.cardSub}>Hotels added and outreach sent per day</p>
          <div style={s.chartWrap}>
            {stats.recentActivity.map((day, i) => (
              <div key={i} style={s.chartCol}>
                <div style={s.chartBars}>
                  <div style={{ ...s.chartBarContacted, height: `${stats.maxActivity > 0 ? (day.contacted / stats.maxActivity) * 100 : 0}%` }} title={`${day.contacted} contacted`} />
                  <div style={{ ...s.chartBarHotels, height: `${stats.maxActivity > 0 ? (day.hotels / stats.maxActivity) * 100 : 0}%` }} title={`${day.hotels} added`} />
                </div>
                <p style={s.chartLabel}>{day.label.split(" ")[1]}</p>
              </div>
            ))}
          </div>
          <div style={s.chartLegend}>
            <div style={s.legendItem}><div style={{ ...s.legendDot, background:"#E85D3D" }} /><span>Hotels Added</span></div>
            <div style={s.legendItem}><div style={{ ...s.legendDot, background:"#2A9D8F" }} /><span>Contacted</span></div>
          </div>
        </div>

        {/* Per-list breakdown */}
        <div style={s.card}>
          <h2 style={s.cardTitle}>Lists Breakdown</h2>
          <p style={s.cardSub}>Hotels and outreach per list</p>
          {stats.listBreakdown.length === 0 ? (
            <div style={s.emptyCard}>
              <p>No lists yet. Create a list to start tracking.</p>
            </div>
          ) : (
            <div style={{ marginTop:16 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 48px 64px 72px", gap:"0 8px", padding:"0 0 6px", borderBottom:"1px solid #F0EBE5", marginBottom:4 }}>
                <span style={s.breakdownHd}>List</span>
                <span style={{ ...s.breakdownHd, textAlign:"center" }}>Hotels</span>
                <span style={{ ...s.breakdownHd, textAlign:"center", color:"#C13584" }}>IG DMs</span>
                <span style={{ ...s.breakdownHd, textAlign:"center", color:"#E85D3D" }}>Emails Sent</span>
              </div>
              {stats.listBreakdown.map((list, i) => (
                <div key={i} style={{ ...s.listRow, display:"grid", gridTemplateColumns:"1fr 48px 64px 72px", gap:"0 8px" }}>
                  <div style={{ minWidth:0 }}>
                    <p style={s.listName}>{list.name}</p>
                    <p style={{ fontSize:11, color:"#9FB3C8", marginTop:1 }}>{list.withEmail} with email</p>
                  </div>
                  <div style={{ textAlign:"center", fontSize:14, fontWeight:700, color:"#0F2544", alignSelf:"center" }}>{list.total}</div>
                  <div style={{ textAlign:"center", fontSize:14, fontWeight:700, color:"#C13584", alignSelf:"center" }}>{list.igDms}</div>
                  <div style={{ textAlign:"center", fontSize:14, fontWeight:700, color:"#E85D3D", alignSelf:"center" }}>{list.emailsSent}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Funnel */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Outreach Funnel</h2>
        <p style={s.cardSub}>How hotels move through each channel</p>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:28, marginTop:24 }}>
          {/* Email track */}
          <div>
            <div style={s.funnelTrackHead}>
              <div style={{ ...s.funnelTrackDot, background:"#E85D3D" }} />
              <span style={s.funnelTrackLabel}>Email Outreach</span>
            </div>
            <div style={{ marginTop:14 }}>
              <SimpleBar label="Hotels Saved" value={stats.totalHotels} max={stats.totalHotels} color="#0F2544" />
              <SimpleBar label="Email Found" value={stats.hotelsWithEmail} max={stats.totalHotels} color="#2A9D8F" />
              <SimpleBar label="Email Sent" value={stats.hotelsContacted} max={stats.totalHotels} color="#E85D3D" />
              <SimpleBar label="Replied" value={stats.hotelsReplied} max={stats.totalHotels} color="#1E3A5F" />
            </div>
          </div>
          {/* Instagram track */}
          <div>
            <div style={s.funnelTrackHead}>
              <div style={{ ...s.funnelTrackDot, background:"#C13584" }} />
              <span style={s.funnelTrackLabel}>Instagram Outreach</span>
            </div>
            <div style={{ marginTop:14 }}>
              <SimpleBar label="Hotels Saved" value={stats.totalHotels} max={stats.totalHotels} color="#0F2544" />
              <SimpleBar label="IG Handle Found" value={stats.hotelsWithIg} max={stats.totalHotels} color="#4A6A8A" />
              <SimpleBar label="DM Sent" value={stats.hotelsIgContacted} max={stats.totalHotels} color="#C13584" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { padding:"28px 20px 80px", maxWidth:1100, margin:"0 auto" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 },
  title: { fontSize:26, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:4 },
  subtitle: { fontSize:14, color:"#9FB3C8" },
  refreshBtn: { display:"flex", alignItems:"center", gap:7, padding:"9px 16px", background:"#fff", border:"1.5px solid #DDD5CC", borderRadius:10, fontSize:13, fontWeight:500, cursor:"pointer", color:"#4A6A8A", fontFamily:"inherit" },
  statsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:16 },
  secondaryGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:16, marginBottom:28 },
  statCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"18px 20px" },
  statLabel: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase", marginBottom:8 },
  statValue: { fontSize:30, fontWeight:700, letterSpacing:"-0.5px", lineHeight:1, marginBottom:4 },
  statSub: { fontSize:12, color:"#9FB3C8", marginTop:4 },
  statIcon: { width:40, height:40, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  twoCol: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))", gap:20, marginBottom:20 },
  card: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"20px 22px" },
  cardTitle: { fontSize:16, fontWeight:700, color:"#0F2544", marginBottom:3 },
  cardSub: { fontSize:12, color:"#9FB3C8" },
  emptyCard: { padding:"32px 0", textAlign:"center", color:"#9FB3C8", fontSize:13 },
  chartWrap: { display:"flex", alignItems:"flex-end", gap:4, height:120, marginTop:20, marginBottom:8 },
  chartCol: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4, height:"100%" },
  chartBars: { flex:1, width:"100%", display:"flex", alignItems:"flex-end", gap:1 },
  chartBarHotels: { flex:1, background:"#E85D3D", borderRadius:"3px 3px 0 0", transition:"height 0.3s", minHeight: 2 },
  chartBarContacted: { flex:1, background:"#2A9D8F", borderRadius:"3px 3px 0 0", transition:"height 0.3s", minHeight: 0 },
  chartLabel: { fontSize:9, color:"#CBD5E1", textAlign:"center" },
  chartLegend: { display:"flex", gap:16, marginTop:8 },
  legendItem: { display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#9FB3C8" },
  legendDot: { width:10, height:10, borderRadius:"50%", flexShrink:0 },
  listRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #F7F3EF" },
  listName: { fontSize:13, fontWeight:600, color:"#1E3A5F", marginBottom:3 },
  listMini: { display:"flex", alignItems:"center", gap:4, flexWrap:"wrap" },
  miniStat: { fontSize:11, color:"#9FB3C8" },
  miniDot: { fontSize:11, color:"#DDD5CC" },
  listPct: { fontSize:14, fontWeight:700, color:"#E85D3D", flexShrink:0 },
  barRow: { display:"flex", alignItems:"center", gap:12, marginBottom:14 },
  barLabel: { fontSize:13, color:"#1E3A5F", fontWeight:500, minWidth:120 },
  barTrack: { flex:1, height:10, background:"#F0EBE5", borderRadius:6, overflow:"hidden" },
  barFill: { height:"100%", borderRadius:6, transition:"width 0.5s ease" },
  barValue: { fontSize:13, fontWeight:600, color:"#0F2544", minWidth:32, textAlign:"right" },
  breakdownHd: { fontSize:10, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.06em", textTransform:"uppercase" },
  funnelTrackHead: { display:"flex", alignItems:"center", gap:8, paddingBottom:10, borderBottom:"1px solid #F0EBE5" },
  funnelTrackDot: { width:8, height:8, borderRadius:"50%", flexShrink:0 },
  funnelTrackLabel: { fontSize:13, fontWeight:700, color:"#1E3A5F" },
};
