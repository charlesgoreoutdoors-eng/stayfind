"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const STATUS_LABEL = {
  invited: "Invited", new: "Applied", shortlisted: "Shortlisted", offered: "Offer sent",
  booked: "Booked", content_submitted: "Content submitted", completed: "Completed",
  declined: "Declined", withdrawn: "Withdrawn",
};

// Save / Message / Invite actions for a creator, shown on their profile.
export default function CreatorActionBar({ creatorId, creatorName }) {
  const { user } = useAuth();
  const router = useRouter();
  const [hotelId, setHotelId] = useState(null);
  const [jobs, setJobs] = useState([]);              // this hotel's open opportunities
  const [apps, setApps] = useState({});              // opportunity_id -> { id, status }
  const [saved, setSaved] = useState(false);
  const [savingSave, setSavingSave] = useState(false);
  const [modal, setModal] = useState(null);          // "invite" | "message" | null
  const [busyOpp, setBusyOpp] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user || !creatorId) return;
    const { data: hp } = await supabase.from("hotel_profiles").select("id").eq("user_id", user.id).maybeSingle();
    const hid = hp?.id || null;
    setHotelId(hid);

    const [{ data: opps }, { data: existing }, { data: sv }] = await Promise.all([
      hid ? supabase.from("opportunities").select("id, title, status").eq("hotel_id", hid).eq("status", "open").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
      supabase.from("applications").select("id, opportunity_id, status").eq("creator_id", creatorId),
      supabase.from("saved_creators").select("creator_id").eq("creator_id", creatorId).maybeSingle(),
    ]);
    setJobs(opps || []);
    const map = {};
    (existing || []).forEach(a => { map[a.opportunity_id] = { id: a.id, status: a.status }; });
    setApps(map);
    setSaved(!!sv);
  }, [user, creatorId]);

  useEffect(() => { load(); }, [load]);

  const toggleSave = async () => {
    if (!user || savingSave) return;
    setSavingSave(true); setError("");
    if (saved) {
      const { error } = await supabase.from("saved_creators").delete().eq("creator_id", creatorId).eq("hotel_user_id", user.id);
      if (error) setError(error.message); else setSaved(false);
    } else {
      const { error } = await supabase.from("saved_creators").insert({ hotel_user_id: user.id, creator_id: creatorId });
      if (error) setError(error.message); else setSaved(true);
    }
    setSavingSave(false);
  };

  // Create an invite (application) for this creator on the given job.
  const invite = async (opp) => {
    setBusyOpp(opp.id); setError("");
    const { data, error } = await supabase
      .from("applications")
      .insert({ opportunity_id: opp.id, creator_id: creatorId, status: "invited", creator_name: creatorName || null })
      .select("id, opportunity_id, status")
      .single();
    setBusyOpp(null);
    if (error) {
      if (error.code === "23505") {
        // Already in this job's pipeline — fetch the existing row.
        const { data: ex } = await supabase.from("applications").select("id, opportunity_id, status").eq("opportunity_id", opp.id).eq("creator_id", creatorId).maybeSingle();
        if (ex) { setApps(prev => ({ ...prev, [opp.id]: { id: ex.id, status: ex.status } })); return { id: ex.id, status: ex.status }; }
        return null;
      }
      setError(error.message); return null;
    }
    setApps(prev => ({ ...prev, [opp.id]: { id: data.id, status: data.status } }));
    return { id: data.id, status: data.status };
  };

  // Message on a given job: open the existing thread, or start one then open it.
  const messageOn = async (opp) => {
    const existing = apps[opp.id];
    if (existing) { router.push(`/hotel/inbox/${existing.id}`); return; }
    const created = await invite(opp);
    if (created) router.push(`/hotel/inbox/${created.id}`);
  };

  const anyThread = Object.values(apps)[0];   // a conversation already exists somewhere

  return (
    <>
      <div style={s.bar}>
        <button style={s.primaryBtn} onClick={() => setModal("message")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          Message
        </button>
        <button style={s.secondaryBtn} onClick={() => setModal("invite")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
          Invite to a job
        </button>
        <button style={{ ...s.saveBtn, ...(saved ? s.saveBtnOn : {}) }} onClick={toggleSave} disabled={savingSave}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
          {saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <p style={s.errorLine}>{error}</p>}

      {modal && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>{modal === "invite" ? "Invite to a job" : "Message creator"}</h3>
              <button style={s.close} onClick={() => setModal(null)} aria-label="Close">✕</button>
            </div>
            <p style={s.modalSub}>
              {modal === "invite"
                ? `Invite ${creatorName || "this creator"} to apply to one of your open jobs.`
                : anyThread
                  ? "Open an existing conversation, or start one on another job."
                  : "Pick a job to start the conversation — this invites the creator and opens the thread."}
            </p>

            {!hotelId ? (
              <div style={s.emptyBox}>Set up your <Link href="/hotel/profile" style={s.inlineLink}>hotel profile</Link> first.</div>
            ) : jobs.length === 0 ? (
              <div style={s.emptyBox}>You have no open jobs. <Link href="/hotel/jobs" style={s.inlineLink}>Post a job</Link> to invite creators.</div>
            ) : (
              <div style={s.jobList}>
                {jobs.map(j => {
                  const a = apps[j.id];
                  const busy = busyOpp === j.id;
                  return (
                    <div key={j.id} style={s.jobRow}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={s.jobTitle}>{j.title}</div>
                        {a && <div style={s.jobMeta}>{STATUS_LABEL[a.status] || a.status}</div>}
                      </div>
                      {modal === "invite" ? (
                        a ? (
                          <span style={s.inPipeline}>{a.status === "invited" ? "Invited ✓" : "Currently in this job"}</span>
                        ) : (
                          <button style={s.rowBtn} onClick={() => invite(j)} disabled={busy}>{busy ? "…" : "Invite"}</button>
                        )
                      ) : (
                        <button style={s.rowBtn} onClick={() => messageOn(j)} disabled={busy}>{busy ? "…" : a ? "Open chat" : "Start chat"}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {error && <p style={s.errorLine}>{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  bar: { display: "flex", gap: 8, flexWrap: "wrap" },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  secondaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "var(--color-ground-card)", color: "var(--color-ink-primary)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  saveBtn: { display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 16px", background: "var(--color-ground-card)", color: "var(--color-ink-primary)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  saveBtnOn: { color: "var(--color-accent-amber-deep)", borderColor: "var(--color-accent-amber)", background: "rgba(224,149,74,0.10)" },
  errorLine: { fontSize: 12.5, color: "var(--color-error)", fontWeight: 600, marginTop: 8 },

  overlay: { position: "fixed", inset: 0, background: "rgba(43,39,34,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-popup)", padding: "22px 24px", maxWidth: 460, width: "100%", maxHeight: "80vh", overflowY: "auto" },
  modalHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--color-ink-primary)" },
  close: { background: "none", border: "none", fontSize: 16, color: "var(--color-ink-muted)", cursor: "pointer", lineHeight: 1, padding: 4 },
  modalSub: { fontSize: 13.5, color: "var(--color-ink-mid)", lineHeight: 1.55, marginTop: 4, marginBottom: 16 },
  emptyBox: { background: "var(--color-ground-sand)", borderRadius: "var(--radius-md)", padding: "16px 18px", fontSize: 13.5, color: "var(--color-ink-mid)", textAlign: "center" },
  inlineLink: { color: "var(--color-accent-amber-deep)", fontWeight: 700 },
  jobList: { display: "flex", flexDirection: "column", gap: 8 },
  jobRow: { display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "12px 14px", background: "var(--color-ground-card)" },
  jobTitle: { fontSize: 14, fontWeight: 700, color: "var(--color-ink-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  jobMeta: { fontSize: 12, color: "var(--color-ink-muted)", marginTop: 2 },
  rowBtn: { flexShrink: 0, padding: "8px 14px", background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  inPipeline: { flexShrink: 0, fontSize: 12, fontWeight: 700, color: "var(--color-accent-amber-deep)", background: "rgba(224,149,74,0.14)", padding: "6px 12px", borderRadius: "var(--radius-pill)" },
};
