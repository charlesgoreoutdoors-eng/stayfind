"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { useIsMobile } from "../../../lib/useIsMobile";

export default function TrackingPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [jobs, setJobs]         = useState([]);
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [dailySent, setDailySent]   = useState(0);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [queuedTomorrow, setQueuedTomorrow] = useState(0);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const todayStr = new Date().toISOString().slice(0, 10);
    const [jobsRes, seqRes, logRes, profileRes, tomorrowRes] = await Promise.all([
      supabase.from("sequence_jobs").select("*").eq("user_id", user.id),
      supabase.from("sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("email_send_log").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("sent_at", `${todayStr}T00:00:00.000Z`).lte("sent_at", `${todayStr}T23:59:59.999Z`),
      supabase.from("profiles").select("daily_email_limit").eq("id", user.id).single(),
      supabase.from("sequence_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("status", "active").gte("next_send_at", `${todayStr}T23:59:59.999Z`),
    ]);
    setJobs(jobsRes.data || []);
    setSequences(seqRes.data || []);
    setDailySent(logRes.count || 0);
    setDailyLimit(profileRes.data?.daily_email_limit ?? 30);
    setQueuedTomorrow(tomorrowRes.count || 0);
    setLoading(false);
  };

  // Overall stats across all sequences
  const totalHotels  = new Set(jobs.map(j => j.hotel_email)).size;
  const totalReplied = jobs.filter(j => j.replied_at).length;
  const totalActive  = jobs.filter(j => j.status === "active").length;
  const replyRate    = totalHotels > 0 ? Math.round((totalReplied / totalHotels) * 100) : 0;

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:16 }}>Email Tracking</h2>

      {/* Daily usage bar */}
      <div style={s.usageCard}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
          <p style={{ fontSize:13, fontWeight:600, color:"#0F2544" }}>
            Emails sent today: <span style={{ color: dailySent >= dailyLimit ? "#ef4444" : "#E85D3D" }}>{dailySent}</span>
            <span style={{ color:"#9FB3C8" }}> / {dailyLimit}</span>
          </p>
          <a href="/settings" style={{ fontSize:12, color:"#4A6A8A", textDecoration:"none", fontWeight:500 }}>Edit limit →</a>
        </div>
        <div style={s.usageTrack}>
          <div style={{ ...s.usageFill, width:`${Math.min(100, (dailySent / dailyLimit) * 100)}%`, background: dailySent >= dailyLimit ? "#ef4444" : "#E85D3D" }} />
        </div>
        {queuedTomorrow > 0 && (
          <p style={{ fontSize:11, color:"#9FB3C8", marginTop:8 }}>
            {queuedTomorrow} email{queuedTomorrow !== 1 ? "s" : ""} queued for tomorrow
          </p>
        )}
      </div>

      {/* Overall stats */}
      <div style={{ ...s.statsRow, gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", marginBottom:28 }}>
        {[
          { label:"Hotels Reached",   value: totalHotels,      color:"#0F2544" },
          { label:"Replies Received", value: totalReplied,     color:"#2A9D8F" },
          { label:"Active Jobs",      value: totalActive,      color:"#E85D3D" },
          { label:"Reply Rate",       value: `${replyRate}%`,  color:"#C13584" },
        ].map((stat, i) => (
          <div key={i} style={s.statCard}>
            <p style={{ ...s.statValue, color: stat.color }}>{stat.value}</p>
            <p style={s.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Sequence cards */}
      {loading ? (
        <div style={s.empty}><div style={s.spinner} /></div>
      ) : sequences.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize:36 }}>📊</span>
          <p style={{ fontSize:14, color:"#9FB3C8", marginTop:12, textAlign:"center" }}>
            No sequences yet. Launch one from the Compose tab.
          </p>
        </div>
      ) : (
        <div style={s.cardGrid}>
          {sequences.map(seq => {
            const seqJobs = jobs.filter(j => j.sequence_id === seq.id);
            const active    = seqJobs.filter(j => j.status === "active").length;
            const replied   = seqJobs.filter(j => j.replied_at).length;
            const completed = seqJobs.filter(j => j.status === "completed").length;
            const cancelled = seqJobs.filter(j => j.status === "cancelled").length;
            const total     = new Set(seqJobs.map(j => j.hotel_email)).size;
            const rate      = total > 0 ? Math.round((replied / total) * 100) : 0;

            return (
              <Link key={seq.id} href={`/sequences/tracking/${seq.id}`} style={{ textDecoration:"none" }}>
                <div style={s.seqCard}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:14 }}>
                    <div>
                      <p style={s.seqName}>{seq.name}</p>
                      <p style={s.seqMeta}>{total} hotel{total !== 1 ? "s" : ""} contacted</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9FB3C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>

                  <div style={s.seqStats}>
                    <div style={s.seqStat}>
                      <span style={{ ...s.seqStatDot, background:"#E85D3D" }} />
                      <span style={s.seqStatLabel}>{active} active</span>
                    </div>
                    <div style={s.seqStat}>
                      <span style={{ ...s.seqStatDot, background:"#2A9D8F" }} />
                      <span style={s.seqStatLabel}>{replied} replied</span>
                    </div>
                    <div style={s.seqStat}>
                      <span style={{ ...s.seqStatDot, background:"#4338ca" }} />
                      <span style={s.seqStatLabel}>{completed} done</span>
                    </div>
                    {cancelled > 0 && (
                      <div style={s.seqStat}>
                        <span style={{ ...s.seqStatDot, background:"#cbd5e1" }} />
                        <span style={s.seqStatLabel}>{cancelled} cancelled</span>
                      </div>
                    )}
                  </div>

                  {total > 0 && (
                    <div style={{ marginTop:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                        <span style={{ fontSize:11, color:"#9FB3C8" }}>Reply rate</span>
                        <span style={{ fontSize:11, fontWeight:700, color:"#2A9D8F" }}>{rate}%</span>
                      </div>
                      <div style={s.progressTrack}>
                        <div style={{ ...s.progressFill, width:`${rate}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  usageCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"16px 20px", marginBottom:20 },
  usageTrack: { height:8, background:"#F0EBE5", borderRadius:99, overflow:"hidden" },
  usageFill: { height:"100%", borderRadius:99, transition:"width 0.4s ease" },
  statsRow: { display:"grid", gap:16 },
  statCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"18px 20px" },
  statValue: { fontSize:32, fontWeight:700, letterSpacing:"-0.5px", marginBottom:4 },
  statLabel: { fontSize:12, color:"#9FB3C8", fontWeight:500 },
  cardGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:14 },
  seqCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"18px 20px", cursor:"pointer", transition:"box-shadow 0.15s, transform 0.15s" },
  seqName: { fontSize:15, fontWeight:700, color:"#0F2544", marginBottom:3 },
  seqMeta: { fontSize:12, color:"#9FB3C8" },
  seqStats: { display:"flex", gap:14, flexWrap:"wrap" },
  seqStat: { display:"flex", alignItems:"center", gap:5 },
  seqStatDot: { width:7, height:7, borderRadius:"50%", flexShrink:0 },
  seqStatLabel: { fontSize:12, color:"#4A6A8A" },
  progressTrack: { height:5, background:"#F0EBE5", borderRadius:99, overflow:"hidden" },
  progressFill: { height:"100%", background:"#2A9D8F", borderRadius:99, transition:"width 0.4s ease" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:8 },
  spinner: { width:24, height:24, border:"2.5px solid #F0EBE5", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
};
