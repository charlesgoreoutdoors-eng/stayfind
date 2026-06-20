"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/auth";
import { useIsMobile } from "../../../../lib/useIsMobile";

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

export default function SequenceDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const router = useRouter();
  const isMobile = useIsMobile();

  const [sequence, setSequence]       = useState(null);
  const [jobs, setJobs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [showDelete, setShowDelete]   = useState(false);
  const [deleting, setDeleting]       = useState(false);

  useEffect(() => { if (user && id) fetchData(); }, [user, id]);

  const fetchData = async () => {
    setLoading(true);
    const [seqRes, jobsRes] = await Promise.all([
      supabase.from("sequences").select("*").eq("id", id).eq("user_id", user.id).single(),
      supabase.from("sequence_jobs").select("*").eq("sequence_id", id).eq("user_id", user.id).order("started_at", { ascending: false }),
    ]);
    setSequence(seqRes.data);
    setJobs(jobsRes.data || []);
    setLoading(false);
  };

  const cancelJob = async (jobId) => {
    await supabase.from("sequence_jobs").update({ status: "cancelled", completed_at: new Date().toISOString() }).eq("id", jobId);
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: "cancelled", completed_at: new Date().toISOString() } : j));
    setCancelConfirm(null);
  };

  const deleteSequence = async () => {
    setDeleting(true);
    // Cancel all active jobs first, then delete jobs and the sequence
    await supabase.from("sequence_jobs").delete().eq("sequence_id", id).eq("user_id", user.id);
    await supabase.from("sequences").delete().eq("id", id).eq("user_id", user.id);
    router.push("/sequences/tracking");
  };

  const cancelAll = async () => {
    await supabase.from("sequence_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("sequence_id", id).eq("user_id", user.id).eq("status", "active");
    await fetchData();
    setCancelConfirm(null);
  };

  const total     = new Set(jobs.map(j => j.hotel_email)).size;
  const active    = jobs.filter(j => j.status === "active").length;
  const replied   = jobs.filter(j => j.replied_at).length;
  const completed = jobs.filter(j => j.status === "completed").length;
  const cancelled = jobs.filter(j => j.status === "cancelled").length;
  const replyRate = total > 0 ? Math.round((replied / total) * 100) : 0;

  const statusColor = (status) => {
    if (status === "active")    return { bg:"#e8f8f5", color:"#1A6B5A" };
    if (status === "completed") return { bg:"#eef2ff", color:"#4338ca" };
    if (status === "replied")   return { bg:"#dcfce7", color:"#166534" };
    if (status === "cancelled") return { bg:"#f1f5f9", color:"#64748b" };
    return { bg:"#f1f5f9", color:"#64748b" };
  };

  return (
    <div>
      {/* Back link */}
      <Link href="/sequences/tracking" style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:13, color:"#9FB3C8", textDecoration:"none", marginBottom:20, fontWeight:500 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All Sequences
      </Link>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <h2 style={{ fontSize:20, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px" }}>
          {sequence?.name || "Sequence"}
        </h2>
        <div style={{ display:"flex", gap:8 }}>
          {active > 0 && (
            <button style={s.cancelAllBtn} onClick={() => setCancelConfirm("all")}>
              Cancel All Active
            </button>
          )}
          <button style={s.deleteBtn} onClick={() => setShowDelete(true)}>
            Delete Sequence
          </button>
        </div>
      </div>

      {/* Stats for this sequence */}
      <div style={{ ...s.statsRow, gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(5,1fr)", marginBottom:24 }}>
        {[
          { label:"Hotels",      value: total,      color:"#0F2544" },
          { label:"Active",      value: active,     color:"#E85D3D" },
          { label:"Replied",     value: replied,    color:"#2A9D8F" },
          { label:"Completed",   value: completed,  color:"#4338ca" },
          { label:"Reply Rate",  value: `${replyRate}%`, color:"#C13584" },
        ].map((stat, i) => (
          <div key={i} style={s.statCard}>
            <p style={{ ...s.statValue, color: stat.color }}>{loading ? "—" : stat.value}</p>
            <p style={s.statLabel}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Jobs table */}
      {loading ? (
        <div style={s.empty}><div style={s.spinner} /></div>
      ) : jobs.length === 0 ? (
        <div style={s.empty}>
          <span style={{ fontSize:36 }}>📭</span>
          <p style={{ fontSize:14, color:"#9FB3C8", marginTop:12 }}>No jobs in this sequence yet.</p>
        </div>
      ) : (
        <div style={s.tableWrap}>
          <div style={s.tableHead}>
            <div style={{ ...s.th, flex:2 }}>Hotel</div>
            <div style={{ ...s.th, flex:1 }}>Step</div>
            <div style={{ ...s.th, flex:1 }}>Status</div>
            <div style={{ ...s.th, flex:2 }}>Next Send</div>
            <div style={{ ...s.th, flex:1 }}>Started</div>
            <div style={{ width:40 }} />
          </div>
          {jobs.map(job => {
            const sc = statusColor(job.status);
            return (
              <div key={job.id} style={s.tableRow}>
                <div style={{ flex:2, paddingRight:12 }}>
                  <p style={s.hotelName}>{job.hotel_name}</p>
                  <p style={s.hotelEmail}>{job.hotel_email}</p>
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
                    <p style={s.nextSend}>—</p>
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

      {/* Cancel confirm modal */}
      {showDelete && (
        <div style={s.overlay}>
          <div style={{ background:"#fff", borderRadius:16, padding:28, maxWidth:380, width:"100%" }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", marginBottom:8 }}>Delete this sequence?</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>
              This will permanently delete <strong>{sequence?.name}</strong> and all its tracking data. Any active jobs will be cancelled. This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.keepBtn} onClick={() => setShowDelete(false)} disabled={deleting}>Keep It</button>
              <button style={s.confirmCancelBtn} onClick={deleteSequence} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelConfirm && (
        <div style={s.overlay}>
          <div style={{ background:"#fff", borderRadius:16, padding:28, maxWidth:380, width:"100%" }}>
            {cancelConfirm === "all" ? (
              <>
                <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", marginBottom:8 }}>Cancel all active jobs?</h3>
                <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>No more emails will be sent for this sequence.</p>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button style={s.keepBtn} onClick={() => setCancelConfirm(null)}>Keep Active</button>
                  <button style={s.confirmCancelBtn} onClick={cancelAll}>Cancel All</button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", marginBottom:8 }}>Cancel this job?</h3>
                <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>No more emails will be sent to this hotel.</p>
                <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
                  <button style={s.keepBtn} onClick={() => setCancelConfirm(null)}>Keep Active</button>
                  <button style={s.confirmCancelBtn} onClick={() => cancelJob(cancelConfirm)}>Cancel Job</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  statsRow: { display:"grid", gap:14, marginBottom:24 },
  statCard: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", padding:"16px 18px" },
  statValue: { fontSize:28, fontWeight:700, letterSpacing:"-0.5px", marginBottom:4 },
  statLabel: { fontSize:12, color:"#9FB3C8", fontWeight:500 },
  cancelAllBtn: { padding:"8px 16px", background:"#fff", border:"1.5px solid #ef4444", borderRadius:9, fontSize:13, fontWeight:600, color:"#ef4444", cursor:"pointer" },
  deleteBtn: { padding:"8px 16px", background:"#ef4444", border:"none", borderRadius:9, fontSize:13, fontWeight:600, color:"#fff", cursor:"pointer" },
  tableWrap: { background:"#fff", borderRadius:14, border:"1px solid #DDD5CC", overflow:"auto" },
  tableHead: { display:"flex", padding:"10px 20px", background:"#FAF7F4", borderBottom:"1px solid #F0EBE5", minWidth:600 },
  th: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" },
  tableRow: { display:"flex", padding:"14px 20px", borderBottom:"1px solid #F8F4F0", alignItems:"center", minWidth:600 },
  hotelName: { fontSize:13, fontWeight:600, color:"#0F2544", marginBottom:2 },
  hotelEmail: { fontSize:11, color:"#9FB3C8" },
  stepBadge: { fontSize:11, fontWeight:700, background:"#F0EBE5", color:"#4A6A8A", padding:"3px 10px", borderRadius:20 },
  statusBadge: { fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 },
  nextSend: { fontSize:12, color:"#1E3A5F", fontWeight:500 },
  repliedAt: { fontSize:12, color:"#2A9D8F", fontWeight:600 },
  startedAt: { fontSize:11, color:"#9FB3C8" },
  cancelBtn: { background:"none", border:"none", cursor:"pointer", padding:4, display:"flex", alignItems:"center", justifyContent:"center" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", gap:8 },
  spinner: { width:24, height:24, border:"2.5px solid #F0EBE5", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  overlay: { position:"fixed", inset:0, background:"rgba(15,37,68,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  keepBtn: { padding:"10px 20px", border:"1.5px solid #DDD5CC", borderRadius:9, background:"#fff", fontSize:13, cursor:"pointer", fontFamily:"inherit", color:"#4A6A8A" },
  confirmCancelBtn: { padding:"10px 20px", background:"#ef4444", color:"#fff", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
};
