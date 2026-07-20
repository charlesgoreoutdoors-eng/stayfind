"use client";
// v2
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
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

const RichEditor = forwardRef(function RichEditor({ initialHtml, onChange, placeholder }, ref) {
  const innerRef = useRef(null);
  useEffect(() => {
    if (innerRef.current) innerRef.current.innerHTML = initialHtml || "";
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useImperativeHandle(ref, () => innerRef.current, []);
  return (
    <div
      ref={innerRef}
      contentEditable
      suppressContentEditableWarning
      className="rich-editor"
      data-placeholder={placeholder}
      style={{ minHeight: 180, outline: "none", lineHeight: 1.8, fontSize: 13, fontFamily: "inherit", color: "var(--color-ink-primary)", padding: "12px 14px" }}
      onInput={() => onChange && onChange(innerRef.current?.innerHTML || "")}
    />
  );
});

function StepCard({ step, number, templates, onChange, onRemove, canRemove, signature }) {
  const editorRef = useRef(null);
  const execCmd = (cmd) => document.execCommand(cmd, false, undefined);
  const ToolBtn = ({ cmd, title, children }) => (
    <button style={s.toolBtn} title={title} onMouseDown={e => { e.preventDefault(); execCmd(cmd); }}>
      {children}
    </button>
  );

  const insertSignature = () => {
    const editor = editorRef.current;
    if (!editor || !signature?.trim()) return;
    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertHTML", false, `<br><br>${signature}`);
    onChange({ ...step, body: editor.innerHTML });
  };
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
        {/* Toolbar + editor in one bordered box */}
        <div style={s.richEditorBox}>
          <div style={s.toolbar}>
            <ToolBtn cmd="bold" title="Bold"><strong>B</strong></ToolBtn>
            <ToolBtn cmd="italic" title="Italic"><em>I</em></ToolBtn>
            <ToolBtn cmd="underline" title="Underline"><u>U</u></ToolBtn>
            <div style={s.toolSep} />
            <ToolBtn cmd="insertUnorderedList" title="Bullet list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
                <circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>
              </svg>
            </ToolBtn>
            <ToolBtn cmd="insertOrderedList" title="Numbered list">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
                <path d="M4 6h1v4" strokeLinecap="round"/><path d="M4 10h2" strokeLinecap="round"/>
              </svg>
            </ToolBtn>
            {signature && (
              <>
                <div style={s.toolSep} />
                <button style={{ ...s.toolBtn, fontSize: 12, color: "var(--color-accent-terracotta)", whiteSpace: "nowrap" }}
                  title="Insert your signature at the end of this message"
                  onMouseDown={e => { e.preventDefault(); insertSignature(); }}>
                  + Signature
                </button>
              </>
            )}
          </div>
          <div style={{ height: 1, background: "rgba(43,39,34,0.07)" }} />
          <RichEditor
            ref={editorRef}
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
  const [contactedIds, setContactedIds] = useState(null); // null = still loading
  const { gmailToken } = useGmail();

  // Hotels already targeted by THIS flow — any sequence_jobs row for this
  // sequence (active, completed, replied or bounced) means they were already
  // sent to, so relaunching a grown list should skip them automatically.
  useEffect(() => {
    let cancelled = false;
    supabase.from("sequence_jobs").select("hotel_id").eq("sequence_id", sequence.id)
      .then(({ data }) => {
        if (cancelled) return;
        setContactedIds(new Set((data || []).map(j => j.hotel_id).filter(Boolean)));
      });
    return () => { cancelled = true; };
  }, [sequence.id]);

  const listHotels = allHotels.filter(h => h.list_id === selectedListId && h.email);
  const newListHotels = contactedIds ? listHotels.filter(h => !contactedIds.has(h.id)) : [];
  const alreadyContactedCount = listHotels.length - newListHotels.length;
  const hotelsWithEmail = allHotels.filter(h => h.email);
  const selectedHotelAlreadyContacted = !!(contactedIds && selectedHotelId && contactedIds.has(selectedHotelId));

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Launch "{sequence.name}"</h3>
          <button style={s.modalClose} onClick={onClose}>x</button>
        </div>

        <div style={s.modalBody}>
          {gmailToken
            ? <div style={{ display:"flex", alignItems:"center", gap:8, background:"var(--status-success-bg)", border:"1px solid rgba(22,101,52,0.3)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"var(--status-success-ink)", fontWeight:500 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--status-success-ink)" }} />
                Gmail connected — ready to send
              </div>
            : <div style={{ background:"var(--color-amber-tint)", border:"1px solid var(--color-glow-1)", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"var(--color-accent-amber-deeper)" }}>
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
                contactedIds === null ? (
                  <p style={s.launchInfo}>Checking who's already been sent this flow…</p>
                ) : listHotels.length === 0 ? (
                  <p style={s.launchInfo}>No hotels with email addresses in this list.</p>
                ) : newListHotels.length === 0 ? (
                  <p style={s.launchWarning}>All {listHotels.length} hotel{listHotels.length !== 1 ? "s" : ""} in this list have already been sent this flow.</p>
                ) : alreadyContactedCount > 0 ? (
                  <p style={s.launchInfo}>
                    Sending to <strong>{newListHotels.length} new hotel{newListHotels.length !== 1 ? "s" : ""}</strong> — {alreadyContactedCount} of {listHotels.length} already received this flow and will be skipped.
                  </p>
                ) : (
                  <p style={s.launchInfo}>{newListHotels.length} hotel{newListHotels.length !== 1 ? "s" : ""} with email addresses in this list</p>
                )
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
              {selectedHotelAlreadyContacted && (
                <p style={s.launchWarning}>This hotel has already been sent this flow. Launching again will send it a duplicate.</p>
              )}
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
            style={{ ...s.launchBtn, opacity: (!gmailToken || (mode === "list" ? (!selectedListId || contactedIds === null || newListHotels.length === 0) : !selectedHotelId)) ? 0.45 : 1 }}
            disabled={!gmailToken || (mode === "list" ? (!selectedListId || contactedIds === null || newListHotels.length === 0) : !selectedHotelId) || launching}
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
  const [activeStep, setActiveStep] = useState(0);
  const [showFlowDropdown, setShowFlowDropdown] = useState(false);
  const flowDropdownRef = useRef(null);

  // Close the flow selector on outside click
  useEffect(() => {
    if (!showFlowDropdown) return;
    const handler = (e) => { if (flowDropdownRef.current && !flowDropdownRef.current.contains(e.target)) setShowFlowDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFlowDropdown]);
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
  const [signature, setSignature]   = useState("");
  const [sigSaving, setSigSaving]   = useState(false);
  const sigRef = useRef(null);

  useEffect(() => { if (user) { fetchAll(); fetchSignature(); } }, [user]);

  const fetchSignature = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("email_signature").eq("id", user.id).single();
    const sig = data?.email_signature || "";
    setSignature(sig);
    if (sigRef.current) sigRef.current.innerHTML = sig;
  };

  const saveSignature = async () => {
    if (!user) return;
    const html = sigRef.current?.innerHTML || "";
    setSigSaving(true);
    await supabase.from("profiles").update({ email_signature: html }).eq("id", user.id);
    setSignature(html);
    setSigSaving(false);
  };

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

      setSuccess(isNew ? "Flow created!" : "Flow saved!");
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
        // List launches skip hotels already targeted by this flow — the API
        // re-checks this itself rather than trusting the client, so a stale
        // modal or a second launch can't double-queue a hotel. Picking a
        // single hotel by name is an explicit choice, so it's never skipped.
        body: JSON.stringify({ sequenceId: launchModal.id, hotels, gmailToken, userId: user.id, skipAlreadyContacted: mode === "list" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Launch failed");

      const skipped = data.skipped || 0;
      const skippedNote = skipped > 0 ? ` ${skipped} hotel${skipped !== 1 ? "s" : ""} already had this flow and ${skipped !== 1 ? "were" : "was"} skipped.` : "";
      setSuccess(`Flow launched! ${data.queued} new email${data.queued !== 1 ? "s" : ""} queued.${skippedNote}`);
      setTimeout(() => setSuccess(""), 5000);
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

      {/* Header — flow title, selector, actions */}
      <div style={s.flowHeader}>
        <h1 style={s.flowTitle}>{isNew ? "New Flow" : (activeSeq?.name || "Flows")}</h1>

        {sequences.length > 0 && (
          <div style={{ position:"relative" }} ref={flowDropdownRef}>
            <button style={s.flowSelector} onClick={() => setShowFlowDropdown(v => !v)}>
              <span style={s.flowSelectorName}>{activeSeq?.name || "Select a flow…"}</span>
              {activeSeq && <span style={s.flowSelectorMeta}>{(activeSeq.steps?.length || 0)} steps</span>}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2.5"
                style={{ flexShrink:0, transform: showFlowDropdown ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            {showFlowDropdown && (
              <div style={s.flowDropdown}>
                {sequences.map(seq => (
                  <div key={seq.id}
                    style={{ ...s.flowDropdownItem, ...(activeSeq?.id === seq.id && !isNew ? s.flowDropdownItemActive : {}) }}
                    onClick={() => { selectSequence(seq); setActiveStep(0); setShowFlowDropdown(false); }}
                  >
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={s.seqName}>{seq.name}</p>
                      <p style={s.seqMeta}>{seq.steps.length} step{seq.steps.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                      <button style={s.launchIconBtn} onClick={() => { setLaunchModal(seq); setShowFlowDropdown(false); }} title="Launch flow">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-terracotta)" strokeWidth="2.5">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                      </button>
                      <button style={s.deleteIconBtn} onClick={() => { setDeleteConfirm(seq.id); setShowFlowDropdown(false); }} title="Delete">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={s.flowActions}>
          <button data-tour="new-flow" style={s.newBtn} onClick={() => { newSequence(); setActiveStep(0); }}>+ New Flow</button>
          {(activeSeq || isNew) && (
            <button style={{ ...s.saveBtn, opacity: saving ? 0.45 : 1 }} onClick={save} disabled={saving}>
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </button>
          )}
          {activeSeq && !isNew && (
            <button data-tour="launch-flow" style={s.launchBtn} onClick={() => setLaunchModal(activeSeq)}>Launch →</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={s.empty}><div style={s.spinner} /></div>
      ) : !activeSeq && !isNew ? (
        <div style={s.empty}>
          <span style={{ fontSize:36 }}>📧</span>
          <p style={{ fontSize:14, color:"var(--color-ink-muted)", marginTop:12 }}>
            {sequences.length === 0 ? "No flows yet. Create one to automate your outreach." : "Select a flow above, or create a new one."}
          </p>
        </div>
      ) : (
        <>
          {/* New flows need a name before saving */}
          {isNew && (
            <div style={{ marginBottom:16 }}>
              <input style={s.nameInput} placeholder="Flow name e.g. Hotel Outreach Summer 2025"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
          )}

          {/* Step tabs — horizontal row */}
          <div className="dp-step-tabs" style={s.stepTabs}>
            {form.steps.map((step, i) => {
              const label  = i === 0 ? "Email 1" : i === 1 ? "Follow-up 1" : "Follow-up 2";
              const timing = i === 0 ? "Immediate" : `+${step.delayDays} days`;
              return (
                <button key={i}
                  style={{ ...s.stepTab, ...(activeStep === i ? s.stepTabActive : {}) }}
                  onClick={() => setActiveStep(i)}
                >
                  <div style={s.stepTabTop}>
                    <span style={{ ...s.stepBadge, ...(activeStep === i ? s.stepBadgeActive : {}) }}>{label}</span>
                    <span style={s.stepTabTiming}>{timing}</span>
                  </div>
                  <p style={s.stepTabSubject}>{step.subject?.trim() || "No subject yet"}</p>
                </button>
              );
            })}
            {form.steps.length < 3 && (
              <button style={s.addStepTab} onClick={addStep}>+ Add follow-up</button>
            )}
          </div>

          {/* Focused editor — selected step only */}
          {form.steps[activeStep] && (
            <StepCard
              key={activeStep}
              step={form.steps[activeStep]}
              number={activeStep + 1}
              templates={templates}
              onChange={updated => updateStep(activeStep, updated)}
              onRemove={() => { removeStep(activeStep); setActiveStep(0); }}
              canRemove={form.steps.length > 1 && activeStep > 0}
              signature={signature}
            />
          )}
              {/* Signature section */}
              <div style={{ background:"var(--color-ground-sand)", borderRadius:14, border:"1px solid var(--color-ground-sand)", padding:"18px 20px", marginBottom:16 }}>
                <p style={{ fontSize:11, fontWeight:700, color:"var(--color-ink-muted)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 }}>Email Signature</p>
                <p style={{ fontSize:12, color:"var(--color-ink-muted)", marginBottom:10 }}>Write your signature below, save it, then click &ldquo;Insert into Message&rdquo; on any step above.</p>
                <div style={s.richEditorBox}>
                  <div
                    ref={sigRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="sig-editor"
                    data-placeholder="e.g. Best regards,&#10;Your name&#10;UGC Creator"
                    style={{ minHeight:72, outline:"none", lineHeight:1.75, fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", padding:"10px 14px" }}
                  />
                </div>
                <div style={{ display:"flex", gap:8, marginTop:10 }}>
                  <button
                    style={{ padding:"8px 16px", background:"var(--color-ink-primary)", color:"var(--color-ground-page)", border:"none", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", opacity: sigSaving ? 0.6 : 1 }}
                    onClick={saveSignature} disabled={sigSaving}>
                    {sigSaving ? "Saving..." : "Save Signature"}
                  </button>
                </div>
              </div>

        </>
      )}

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
            <h3 style={{ fontSize:17, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:8 }}>Delete this sequence?</h3>
            <p style={{ fontSize:13, color:"var(--color-ink-mid)", marginBottom:20 }}>This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={{ ...s.launchBtn, background:"var(--color-error)" }} onClick={() => deleteSequence(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  flowHeader: { display:"flex", alignItems:"center", gap:14, flexWrap:"wrap", marginBottom:20 },
  flowTitle: { fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, color:"var(--color-ink-primary)", letterSpacing:"-0.01em" },
  flowSelector: { display:"flex", alignItems:"center", gap:8, background:"var(--color-ground-card)", border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding:"9px 14px", cursor:"pointer", fontFamily:"inherit", maxWidth:340 },
  flowSelectorName: { fontSize:13.5, fontWeight:700, color:"var(--color-ink-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  flowSelectorMeta: { fontSize:11, fontWeight:700, color:"var(--color-accent-amber-deep)", flexShrink:0 },
  flowDropdown: { position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:200, background:"var(--color-ground-card)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-lg)", boxShadow:"var(--shadow-overlay)", minWidth:300, maxHeight:320, overflowY:"auto" },
  flowDropdownItem: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer", borderBottom:"1px solid rgba(43,39,34,0.07)" },
  flowDropdownItemActive: { background:"var(--color-amber-tint)" },
  flowActions: { display:"flex", gap:8, alignItems:"center", marginLeft:"auto", flexWrap:"wrap" },

  stepTabs: { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:14, marginBottom:20 },
  stepTab: { textAlign:"left", padding:"14px 16px", background:"var(--color-ground-card)", border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-card)", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" },
  stepTabActive: { border:"1.5px solid var(--color-accent-amber)", background:"var(--color-amber-tint)" },
  stepTabTop: { display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:8 },
  stepTabTiming: { fontSize:11.5, color:"var(--color-ink-muted)", flexShrink:0 },
  stepTabSubject: { fontSize:14, fontWeight:700, color:"var(--color-ink-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  addStepTab: { padding:"14px 16px", background:"none", border:"1.5px dashed var(--color-border)", borderRadius:"var(--radius-card)", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600, color:"var(--color-ink-muted)" },
  newBtn: { background:"var(--color-ground-card)", color:"var(--color-ink-primary)", border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-lg)", padding:"11px 18px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-display)", whiteSpace:"nowrap" },
  seqName: { fontSize:14, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:2 },
  seqMeta: { fontSize:11, color:"var(--color-ink-muted)" },
  launchIconBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid var(--color-accent-amber)", background:"var(--color-amber-tint)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  deleteIconBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid var(--color-error)", background:"var(--color-ground-card)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  nameInput: { width:"100%", border:"none", outline:"none", fontSize:20, fontWeight:700, color:"var(--color-ink-primary)", fontFamily:"inherit", borderBottom:"2px solid var(--color-ground-sand)", paddingBottom:8 },
  richEditorBox: { border:"1.5px solid var(--color-border)", borderRadius:10, overflow:"hidden", background:"var(--color-ground-card)" },
  toolbar: { display:"flex", gap:2, padding:"7px 8px", alignItems:"center", background:"var(--color-ground-sand)", flexWrap:"wrap" },
  toolBtn: { display:"flex", alignItems:"center", justifyContent:"center", padding:"5px 10px", border:"none", borderRadius:6, background:"transparent", fontSize:13, cursor:"pointer", fontFamily:"inherit", color:"var(--color-ink-primary)", lineHeight:1, minWidth:30 },
  toolSep: { width:1, height:18, background:"var(--color-border)", margin:"0 3px" },
  stepCard: { background:"var(--color-ground-sand)", borderRadius:14, border:"1px solid var(--color-ground-sand)", padding:"20px", marginBottom:16 },
  stepHeader: { display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" },
  stepBadgeActive: { background:"rgba(224,149,74,0.28)" },
  stepBadge: { fontSize:12, fontWeight:700, color:"var(--color-accent-amber-deep)", background:"var(--color-amber-tint)", padding:"4px 12px", borderRadius:20 },
  stepNote: { fontSize:12, color:"var(--color-ink-muted)" },
  delaySelect: { border:"1.5px solid var(--color-border)", borderRadius:8, padding:"6px 12px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", background:"var(--color-ground-card)", cursor:"pointer" },
  removeBtn: { marginLeft:"auto", fontSize:12, color:"var(--color-error)", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
  field: { marginBottom:14 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"var(--color-ink-muted)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  hint: { fontSize:12, color:"var(--color-ink-muted)", marginBottom:6 },
  code: { background:"var(--color-ground-sand)", padding:"1px 6px", borderRadius:4, fontSize:11, fontFamily:"monospace" },
  select: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", background:"var(--color-ground-card)", cursor:"pointer" },
  input: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none" },
  textarea: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", resize:"vertical", lineHeight:1.7 },
  charCount: { fontSize:11, color:"var(--color-border)", textAlign:"right", marginTop:3 },
  saveBtn: { background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-lg)", padding:"11px 22px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-display)", whiteSpace:"nowrap" },
  launchBtn: { background:"var(--color-accent-terracotta)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-lg)", padding:"11px 22px", fontSize:13.5, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-display)", whiteSpace:"nowrap" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 24px", gap:8 },
  spinner: { width:24, height:24, border:"2.5px solid var(--color-ground-sand)", borderTopColor:"var(--color-accent-amber)", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  errorBox: { background:"var(--status-error-bg)", border:"1px solid var(--color-accent-amber)", borderRadius:10, padding:"12px 16px", color:"var(--color-error)", fontSize:13, marginBottom:16 },
  successBox: { background:"var(--status-success-bg)", border:"1px solid rgba(22,101,52,0.3)", borderRadius:10, padding:"12px 16px", color:"var(--status-success-ink)", fontSize:13, marginBottom:16 },
  overlay: { position:"fixed", inset:0, background:"rgba(43,39,34,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"var(--color-ground-card)", borderRadius:16, width:"100%", maxWidth:500, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" },
  modalHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid var(--color-ground-sand)" },
  modalTitle: { fontSize:18, fontWeight:700, color:"var(--color-ink-primary)" },
  modalClose: { background:"none", border:"none", fontSize:16, cursor:"pointer", color:"var(--color-ink-muted)" },
  modalBody: { padding:"20px 24px", overflowY:"auto", flex:1 },
  modalFooter: { padding:"16px 24px", borderTop:"1px solid var(--color-ground-sand)", display:"flex", justifyContent:"flex-end", gap:12 },
  modeRow: { display:"flex", gap:8, marginBottom:20 },
  modeBtn: { flex:1, padding:"10px", border:"1.5px solid var(--color-border)", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"var(--color-ink-mid)", background:"var(--color-ground-card)", transition:"all 0.15s" },
  modeBtnActive: { border:"1.5px solid var(--color-accent-terracotta)", background:"var(--color-amber-tint)", color:"var(--color-accent-terracotta)" },
  launchInfo: { fontSize:12, color:"var(--color-ink-muted)", marginTop:6 },
  launchWarning: { fontSize:12, color:"var(--color-accent-amber-deeper)", background:"var(--color-amber-tint)", border:"1px solid var(--color-glow-1)", borderRadius:8, padding:"7px 10px", marginTop:8, lineHeight:1.5 },
  stepsPreview: { background:"var(--color-ground-sand)", borderRadius:10, padding:"14px 16px", marginTop:8 },
  stepsPreviewTitle: { fontSize:11, fontWeight:700, color:"var(--color-ink-muted)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 },
  stepsPreviewItem: { display:"flex", alignItems:"center", gap:10, marginBottom:8 },
  stepsPreviewDot: { width:8, height:8, borderRadius:"50%", background:"var(--color-action-forest)", flexShrink:0 },
  stepsPreviewText: { fontSize:13, color:"var(--color-ink-primary)" },
  cancelBtn: { padding:"10px 20px", border:"1.5px solid var(--color-border)", borderRadius:9, background:"var(--color-ground-card)", fontSize:13, cursor:"pointer", color:"var(--color-ink-mid)", fontFamily:"inherit" },
};
