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
      <div style={s.loadingWrap}><div style={s.spinner} /></div>
    </div>
  );

  const hasActivity = stats.totalHotels > 0;

  // First-run guided checklist replaces the dashboard until there's activity.
  if (!hasActivity) {
    return <Onboarding stats={stats} lists={lists} />;
  }

  return (
    <div style={s.root}>
      {/* Greeting */}
      <div style={s.greeting}>
        <h1 style={s.greetTitle}>Good to see you, {firstName} 👋</h1>
        <p style={s.greetSub}>Here&apos;s where your outreach stands today.</p>
      </div>

      {/* Stats row */}
      <div style={s.statsGrid}>
        {[
          { label:"Hotels Saved", value: stats.totalHotels,      color:"var(--color-action-forest)",    sub:"across all lists" },
          { label:"Emails Found", value: stats.hotelsWithEmail,  color:"var(--color-cool-olive-mid)",   sub:`of ${stats.totalHotels} hotels` },
          { label:"Emails Sent",  value: stats.hotelsContacted,  color:"var(--color-accent-terracotta)", sub:"via sequences" },
          { label:"Replies",      value: stats.hotelsReplied,    color:"var(--color-accent-amber-deep)", sub:"received so far" },
        ].map((stat, i) => (
          <div key={i} style={s.statCard}>
            <p style={s.statLabel}>{stat.label}</p>
            <p style={{ ...s.statValue, color: stat.color }}>{stat.value}</p>
            <p style={s.statSub}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="dp-dash-body" style={s.bodyGrid}>
        {/* Left column */}
        <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
          {/* My Lists */}
          <div style={s.card}>
            <div style={s.sectionHead}>
              <h2 style={s.sectionTitle}>My Lists</h2>
              {lists.length > 0 && <Link href="/lists" style={s.sectionLink}>View all</Link>}
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
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-cool-olive-deep)" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/></svg>
                    </div>
                    <span style={s.listName}>{list.name}</span>
                    <span style={s.listCount}>{list.count} hotel{list.count !== 1 ? "s" : ""}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Active Sequences */}
          {stats.activeJobs > 0 && (
            <div style={s.card}>
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
            <div style={s.card}>
              <div style={s.sectionHead}><h2 style={s.sectionTitle}>Recent Replies</h2></div>
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
          <div style={s.card}>
            <h2 style={{ ...s.sectionTitle, marginBottom:14 }}>Quick Actions</h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {[
                { href:"/", tint:"rgba(224,149,74,0.16)", ink:"var(--color-accent-terracotta)", label:"Search Hotels", sub:"Find new properties",
                  icon:<><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></> },
                { href:"/lists", tint:"rgba(139,154,106,0.18)", ink:"var(--color-cool-olive-deep)", label:"View Lists", sub:"Manage saved hotels",
                  icon:<path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 0 2-2h2a2 2 0 0 0 2 2"/> },
                { href:"/sequences/builder", tint:"rgba(181,112,46,0.16)", ink:"var(--color-accent-amber-deep)", label:"Compose Emails", sub:"Send outreach",
                  icon:<><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></> },
              ].map(a => (
                <Link key={a.href} href={a.href} style={s.actionBtn}>
                  <div style={{ ...s.actionIcon, background:a.tint }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={a.ink} strokeWidth="2">{a.icon}</svg>
                  </div>
                  <div>
                    <p style={s.actionLabel}>{a.label}</p>
                    <p style={s.actionSub}>{a.sub}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent contacts */}
          {recentContacts.length > 0 && (
            <div style={s.card}>
              <div style={s.sectionHead}><h2 style={s.sectionTitle}>Recently Contacted</h2></div>
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
        </div>
      </div>
    </div>
  );
}

/* ── First-run onboarding checklist ─────────────────────────────────────── */

function Onboarding({ stats, lists }) {
  const steps = [
    { n:1, title:"Search for hotels",    desc:"Find properties by location, style and vibe.",  href:"/",                  done: stats.totalHotels > 0,     tint:"rgba(224,149,74,0.16)", ink:"var(--color-accent-terracotta)" },
    { n:2, title:"Build your first list", desc:"Save favourites so you can track them.",        href:"/lists",             done: lists.length > 0,          tint:"rgba(139,154,106,0.18)", ink:"var(--color-cool-olive-deep)" },
    { n:3, title:"Find contact details",  desc:"Emails and Instagram handles, done for you.",   href:"/lists",             done: stats.hotelsWithEmail > 0, tint:"rgba(181,112,46,0.16)", ink:"var(--color-accent-amber-deep)" },
    { n:4, title:"Send your first pitch", desc:"Launch a personal outreach sequence.",          href:"/sequences/builder", done: stats.hotelsContacted > 0, tint:"rgba(68,80,58,0.14)",   ink:"var(--color-action-forest)" },
  ];
  const doneCount = steps.filter(st => st.done).length;
  const nextIndex = steps.findIndex(st => !st.done);

  return (
    <div style={ob.root}>
      <div style={ob.col}>
        <div>
          <div style={ob.title}>Let&apos;s set up your workspace</div>
          <div style={ob.sub}>Four quick steps and you&apos;ll be ready to land your first collab.</div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={ob.track}>
              <div style={{ ...ob.fill, width:`${(doneCount / steps.length) * 100}%` }} />
            </div>
            <span style={ob.progressText}>{doneCount} of {steps.length} done</span>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {steps.map((st, i) => {
            const isNext = i === nextIndex;
            return (
              <div key={st.n} style={ob.step}>
                <div style={{ ...ob.check, ...(st.done ? ob.checkDone : {}) }}>
                  {st.done && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-ground-page)" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </div>
                <div style={{ ...ob.badge, background:st.tint, color:st.ink }}>{st.n}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={ob.stepTitle}>{st.title}</p>
                  <p style={ob.stepDesc}>{st.desc}</p>
                </div>
                {st.done
                  ? <span style={ob.doneTag}>Done</span>
                  : isNext
                    ? <Link href={st.href} style={ob.startTag}>Start →</Link>
                    : <span style={ob.lockedTag}>Locked</span>}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:"center" }}>
          <span style={ob.skip}>Not ready yet? <Link href="/" style={ob.skipLink}>Skip to search</Link></span>
        </div>
      </div>
    </div>
  );
}

const ob = {
  root: { padding:"44px 24px 60px", display:"flex", justifyContent:"center" },
  col: { width:"100%", maxWidth:620, display:"flex", flexDirection:"column", gap:26 },
  title: { fontFamily:"var(--font-display)", fontSize:27, fontWeight:700, letterSpacing:"-0.01em", marginBottom:8, color:"var(--color-ink-primary)" },
  sub: { fontSize:14, color:"var(--color-ink-mid)", marginBottom:16 },
  track: { flex:1, height:6, borderRadius:3, background:"rgba(43,39,34,0.08)", overflow:"hidden" },
  fill: { height:"100%", background:"var(--color-accent-amber)", transition:"width 0.3s ease" },
  progressText: { fontSize:12, fontWeight:700, color:"var(--color-ink-muted)", whiteSpace:"nowrap" },
  step: { display:"flex", alignItems:"center", gap:16, padding:"18px 20px", background:"var(--color-ground-card)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-card)", boxShadow:"var(--shadow-low)" },
  check: { width:26, height:26, borderRadius:"50%", border:"2px solid var(--color-border)", flex:"none", display:"flex", alignItems:"center", justifyContent:"center" },
  checkDone: { background:"var(--color-cool-olive-deep)", border:"2px solid var(--color-cool-olive-deep)" },
  badge: { width:40, height:40, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", flex:"none", fontFamily:"var(--font-display)", fontWeight:700 },
  stepTitle: { fontSize:14.5, fontWeight:600, marginBottom:2, color:"var(--color-ink-primary)" },
  stepDesc: { fontSize:12.5, color:"var(--color-ink-muted)" },
  startTag: { fontSize:13, fontWeight:700, color:"var(--color-accent-amber-deep)", whiteSpace:"nowrap", textDecoration:"none" },
  lockedTag: { fontSize:13, fontWeight:700, color:"var(--color-ink-muted)", whiteSpace:"nowrap" },
  doneTag: { fontSize:13, fontWeight:700, color:"var(--color-cool-olive-deep)", whiteSpace:"nowrap" },
  skip: { fontSize:13, color:"var(--color-ink-muted)" },
  skipLink: { color:"var(--color-accent-amber-deep)", fontWeight:600, textDecoration:"none" },
};

const s = {
  root: { padding:"36px 40px 48px", maxWidth:1160, margin:"0 auto" },
  loadingWrap: { display:"flex", justifyContent:"center", paddingTop:80 },
  spinner: { width:24, height:24, border:"2.5px solid var(--color-ground-sand)", borderTopColor:"var(--color-accent-amber)", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  greeting: { marginBottom:26 },
  greetTitle: { fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, letterSpacing:"-0.01em", marginBottom:4, color:"var(--color-ink-primary)" },
  greetSub: { fontSize:14, color:"var(--color-ink-mid)" },

  statsGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:14, marginBottom:26 },
  statCard: { background:"var(--color-ground-card)", borderRadius:"var(--radius-card)", border:"1px solid var(--color-border)", boxShadow:"var(--shadow-low)", padding:"16px 18px" },
  statLabel: { fontSize:11, fontWeight:700, color:"var(--color-ink-muted)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:6 },
  statValue: { fontSize:28, fontWeight:700, marginBottom:2 },
  statSub: { fontSize:11, color:"var(--color-ink-faint)" },

  bodyGrid: { display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" },
  card: { background:"var(--color-ground-card)", borderRadius:"var(--radius-card)", border:"1px solid var(--color-border)", boxShadow:"var(--shadow-low)", padding:"20px 22px" },
  sectionHead: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 },
  sectionTitle: { fontFamily:"var(--font-display)", fontSize:15, fontWeight:700, color:"var(--color-ink-primary)" },
  sectionLink: { fontSize:12, color:"var(--color-accent-amber-deep)", fontWeight:700, textDecoration:"none" },

  listRow: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:"var(--radius-lg)", border:"1px solid rgba(43,39,34,0.07)", textDecoration:"none", background:"var(--color-ground-card)" },
  listIcon: { width:32, height:32, borderRadius:9, background:"rgba(139,154,106,0.18)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  listName: { fontSize:13, fontWeight:600, color:"var(--color-ink-primary)", flex:1 },
  listCount: { fontSize:11, color:"var(--color-ink-muted)", fontWeight:500, flexShrink:0 },

  actionBtn: { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:"var(--radius-lg)", border:"1px solid rgba(43,39,34,0.07)", textDecoration:"none", background:"var(--color-ground-card)" },
  actionIcon: { width:32, height:32, borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  actionLabel: { fontSize:13, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:1 },
  actionSub: { fontSize:11, color:"var(--color-ink-muted)" },

  emptyBox: { textAlign:"center", padding:"22px 0 6px" },
  emptyText: { fontSize:13.5, color:"var(--color-ink-muted)", marginBottom:16, lineHeight:1.55 },
  ctaBtn: { display:"inline-block", padding:"10px 22px", background:"var(--color-action-forest)", color:"var(--color-ground-page)", borderRadius:"var(--radius-lg)", fontSize:13.5, fontWeight:700, textDecoration:"none", fontFamily:"var(--font-display)" },

  seqBadge: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"var(--status-success-bg)", borderRadius:"var(--radius-lg)" },
  seqDot: { width:8, height:8, borderRadius:"50%", background:"var(--status-success-ink)", flexShrink:0 },
  seqText: { fontSize:13, color:"var(--status-success-ink)", fontWeight:600, flex:1 },
  seqLink: { fontSize:12, color:"var(--status-success-ink)", fontWeight:700, textDecoration:"none", flexShrink:0 },

  replyRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid rgba(43,39,34,0.07)" },
  replyDot: { width:8, height:8, borderRadius:"50%", background:"var(--brand-instagram)", flexShrink:0 },
  replyName: { fontSize:13, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:1 },
  replySub: { fontSize:11, color:"var(--color-ink-muted)" },

  contactRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid rgba(43,39,34,0.07)" },
  contactThumb: { width:36, height:36, borderRadius:8, background:"var(--color-ground-sand)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, overflow:"hidden" },
  contactName: { fontSize:13, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  contactMeta: { fontSize:11, color:"var(--color-ink-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  contactBadge: { fontSize:10, fontWeight:700, color:"var(--status-sent-ink)", background:"var(--status-sent-bg)", borderRadius:"var(--radius-pill)", padding:"3px 10px", flexShrink:0, marginLeft:"auto" },
};
