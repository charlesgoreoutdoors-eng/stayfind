"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalHotels: 0,
    hotelsWithEmail: 0,
    hotelsContacted: 0,
    hotelsIgContacted: 0,
    hotelsReplied: 0,
    activeJobs: 0,
  });
  const [lists, setLists] = useState([]);
  const [recentContacts, setRecentContacts] = useState([]);
  const [recentReplies, setRecentReplies] = useState([]);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [
      { data: listData },
      { data: hotels },
      { data: jobs },
      { data: hotelCounts },
    ] = await Promise.all([
      supabase.from("lists").select("id, name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("list_hotels").select("*").eq("user_id", user.id),
      supabase.from("sequence_jobs").select("*, sequences(name)").eq("user_id", user.id).eq("status", "active").order("started_at", { ascending: false }).limit(5),
      supabase.from("list_hotels").select("list_id").eq("user_id", user.id),
    ]);

    const hotelList = hotels || [];
    const counts = {};
    (hotelCounts || []).forEach(r => { counts[r.list_id] = (counts[r.list_id] || 0) + 1; });

    const contacted = hotelList.filter(h => h.contacted && h.contacted_at).sort((a, b) => new Date(b.contacted_at) - new Date(a.contacted_at)).slice(0, 4);
    const replies = hotelList.filter(h => h.ig_replied).slice(0, 3);

    setStats({
      totalHotels: hotelList.length,
      hotelsWithEmail: hotelList.filter(h => h.email).length,
      hotelsContacted: hotelList.filter(h => h.contacted).length,
      hotelsIgContacted: hotelList.filter(h => h.ig_contacted).length,
      hotelsReplied: hotelList.filter(h => h.ig_replied).length,
      activeJobs: (jobs || []).length,
    });
    setLists((listData || []).map(l => ({ ...l, count: counts[l.id] || 0 })));
    setRecentContacts(contacted);
    setRecentReplies(replies);
    setLoading(false);
  };

  const firstName = user?.email?.split("@")[0] || "there";

  if (loading) return (
    <div style={s.root}>
      <div style={s.loadingWrap}>
        <div style={s.spinner} />
      </div>
    </div>
  );

  const hasActivity = stats.totalHotels > 0;

  return (
    <div style={s.root}>
      {/* Greeting */}
      <div style={s.greeting}>
        <h1 style={s.greetTitle}>Good to see you, {firstName} 👋</h1>
        <p style={s.greetSub}>Here's where your outreach stands today.</p>
      </div>

      {/* Stats row */}
      <div style={s.statsGrid}>
        {[
          { label:"Hotels Saved", value: stats.totalHotels, color:"#0F2544", icon:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", sub:"across all lists" },
          { label:"Emails Found", value: stats.hotelsWithEmail, color:"#2A9D8F", icon:"M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9", sub:`of ${stats.totalHotels} hotels` },
          { label:"Emails Sent", value: stats.hotelsContacted, color:"#E85D3D", icon:"M22 2L11 13 M22 2L15 22 11 13 2 9 22 2", sub:"via email sequences" },
          { label:"IG DMs Sent", value: stats.hotelsIgContacted, color:"#C13584", icon:"M17.5 6.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0-2 0 M2 2h20v20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2z M2 2l20 20", sub:"direct messages" },
          { label:"Replies", value: stats.hotelsReplied, color:"#1E3A5F", icon:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", sub:"received so far" },
        ].map((stat, i) => (
          <div key={i} style={s.statCard}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between" }}>
              <div>
                <p style={s.statLabel}>{stat.label}</p>
                <p style={{ ...s.statValue, color: stat.color }}>{stat.value}</p>
                <p style={s.statSub}>{stat.sub}</p>
              </div>
              <div style={{ width:36, height:36, borderRadius:10, background: stat.color + "15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={stat.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={stat.icon}/>
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={s.bodyGrid}>
        {/* Left column */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* My Lists */}
          <div style={s.section}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>My Lists</h2>
              <Link href="/lists" style={s.sectionLink}>View all</Link>
            </div>
            {lists.length === 0 ? (
              <div style={s.emptyBox}>
                <p style={s.emptyText}>No lists yet. Search for hotels and save them to a list.</p>
                <Link href="/" style={s.ctaBtn}>Start searching</Link>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {lists.slice(0, 5).map(list => (
                  <Link key={list.id} href="/lists" style={s.listRow}>
                    <div style={s.listIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4A6A8A" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/></svg>
                    </div>
                    <span style={s.listName}>{list.name}</span>
                    <span style={s.listCount}>{list.count} hotel{list.count !== 1 ? "s" : ""}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Active Sequences */}
          {stats.activeJobs > 0 && (
            <div style={s.section}>
              <div style={s.sectionHead}>
                <h2 style={s.sectionTitle}>Active Sequences</h2>
                <Link href="/sequences/tracking" style={s.sectionLink}>View all</Link>
              </div>
              <div style={s.seqBadge}>
                <div style={s.seqDot} />
                <span style={s.seqText}>{stats.activeJobs} email sequence{stats.activeJobs !== 1 ? "s" : ""} currently running</span>
                <Link href="/sequences/tracking" style={s.seqLink}>Track →</Link>
              </div>
            </div>
          )}

          {/* Recent Replies */}
          {recentReplies.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionHead}>
                <h2 style={s.sectionTitle}>Recent Replies</h2>
              </div>
              {recentReplies.map(h => (
                <div key={h.id} style={s.replyRow}>
                  <div style={s.replyDot} />
                  <div>
                    <p style={s.replyName}>{h.name}</p>
                    <p style={s.replySub}>Replied via Instagram</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

          {/* Quick actions */}
          <div style={s.section}>
            <h2 style={{ ...s.sectionTitle, marginBottom:12 }}>Quick Actions</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <Link href="/" style={s.actionBtn}>
                <div style={{ ...s.actionIcon, background:"#EEF4FF" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B6FD4" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <div>
                  <p style={s.actionLabel}>Search Hotels</p>
                  <p style={s.actionSub}>Find new properties to partner with</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5" style={{ marginLeft:"auto", flexShrink:0 }}><path d="M9 18l6-6-6-6"/></svg>
              </Link>
              <Link href="/lists" style={s.actionBtn}>
                <div style={{ ...s.actionIcon, background:"#F0EBE5" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4A6A8A" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/></svg>
                </div>
                <div>
                  <p style={s.actionLabel}>View Lists</p>
                  <p style={s.actionSub}>Manage your saved properties</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5" style={{ marginLeft:"auto", flexShrink:0 }}><path d="M9 18l6-6-6-6"/></svg>
              </Link>
              <Link href="/sequences/compose" style={s.actionBtn}>
                <div style={{ ...s.actionIcon, background:"#FEF0EC" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </div>
                <div>
                  <p style={s.actionLabel}>Compose Emails</p>
                  <p style={s.actionSub}>Send outreach to a list</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5" style={{ marginLeft:"auto", flexShrink:0 }}><path d="M9 18l6-6-6-6"/></svg>
              </Link>
              <Link href="/analytics" style={s.actionBtn}>
                <div style={{ ...s.actionIcon, background:"#E8F8F5" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2A9D8F" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                </div>
                <div>
                  <p style={s.actionLabel}>View Analytics</p>
                  <p style={s.actionSub}>Track your outreach performance</p>
                </div>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5" style={{ marginLeft:"auto", flexShrink:0 }}><path d="M9 18l6-6-6-6"/></svg>
              </Link>
            </div>
          </div>

          {/* Recent contacts */}
          {recentContacts.length > 0 && (
            <div style={s.section}>
              <div style={s.sectionHead}>
                <h2 style={s.sectionTitle}>Recently Contacted</h2>
              </div>
              {recentContacts.map(h => (
                <div key={h.id} style={s.contactRow}>
                  <div style={s.contactThumb}>
                    {h.photo_url
                      ? <img src={h.photo_url} alt={h.name} style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:8 }} />
                      : <span style={{ fontSize:16 }}>🏨</span>}
                  </div>
                  <div style={{ minWidth:0 }}>
                    <p style={s.contactName}>{h.name}</p>
                    <p style={s.contactMeta}>{h.address}</p>
                  </div>
                  <span style={s.contactBadge}>Sent</span>
                </div>
              ))}
            </div>
          )}

          {/* Empty state CTA for new users */}
          {!hasActivity && (
            <div style={s.welcomeBox}>
              <p style={s.welcomeTitle}>Ready to find your first partnership?</p>
              <p style={s.welcomeSub}>Search for hotels by location, save them to a list, then reach out directly by email or Instagram.</p>
              <Link href="/" style={s.welcomeBtn}>Search Hotels →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  root: { padding:"28px 24px 80px", maxWidth:1060, margin:"0 auto" },
  loadingWrap: { display:"flex", justifyContent:"center", paddingTop:80 },
  spinner: { width:24, height:24, border:"2.5px solid #F0EBE5", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  greeting: { marginBottom:28 },
  greetTitle: { fontSize:26, fontWeight:700, color:"#0F2544", letterSpacing:"-0.4px", marginBottom:4 },
  greetSub: { fontSize:14, color:"#4A6A8A" },
  statsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:14, marginBottom:28 },
  statCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"16px 18px" },
  statLabel: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:6 },
  statValue: { fontSize:30, fontWeight:700, letterSpacing:"-0.5px", marginBottom:2 },
  statSub: { fontSize:11, color:"#9FB3C8" },
  bodyGrid: { display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" },
  section: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"18px 20px" },
  sectionHead: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  sectionTitle: { fontSize:15, fontWeight:700, color:"#0F2544", letterSpacing:"-0.2px" },
  sectionLink: { fontSize:12, color:"#E85D3D", fontWeight:600, textDecoration:"none" },
  listRow: { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"1px solid #F0EBE5", textDecoration:"none", background:"#FAFAF9", transition:"border-color 0.15s" },
  listIcon: { width:28, height:28, borderRadius:8, background:"#F0EBE5", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  listName: { fontSize:13, fontWeight:600, color:"#1E3A5F", flex:1 },
  listCount: { fontSize:11, color:"#9FB3C8", fontWeight:500, flexShrink:0 },
  actionBtn: { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:10, border:"1px solid #F0EBE5", textDecoration:"none", background:"#FAFAF9", transition:"border-color 0.15s" },
  actionIcon: { width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  actionLabel: { fontSize:13, fontWeight:600, color:"#1E3A5F", marginBottom:1 },
  actionSub: { fontSize:11, color:"#9FB3C8" },
  emptyBox: { textAlign:"center", padding:"20px 0 4px" },
  emptyText: { fontSize:13, color:"#9FB3C8", marginBottom:14, lineHeight:1.5 },
  ctaBtn: { display:"inline-block", padding:"9px 20px", background:"#E85D3D", color:"#fff", borderRadius:9, fontSize:13, fontWeight:600, textDecoration:"none" },
  seqBadge: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"#E8F8F5", borderRadius:10, border:"1px solid #A8E6E0" },
  seqDot: { width:8, height:8, borderRadius:"50%", background:"#2A9D8F", flexShrink:0 },
  seqText: { fontSize:13, color:"#1A6B5A", fontWeight:500, flex:1 },
  seqLink: { fontSize:12, color:"#1A6B5A", fontWeight:700, textDecoration:"none", flexShrink:0 },
  replyRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #F0EBE5" },
  replyDot: { width:8, height:8, borderRadius:"50%", background:"#C13584", flexShrink:0 },
  replyName: { fontSize:13, fontWeight:600, color:"#0F2544", marginBottom:1 },
  replySub: { fontSize:11, color:"#9FB3C8" },
  contactRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #F0EBE5" },
  contactThumb: { width:36, height:36, borderRadius:8, background:"#F0EBE5", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" },
  contactName: { fontSize:13, fontWeight:600, color:"#0F2544", marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  contactMeta: { fontSize:11, color:"#9FB3C8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  contactBadge: { fontSize:10, fontWeight:700, color:"#E85D3D", background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:20, padding:"2px 8px", flexShrink:0, marginLeft:"auto" },
  welcomeBox: { background:"#0F2544", borderRadius:14, padding:"24px 20px" },
  welcomeTitle: { fontSize:16, fontWeight:700, color:"#F7F3EF", marginBottom:8, letterSpacing:"-0.2px" },
  welcomeSub: { fontSize:13, color:"#7A9BBF", lineHeight:1.6, marginBottom:16 },
  welcomeBtn: { display:"inline-block", padding:"10px 20px", background:"#E85D3D", color:"#fff", borderRadius:9, fontSize:13, fontWeight:600, textDecoration:"none" },
};
