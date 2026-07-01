"use client";
// v2
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { useIsMobile } from "../../../lib/useIsMobile";
import { useGmail } from "../../../lib/useGmail";

const DELAY_OPTIONS = [
  { value: 1, label: "1 day later" },
  { value: 2, label: "2 days later" },
  { value: 3, label: "3 days later" },
  { value: 5, label: "5 days later" },
  { value: 7, label: "7 days later" },
  { value: 10, label: "10 days later" },
  { value: 14, label: "14 days later" },
];

function RichEditor({ initialHtml, onChange, placeholder }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className="rich-editor"
      data-placeholder={placeholder}
      style={{ minHeight: 180, outline: "none", lineHeight: 1.75, fontSize: 13, fontFamily: "inherit", color: "#1E3A5F" }}
      onInput={() => onChange && onChange(ref.current?.innerHTML || "")}
    />
  );
}

function StepCard({ step, number, templates, onChange, onRemove, canRemove }) {
  const fmt = (cmd) => { document.execCommand(cmd, false, undefined); };
  const ToolBtn = ({ cmd, title, children }) => (
    <button style={s.toolBtn} title={title} onMouseDown={e => { e.preventDefault(); fmt(cmd); }}>
      {children}
    </button>
  );
  return (
    <div style={s.stepCard}>
      <div style={s.stepHeader}>
        <div style={s.stepBadge}>{number === 1 ? "Email 1" : number === 2 ? "Follow-up 1" : "Follow-up 2"}</div>
        {number === 1 && <span style={s.stepNote}>Sends immediately when launched</span>}
        {number > 1 && (
          <select style={s.delaySelect} value={step.delayDays}
            onChange={e => onChange({ ...step, delayDays: parseInt(e.target.value) })}>
            {DELAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {canRemove && (
          <button style={s.removeBtn} onClick={onRemove}>Remove</button>
        )}
      </div>

      <div style={s.field}>
        <label style={s.label}>Load from Template (optional)</label>
        <select style={s.select} value={step.templateId || ""}
          onChange={e => {
            const t = templates.find(t => t.id === e.target.value);
            onChange({ ...step, templateId: e.target.value, subject: t?.subject || step.subject, body: t?.body || step.body });
          }}>
          <option value="">Write from scratch...</option>
          {templates.filter(t => t.type !== "instagram").map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div style={s.field}>
        <label style={s.label}>Subject</label>
        <input style={s.input} placeholder="Email subject..."
          value={step.subject} onChange={e => onChange({ ...step, subject: e.target.value })} />
      </div>

      <div style={s.field}>
        <label style={s.label}>Message</label>
        <p style={s.hint}>Use <code style={s.code}>{"{hotel_name}"}</code> to auto-fill the hotel name</p>
        <div style={{ display: "flex", gap: 4, marginBottom: 6, flexWrap: "wrap" }}>
          <ToolBtn cmd="bold" title="Bold"><strong>B</strong></ToolBtn>
          <ToolBtn cmd="italic" title="Italic"><em>I</em></ToolBtn>
          <ToolBtn cmd="underline" title="Underline"><u>U</u></ToolBtn>
          <div style={{ width: 1, height: 20, background: "#DDD5CC", margin: "0 2px", alignSelf: "center" }} />
          <ToolBtn cmd="insertUnorderedList" title="Bullets">• List</ToolBtn>
          <ToolBtn cmd="insertOrderedList" title="Numbered">1. List</ToolBtn>
        </div>
        <div style={{ border: "1.5px solid #DDD5CC", borderRadius: 10, padding: "11px 14px" }}>
          <RichEditor
            key={`step-${number}-${step.templateId || "custom"}`}
            initialHtml={step.body}
            onChange={html => onChange({ ...step, body: html })}
            placeholder="Hi {hotel_name} team,&#10;&#10;Write your message here..."
          />
        </div>
      </div>
    </div>
  );
}

function LaunchModal({ sequence, lists, allHotels, onClose, onLaunch, launching }) {
  const [mode, setMode] = useState("list"); // "list" | "hotel"
  const [selectedListId, setSelectedListId] = useState("");
  const [selectedHotelId, setSelectedHotelId] = useState("");
  const { gmailToken } = useGmail();

  const listHotels = allHotels.filter(h => h.list_id === selectedListId && h.email);
  const hotelsWithEmail = allHotels.filter(h => h.email);

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Launch "{sequence.name}"</h3>
          <button style={s.modalClose} onClick={onClose}>x</button>
        </div>

        <div style={s.modalBody}>
          {gmailToken
            ? <div style={{ display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#166534", fontWeight:500 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e" }} />
                Gmail connected — ready to send
              </div>
            : <div style={{ background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#92400e" }}>
                Gmail not connected. Go to the Messages page to connect first.
              </div>
          }

          <div style={s.modeRow}>
            <button style={{ ...s.modeBtn, ...(mode === "list" ? s.modeBtnActive : {}) }} onClick={() => setMode("list")}>
              Send to a List
            </button>
            <button style={{ ...s.modeBtn, ...(mode === "hotel" ? s.modeBtnActive : {}) }} onClick={() => setMode("hotel")}>
              Send to One Hotel
            </button>
          </div>

          {mode === "list" && (
            <div style={s.field}>
              <label style={s.label}>Select List</label>
              <select style={s.select} value={selectedListId} onChange={e => setSelectedListId(e.target.value)}>
                <option value="">Choose a list...</option>
                {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              {selectedListId && (
                <p style={s.launchInfo}>
                  {listHotels.length} hotels with email addresses in this list
                </p>
              )}
            </div>
          )}

          {mode === "hotel" && (
            <div style={s.field}>
              <label style={s.label}>Select Hotel</label>
              <select style={s.select} value={selectedHotelId} onChange={e => setSelectedHotelId(e.target.value)}>
                <option value="">Choose a hotel...</option>
                {hotelsWithEmail.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}

          <div style={s.stepsPreview}>
            <p style={s.stepsPreviewTitle}>Sequence steps:</p>
            {sequence.steps.map((step, i) => (
              <div key={i} style={s.stepsPreviewItem}>
                <div style={s.stepsPreviewDot} />
                <span style={s.stepsPreviewText}>
                  {i === 0 ? "Email 1 — sends immediately" : `Follow-up ${i} — sends ${step.delayDays} day${step.delayDays !== 1 ? "s" : ""} after previous`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={s.modalFooter}>
          <button style={s.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={{ ...s.launchBtn, opacity: (!gmailToken || (mode === "list" ? !selectedListId : !selectedHotelId)) ? 0.45 : 1 }}
            disabled={!gmailToken || (mode === "list" ? !selectedListId : !selectedHotelId) || launching}
            onClick={() => onLaunch({ mode, listId: selectedListId, hotelId: selectedHotelId, gmailToken })}
          >
            {launching ? "Launching..." : `Launch Sequence`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SequenceBuilderPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [sequences, setSequences]   = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [lists, setLists]           = useState([]);
  const [allHotels, setAllHotels]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [launching, setLaunching]   = useState(false);
  const [launchModal, setLaunchModal] = useState(null);
  const [activeSeq, setActiveSeq]   = useState(null);
  const [isNew, setIsNew]           = useState(false);
  const [form, setForm]             = useState({ name: "", steps: [{ stepNumber:1, templateId:"", subject:"", body:"", delayDays:0 }] });
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { if (user) { fetchAll(); } }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [seqRes, tmplRes, listsRes, hotelsRes] = await Promise.all([
      supabase.from("sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("list_hotels").select("*").eq("user_id", user.id),
    ]);
    setTemplates(tmplRes.data || []);
    setLists(listsRes.data || []);
    setAllHotels(hotelsRes.data || []);

    // Fetch steps for each sequence
    const seqs = seqRes.data || [];
    const withSteps = await Promise.all(seqs.map(async seq => {
      const { data: steps } = await supabase.from("sequence_steps").select("*").eq("sequence_id", seq.id).eq("user_id", user.id).order("step_number");
      return { ...seq, steps: steps || [] };
    }));
    setSequences(withSteps);
    setLoading(false);
  };

  const newSequence = () => {
    setActiveSeq(null);
    setIsNew(true);
    setForm({ name: "", steps: [{ stepNumber:1, templateId:"", subject:"", body:"", delayDays:0 }] });
    setError("");
  };

  const selectSequence = (seq) => {
    setActiveSeq(seq);
    setIsNew(false);
    setForm({
      name: seq.name,
      steps: seq.steps.map(st => ({ stepNumber: st.step_number, templateId: st.template_id || "", subject: st.subject || "", body: st.body || "", delayDays: st.delay_days || 0 })),
    });
    setError("");
  };

  const addStep = () => {
    if (form.steps.length >= 3) return;
    setForm(f => ({ ...f, steps: [...f.steps, { stepNumber: f.steps.length + 1, templateId:"", subject:"", body:"", delayDays: 3 }] }));
  };

  const updateStep = (i, updated) => {
    setForm(f => ({ ...f, steps: f.steps.map((st, idx) => idx === i ? updated : st) }));
  };

  const removeStep = (i) => {
    setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, stepNumber: idx + 1 })) }));
  };

  const save = async () => {
    if (!user) { setError("Not logged in. Please refresh and try again."); return; }
    if (!form.name.trim()) { setError("Please enter a sequence name before saving."); return; }
    if (form.steps.some(st => !st.body.trim())) { setError("All steps need a message — check each email has content."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/save-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          userId: user.id,
          sequenceId: isNew ? null : activeSeq.id,
          steps: form.steps.map(st => ({
            stepNumber: st.stepNumber,
            templateId: st.templateId || null,
            delayDays: st.delayDays || 0,
            subject: st.subject || "",
            body: st.body,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Save failed");

      setSuccess(isNew ? "Sequence created!" : "Sequence saved!");
      setTimeout(() => setSuccess(""), 2500);
      await fetchAll();
      setIsNew(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteSequence = async (id) => {
    await supabase.from("sequences").delete().eq("id", id);
    setSequences(prev => prev.filter(s => s.id !== id));
    if (activeSeq?.id === id) { setActiveSeq(null); setIsNew(false); }
    setDeleteConfirm(null);
  };

  const launchSequence = async ({ mode, listId, hotelId, gmailToken }) => {
    setLaunching(true);
    try {
      const hotels = mode === "list"
        ? allHotels.filter(h => h.list_id === listId && h.email)
        : allHotels.filter(h => h.id === hotelId && h.email);

      if (hotels.length === 0) { alert("No hotels with email addresses found."); setLaunching(false); return; }

      const res = await fetch("/api/launch-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequenceId: launchModal.id, hotels, gmailToken, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Launch failed");

      setSuccess(`Sequence launched! ${data.sent} email${data.sent !== 1 ? "s" : ""} sent immediately.`);
      setTimeout(() => setSuccess(""), 4000);
      setLaunchModal(null);
    } catch (e) {
      alert("Could not launch: " + e.message);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div>
      {error && <div style={s.errorBox}>{error}</div>}
      {success && <div style={s.successBox}>{success}</div>}

      <div style={{ ...s.layout, gridTemplateColumns: isMobile ? "1fr" : "260px 1fr" }}>
        {/* Left panel */}
        <div style={s.listPanel}>
          <button style={s.newBtn} onClick={newSequence}>+ New Sequence</button>
          {loading ? (
            <div style={s.empty}><div style={s.spinner} /></div>
          ) : sequences.length === 0 && !isNew ? (
            <div style={s.empty}>
              <span style={{ fontSize:32 }}>✉️</span>
              <p style={{ fontSize:13, color:"#9FB3C8", textAlign:"center", marginTop:8 }}>No sequences yet. Create one to automate your outreach.</p>
            </div>
          ) : (
            sequences.map(seq => (
              <div key={seq.id}
                style={{ ...s.seqItem, ...(activeSeq?.id === seq.id && !isNew ? s.seqItemActive : {}) }}
                onClick={() => selectSequence(seq)}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={s.seqName}>{seq.name}</p>
                  <p style={s.seqMeta}>{seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}</p>
                </div>
                <div style={{ display:"flex", gap:6 }} onClick={e => e.stopPropagation()}>
                  <button style={s.launchIconBtn} onClick={() => setLaunchModal(seq)} title="Launch sequence">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                  <button style={s.deleteIconBtn} onClick={() => setDeleteConfirm(seq.id)} title="Delete">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right: editor */}
        <div style={s.editor}>
          {!activeSeq && !isNew ? (
            <div style={s.empty}>
              <span style={{ fontSize:36 }}>📧</span>
              <p style={{ fontSize:14, color:"#9FB3C8", marginTop:12 }}>Select a sequence to edit or create a new one</p>
            </div>
          ) : (
            <>
              <div style={s.editorHeader}>
                <input style={s.nameInput} placeholder="Sequence name e.g. Hotel Outreach Summer 2025"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              {form.steps.map((step, i) => (
                <StepCard key={i} step={step} number={i + 1} templates={templates}
                  onChange={updated => updateStep(i, updated)}
                  onRemove={() => removeStep(i)}
                  canRemove={form.steps.length > 1 && i > 0} />
              ))}

              {form.steps.length < 3 && (
                <button style={s.addStepBtn} onClick={addStep}>
                  + Add Follow-up Email
                </button>
              )}

              <div style={s.saveRow}>
                <button style={{ ...s.saveBtn, opacity: saving ? 0.45 : 1 }}
                  onClick={save} disabled={saving}>
                  {saving ? "Saving..." : isNew ? "Create Sequence" : "Save Changes"}
                </button>
                {activeSeq && (
                  <button style={s.launchBtn} onClick={() => setLaunchModal(activeSeq)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Launch Sequence
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {launchModal && (
        <LaunchModal
          sequence={{ ...launchModal, steps: launchModal.steps.map(st => ({ delayDays: st.delay_days })) }}
          lists={lists} allHotels={allHotels}
          onClose={() => setLaunchModal(null)}
          onLaunch={launchSequence}
          launching={launching}
        />
      )}

      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={{ ...s.modal, maxWidth:380 }}>
            <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", marginBottom:8 }}>Delete this sequence?</h3>
            <p style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ ...s.launchBtn, background:"#ef4444" }} onClick={() => deleteSequence(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  layout: { display:"grid", gridTemplateColumns:"260px 1fr", gap:20, alignItems:"start" },
  listPanel: { display:"flex", flexDirection:"column", gap:8 },
  newBtn: { width:"100%", padding:"10px 16px", background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", marginBottom:4 },
  seqItem: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:12, border:"1.5px solid #DDD5CC", cursor:"pointer", background:"#fff", transition:"all 0.15s" },
  seqItemActive: { border:"1.5px solid #E85D3D", background:"#FEF0EC" },
  seqName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:2 },
  seqMeta: { fontSize:11, color:"#9FB3C8" },
  launchIconBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid #F5A882", background:"#FEF0EC", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  deleteIconBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid #fee2e2", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  editor: { background:"#fff", borderRadius:16, border:"1.5px solid #DDD5CC", padding:"24px" },
  editorHeader: { marginBottom:24 },
  nameInput: { width:"100%", border:"none", outline:"none", fontSize:20, fontWeight:700, color:"#0F2544", fontFamily:"inherit", borderBottom:"2px solid #F0EBE5", paddingBottom:8 },
  stepCard: { background:"#FAF7F4", borderRadius:14, border:"1px solid #F0EBE5", padding:"20px", marginBottom:16 },
  stepHeader: { display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" },
  stepBadge: { fontSize:12, fontWeight:700, color:"#E85D3D", background:"#FEF0EC", padding:"4px 12px", borderRadius:20 },
  stepNote: { fontSize:12, color:"#9FB3C8" },
  delaySelect: { border:"1.5px solid #DDD5CC", borderRadius:8, padding:"6px 12px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", background:"#fff", cursor:"pointer" },
  removeBtn: { marginLeft:"auto", fontSize:12, color:"#ef4444", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
  field: { marginBottom:14 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  hint: { fontSize:12, color:"#9FB3C8", marginBottom:6 },
  code: { background:"#F0EBE5", padding:"1px 6px", borderRadius:4, fontSize:11, fontFamily:"monospace" },
  select: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", background:"#fff", cursor:"pointer" },
  input: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none" },
  textarea: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", resize:"vertical", lineHeight:1.7 },
  charCount: { fontSize:11, color:"#CBD5E1", textAlign:"right", marginTop:3 },
  addStepBtn: { width:"100%", padding:"12px", border:"2px dashed #DDD5CC", borderRadius:12, fontSize:13, fontWeight:600, color:"#9FB3C8", background:"none", cursor:"pointer", fontFamily:"inherit", marginBottom:20, transition:"all 0.15s" },
  saveRow: { display:"flex", gap:12, marginTop:8 },
  saveBtn: { flex:1, padding:13, background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"opacity 0.2s" },
  launchBtn: { display:"flex", alignItems:"center", gap:8, padding:"13px 24px", background:"#E85D3D", color:"#fff", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 24px", gap:8 },
  spinner: { width:24, height:24, border:"2.5px solid #F0EBE5", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  errorBox: { background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:10, padding:"12px 16px", color:"#B83A22", fontSize:13, marginBottom:16 },
  successBox: { background:"#E8F8F5", border:"1px solid #A8E6E0", borderRadius:10, padding:"12px 16px", color:"#1A6B5A", fontSize:13, marginBottom:16 },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"#fff", borderRadius:16, width:"100%", maxWidth:500, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" },
  modalHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid #F0EBE5" },
  modalTitle: { fontSize:18, fontWeight:700, color:"#0F2544" },
  modalClose: { background:"none", border:"none", fontSize:16, cursor:"pointer", color:"#9FB3C8" },
  modalBody: { padding:"20px 24px", overflowY:"auto", flex:1 },
  modalFooter: { padding:"16px 24px", borderTop:"1px solid #F0EBE5", display:"flex", justifyContent:"flex-end", gap:12 },
  modeRow: { display:"flex", gap:8, marginBottom:20 },
  modeBtn: { flex:1, padding:"10px", border:"1.5px solid #DDD5CC", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"#4A6A8A", background:"#fff", transition:"all 0.15s" },
  modeBtnActive: { border:"1.5px solid #E85D3D", background:"#FEF0EC", color:"#E85D3D" },
  launchInfo: { fontSize:12, color:"#9FB3C8", marginTop:6 },
  stepsPreview: { background:"#FAF7F4", borderRadius:10, padding:"14px 16px", marginTop:8 },
  stepsPreviewTitle: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 },
  stepsPreviewItem: { display:"flex", alignItems:"center", gap:10, marginBottom:8 },
  stepsPreviewDot: { width:8, height:8, borderRadius:"50%", background:"#E85D3D", flexShrink:0 },
  stepsPreviewText: { fontSize:13, color:"#1E3A5F" },
  cancelBtn: { padding:"10px 20px", border:"1.5px solid #DDD5CC", borderRadius:9, background:"#fff", fontSize:13, cursor:"pointer", color:"#4A6A8A", fontFamily:"inherit" },
};
