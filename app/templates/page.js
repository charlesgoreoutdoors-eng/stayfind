"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ name:"", subject:"", body:"" });
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const textareaRef = useRef(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
    setTemplates(data || []);
    if (data && data.length > 0) { setActive(data[0]); setForm({ name:data[0].name, subject:data[0].subject, body:data[0].body }); }
    setLoading(false);
  };

  const selectTemplate = (t) => { setActive(t); setForm({ name:t.name, subject:t.subject, body:t.body }); setIsNew(false); };

  const newTemplate = () => {
    setActive(null);
    setForm({ name:"", subject:"Content Collaboration Opportunity", body:"" });
    setIsNew(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.body.trim()) return;
    setSaving(true);
    if (isNew) {
      const { data } = await supabase.from("templates").insert({ name:form.name.trim(), subject:form.subject.trim(), body:form.body.trim() }).select().single();
      if (data) { setTemplates(prev => [data, ...prev]); setActive(data); setIsNew(false); }
    } else if (active) {
      await supabase.from("templates").update({ name:form.name.trim(), subject:form.subject.trim(), body:form.body.trim() }).eq("id", active.id);
      setTemplates(prev => prev.map(t => t.id === active.id ? { ...t, ...form } : t));
      setActive(prev => ({ ...prev, ...form }));
    }
    setSaving(false);
  };

  const deleteTemplate = async (id) => {
    await supabase.from("templates").delete().eq("id", id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (active?.id === id) { setActive(null); setForm({ name:"", subject:"", body:"" }); }
    setDeleteConfirm(null);
  };

  const insertFormat = (prefix, suffix = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = form.body.substring(start, end);
    const newText = form.body.substring(0, start) + prefix + selected + suffix + form.body.substring(end);
    setForm(f => ({ ...f, body: newText }));
    setTimeout(() => { el.focus(); el.setSelectionRange(start + prefix.length, end + prefix.length); }, 0);
  };

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Email Templates</h1>
          <p style={s.subtitle}>Create and manage your outreach message templates</p>
        </div>
        <button style={s.newBtn} onClick={newTemplate}>+ New Template</button>
      </div>

      <div style={s.body}>
        {/* Templates list */}
        <div style={s.listPanel}>
          {loading ? <p style={s.empty}>Loading...</p> :
           templates.length === 0 && !isNew ? (
            <div style={s.emptyState}>
              <span style={{ fontSize:32 }}>✉️</span>
              <p>No templates yet. Create one to get started.</p>
            </div>
          ) : (
            templates.map(t => (
              <div key={t.id}
                style={{ ...s.templateItem, ...(active?.id === t.id && !isNew ? s.templateItemActive : {}) }}
                onClick={() => selectTemplate(t)}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={s.templateName}>{t.name}</p>
                  <p style={s.templateSubject}>{t.subject}</p>
                  <p style={s.templatePreview}>{t.body.substring(0, 60)}...</p>
                </div>
                <button style={s.deleteBtn} onClick={e => { e.stopPropagation(); setDeleteConfirm(t.id); }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        <div style={s.editor}>
          {(!active && !isNew) ? (
            <div style={s.emptyState}>
              <span style={{ fontSize:32 }}>📝</span>
              <p>Select a template to edit or create a new one</p>
            </div>
          ) : (
            <>
              <div style={s.editorHeader}>
                <h2 style={s.editorTitle}>{isNew ? "New Template" : "Edit Template"}</h2>
              </div>

              <div style={s.field}>
                <label style={s.label}>Template Name</label>
                <input style={s.input} placeholder="e.g. Summer Outreach, Luxury Hotels"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Email Subject</label>
                <input style={s.input} placeholder="Content Collaboration Opportunity"
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Message</label>
                <p style={s.hint}>
                  Use <code style={s.code}>{"{hotel_name}"}</code> to auto-fill each hotel's name when sending
                </p>
                <div style={s.toolbar}>
                  <button style={s.toolBtn} onClick={() => insertFormat("**", "**")}><strong>B</strong></button>
                  <button style={s.toolBtn} onClick={() => insertFormat("\n- ")}>List</button>
                  <button style={s.toolBtn} onClick={() => insertFormat("\n\n")}>Para</button>
                  <button style={s.toolBtn} onClick={() => setForm(f => ({ ...f, body: f.body + "{hotel_name}" }))}>
                    + Hotel Name
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  style={s.textarea}
                  rows={14}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder={"Write your outreach message here...\n\nExample:\nHi {hotel_name} team,\n\nMy name is [Your Name] and I'm a content creator specialising in travel and lifestyle...\n\nI'd love to discuss a potential collaboration.\n\nWarm regards,\n[Your Name]"}
                />
                <p style={s.charCount}>{form.body.length} characters</p>
              </div>

              <button
                style={{ ...s.saveBtn, opacity: !form.name.trim() || !form.body.trim() || saving ? 0.5 : 1 }}
                onClick={save}
                disabled={!form.name.trim() || !form.body.trim() || saving}
              >
                {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.confirmModal}>
            <h3 style={{ fontFamily:"Georgia,serif", fontSize:18, marginBottom:8 }}>Delete this template?</h3>
            <p style={{ fontSize:14, color:"#64748b", marginBottom:20 }}>This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.deleteConfirmBtn} onClick={() => deleteTemplate(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { padding:"32px 24px 80px", maxWidth:1100, margin:"0 auto" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 },
  title: { fontFamily:"Georgia,serif", fontSize:28, fontWeight:700, color:"#0f0e17", marginBottom:4 },
  subtitle: { fontSize:14, color:"#94a3b8" },
  newBtn: { background:"#0f0e17", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  body: { display:"grid", gridTemplateColumns:"280px 1fr", gap:20, alignItems:"start" },
  listPanel: { display:"flex", flexDirection:"column", gap:8 },
  templateItem: { padding:"14px", borderRadius:12, border:"1.5px solid #e2e8f0", cursor:"pointer", background:"#fff", transition:"all 0.15s", display:"flex", alignItems:"flex-start", gap:10 },
  templateItemActive: { border:"1.5px solid #6366f1", background:"#eef2ff" },
  templateName: { fontSize:14, fontWeight:600, color:"#1e293b", marginBottom:2 },
  templateSubject: { fontSize:12, color:"#6366f1", marginBottom:3 },
  templatePreview: { fontSize:11, color:"#94a3b8", lineHeight:1.5 },
  deleteBtn: { background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0 },
  editor: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", padding:"24px" },
  editorHeader: { marginBottom:20 },
  editorTitle: { fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:"#0f0e17" },
  field: { marginBottom:18 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  hint: { fontSize:12, color:"#94a3b8", marginBottom:8 },
  code: { background:"#f1f5f9", padding:"1px 6px", borderRadius:4, fontSize:11, fontFamily:"monospace" },
  input: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none" },
  toolbar: { display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" },
  toolBtn: { padding:"5px 12px", border:"1.5px solid #e2e8f0", borderRadius:7, background:"#fff", fontSize:13, cursor:"pointer", fontFamily:"system-ui,sans-serif", color:"#374151" },
  textarea: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none", resize:"vertical", lineHeight:1.7 },
  charCount: { fontSize:11, color:"#cbd5e1", marginTop:4, textAlign:"right" },
  saveBtn: { background:"#6366f1", color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif", transition:"opacity 0.2s" },
  emptyState: { display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"48px 24px", color:"#94a3b8", fontSize:14, textAlign:"center" },
  empty: { color:"#94a3b8", fontSize:14, padding:"24px", textAlign:"center" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  confirmModal: { background:"#fff", borderRadius:16, padding:"28px", maxWidth:380, width:"90%" },
  cancelBtn: { background:"#fff", color:"#64748b", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"10px 20px", fontSize:14, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  deleteConfirmBtn: { background:"#ef4444", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
};
