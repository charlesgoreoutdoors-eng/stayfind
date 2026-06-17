"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { useIsMobile } from "../../../lib/useIsMobile";

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "recently";
}

function nextSend(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  if (d <= now) return "Sending soon";
  const diff = d - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (days > 0) return `In ${days} day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `In ${hours} hour${hours !== 1 ? "s" : ""}`;
  return "Very soon";
}

export default function TrackingPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [jobs, setJobs]               = useState([]);
  const [sequences, setSequences]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedSeq, setSelectedSeq] = useState("all");
  const [cancelConfirm, setCancelConfirm] = useState(null);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [jobsRes, seqRes] = await Promise.all([
      supabase.from("sequence_jobs").select("*, sequences(name)").eq("user_id", user.id).order("started_at", { ascending: false }),
      supabase.from("sequences").select("*").eq("user_id", user.id),
    ]);
    setJobs(jobsRes.data || []);
    setSequences(seqRes.data || []);
    setLoading(false);
  };

  const cancelJob = async (jobId) => {
    await supabase.from("sequence_jobs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "cancelled" } : j));
    setCancelConfirm(null);
  };

  const cancelAllForSequence = async (seqId) => {
    await supabase.from("sequence_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("sequence_id", seqId).eq("user_id", user.id).eq("status", "active");
    await fetchData();
    setCancelConfirm(null);
  };

  const filtered = selectedSeq === "all" ? jobs : jobs.filter(j => j.sequence_id === selectedSeq);

  // Stats
  const totalHotels   = new Set(jobs.map(j => j.hotel_email)).size;
  const totalReplied  = jobs.filter(j => j.replied_at).length;
  const totalActive   = jobs.filter(j => j.status === "active").length;
  const totalComplete = jobs.filter(j => j.status === "completed").length;
  const replyRate     = totalHotels > 0 ? Math.round((totalReplied / totalHotels) * 100) : 0;

  const statusColor = (status) => {
    if (status === "active")    return { bg:"#e8f8f5", color:"#1A6B5A" };
    if (status === "completed") return { bg:"#eef2ff", color:"#4338ca" };
    if (status === "replied")   return { bg:"#dcfce7", color:"#166534" };
    if (status === "cancelled") return { bg:"#f1f5f9", color:"#64748b" };
    return { bg:"#f1f5f9", color:"#64748b" };
  };

  return (
    <div>
      <h2 style={{ fontSize:20, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:20 }}>Email Tracking</h2>
      {/* Stats */}
      <div style={{ ...s.statsRow, gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)" }}>
        {[
          { label:"Hotels Reached", value: totalHotels, color:"#0F2544" },
          { label:"Replies Received", value: totalReplied, color:"#2A9D8F" },
          { label:"Active Sequences", value: totalActive, color:"#E85D3D" },
          { label:"Reply Rate", value: `${replyRate}%`, color:"#C13584" },
        ].map((stat, i) => (
          <div key={i} style={s.statCard}>
            <p style={{ ...s.statValue, color: stat.color }}>{stat.value}</p>
            <p style={s.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filter by sequence */}
      <div style={s.filterRow}>
        <button style={{ ...s.filterBtn, ...(selectedSeq === "all" ? s.filterBtnActive : {}) }} onClick={() => setSelectedSeq("all")}>
          All Sequences
        </button>
        {sequences.map(seq => (
          <button key={seq.id}
            style={{ ...s.filterBtn, ...(selectedSeq === seq.id ? s.filterBtnActive : {}) }}
            onClick={() => setSelectedSeq(seq.id)}>
            {seq.name.length > 20 ? seq.name.substring(0, 20) + "..." : seq.name}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      {loading ? (
        <div style={s.empty}><div style={s.spinner} /></div>
      ) : filtered.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize:36 }}>📊</span>
          <p style={{ fontSize:14, color:"#9FB3C8", marginTop:12, textAlign:"center" }}>
            No sequence jobs yet. Launch a sequence from the Sequences tab.
          </p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <div style={s.tableHead}>
            <div style={{ ...s.th, flex:2 }}>Hotel</div>
            <div style={{ ...s.th, flex:2 }}>Sequence</div>
            <div style={{ ...s.th, flex:1 }}>Step</div>
            <div style={{ ...s.th, flex:1 }}>Status</div>
            <div style={{ ...s.th, flex:2 }}>Next Send</div>
            <div style={{ ...s.th, flex:1 }}>Started</div>
            <div style={{ width:40 }}></div>
          </div>
          {filtered.map(job => {
            const sc = statusColor(job.status);
            return (
              <div key={job.id} style={s.tableRow}>
                <div style={{ flex:2, paddingRight:12 }}>
                  <p style={s.hotelName}>{job.hotel_name}</p>
                  <p style={s.hotelEmail}>{job.hotel_email}</p>
                </div>
                <div style={{ flex:2, paddingRight:12 }}>
                  <p style={s.seqName}>{job.sequences?.name || "Unknown"}</p>
                </div>
                <div style={{ flex:1, paddingRight:12 }}>
                  <span style={s.stepBadge}>Step {job.current_step}</span>
                </div>
                <div style={{ flex:1, paddingRight:12 }}>
                  <span style={{ ...s.statusBadge, background: sc.bg, color: sc.color }}>
                    {job.replied_at ? "Replied" : job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>
                <div style={{ flex:2, paddingRight:12 }}>
                  {job.status === "active" && !job.replied_at ? (
                    <p style={s.nextSend}>{nextSend(job.next_send_at)}</p>
                  ) : job.replied_at ? (
                    <p style={s.repliedAt}>Replied {timeAgo(job.replied_at)}</p>
                  ) : (
                    <p style={s.nextSend}>-</p>
                  )}
                </div>
                <div style={{ flex:1, paddingRight:12 }}>
                  <p style={s.startedAt}>{timeAgo(job.started_at)}</p>
                </div>
                <div style={{ width:40, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  {job.status === "active" && (
                    <button style={s.cancelBtn} onClick={() => setCancelConfirm(job.id)} title="Cancel">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cancelConfirm && (
        <div style={s.overlay}>
          <div style={{ background:"#fff", borderRadius:16, padding:28, maxWidth:380, width:"100%" }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", marginBottom:8 }}>Cancel this sequence?</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>No more emails will be sent to this hotel.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={{ padding:"10px 20px", border:"1.5px solid #DDD5CC", borderRadius:9, background:"#fff", fontSize:13, cursor:"pointer", fontFamily:"inherit", color:"#4A6A8A" }} onClick={() => setCancelConfirm(null)}>Keep Active</button>
              <button style={{ padding:"10px 20px", background:"#ef4444", color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }} onClick={() => cancelJob(cancelConfirm)}>Cancel Sequence</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  statsRow: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:28 },
  statCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"18px 20px" },
  statValue: { fontSize:32, fontWeight:700, letterSpacing:"-0.5px", marginBottom:4 },
  statLabel: { fontSize:12, color:"#9FB3C8", fontWeight:500 },
  filterRow: { display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" },
  filterBtn: { padding:"6px 14px", border:"1px solid #DDD5CC", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", color:"#9FB3C8", background:"#fff", fontFamily:"inherit", transition:"all 0.15s" },
  filterBtnActive: { background:"#0F2544", color:"#F7F3EF", border:"1px solid #0F2544" },
  tableWrap: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", overflow:"auto", WebkitOverflowScrolling:"touch" },
  tableHead: { display:"flex", padding:"10px 20px", background:"#FAF7F4", borderBottom:"1px solid #F0EBE5", minWidth:700 },
  th: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" },
  tableRow: { display:"flex", padding:"14px 20px", borderBottom:"1px solid #F8F4F0", alignItems:"center", minWidth:700 },
  hotelName: { fontSize:13, fontWeight:600, color:"#0F2544", marginBottom:2 },
  hotelEmail: { fontSize:11, color:"#9FB3C8" },
  seqName: { fontSize:13, color:"#1E3A5F", fontWeight:500 },
  stepBadge: { fontSize:11, fontWeight:700, background:"#F0EBE5", color:"#4A6A8A", padding:"3px 10px", borderRadius:20 },
  statusBadge: { fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 },
  nextSend: { fontSize:12, color:"#1E3A5F", fontWeight:500 },
  repliedAt: { fontSize:12, color:"#2A9D8F", fontWeight:600 },
  startedAt: { fontSize:11, color:"#9FB3C8" },
  cancelBtn: { background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center", justifyContent:"center" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:8 },
  spinner: { width:24, height:24, border:"2.5px solid #F0EBE5", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
};
