"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";
import { useIsMobile } from "../../../lib/useIsMobile";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ name:"", subject:"", body:"", type:"email" });
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all"); // "all" | "email" | "instagram"
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const textareaRef = useRef(null);

  useEffect(() => { fetchTemplates(); }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    if (!user) return;
    const { data } = await supabase.from("templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTemplates(data || []);
    if (data && data.length > 0) { setActive(data[0]); setForm({ name:data[0].name, subject:data[0].subject, body:data[0].body }); }
    setLoading(false);
  };

  const selectTemplate = (t) => { setActive(t); setForm({ name:t.name, subject:t.subject, body:t.body, type:t.type||"email" }); setIsNew(false); };

  const newTemplate = () => {
    setShowTypePicker(true);
  };

  const startNewTemplate = (type) => {
    setShowTypePicker(false);
    setActive(null);
    setForm({ name:"", subject:"", body:"", type });
    setIsNew(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert("Give your template a name."); return; }
    if (!form.body.trim()) { alert("Add a message body."); return; }
    if (!user) { alert("Not logged in."); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase.from("templates")
          .insert({ name:form.name.trim(), subject:form.subject.trim(), body:form.body.trim(), type:form.type, user_id: user.id })
          .select().single();
        if (error) throw new Error(error.message);
        setTemplates(prev => [data, ...prev]);
        setActive(data);
        setIsNew(false);
      } else if (active) {
        const { error } = await supabase.from("templates")
          .update({ name:form.name.trim(), subject:form.subject.trim(), body:form.body.trim(), type:form.type })
          .eq("id", active.id);
        if (error) throw new Error(error.message);
        setTemplates(prev => prev.map(t => t.id === active.id ? { ...t, ...form } : t));
        setActive(prev => ({ ...prev, ...form }));
      }
    } catch(e) {
      alert("Could not save template: " + e.message);
    } finally {
      setSaving(false);
    }
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

      <div style={{ ...s.body, gridTemplateColumns: isMobile ? "1fr" : "280px 1fr" }}>
        {/* Type filter tabs */}
        <div style={{ display:"flex", gap:4, marginBottom:12 }}>
          {["all","email","instagram"].map(t => (
            <button key={t} style={{ ...s.filterTab, ...(typeFilter===t ? s.filterTabActive : {}) }}
              onClick={() => setTypeFilter(t)}>
              {t === "all" ? "All" : t === "email" ? "📧 Email" : "📸 Instagram"}
            </button>
          ))}
        </div>

        {/* Templates list */}
        <div style={s.listPanel}>
          {loading ? <p style={s.empty}>Loading...</p> :
           templates.length === 0 && !isNew ? (
            <div style={s.emptyState}>
              <span style={{ fontSize:32 }}>✉️</span>
              <p>No templates yet. Create one to get started.</p>
            </div>
          ) : (
            templates.filter(t => typeFilter === "all" || t.type === typeFilter).map(t => (
              <div key={t.id}
                style={{ ...s.templateItem, ...(active?.id === t.id && !isNew ? s.templateItemActive : {}) }}
                onClick={() => selectTemplate(t)}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                    <p style={s.templateName}>{t.name}</p>
                    <span style={{ ...s.typePill, ...(t.type === "instagram" ? s.typePillIG : {}) }}>
                      {t.type === "instagram" ? "IG" : "Email"}
                    </span>
                  </div>
                  {t.type === "email" && <p style={s.templateSubject}>{t.subject}</p>}
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

                          {form.type === "email" && (
              <div style={s.field}>
                <label style={s.label}>Email Subject</label>
                <input style={s.input} placeholder="e.g. Collaboration Opportunity"
                  value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
            )}

              <div style={s.field}>
                <label style={s.label}>Message</label>
                <div style={s.toolbar}>
                  <button style={s.toolBtn} onClick={() => insertFormat("**", "**")}><strong>B</strong></button>
                  <button style={s.toolBtn} onClick={() => insertFormat("\n- ")}>List</button>
                  <button style={s.toolBtn} onClick={() => insertFormat("\n\n")}>Para</button>
                                  </div>
                <textarea
                  ref={textareaRef}
                  style={s.textarea}
                  rows={14}
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  placeholder={"Write your message here...ng in travel and lifestyle...\n\nI'd love to discuss a potential collaboration.\n\nWarm regards,\n[Your Name]"}
                />
                <p style={s.charCount}>
                  {form.body.length} characters
                  {form.type === "instagram" && form.body.length > 0 && (
                    <span style={{ color: form.body.length > 1000 ? "#ef4444" : "#9FB3C8", marginLeft:8 }}>
                      {form.body.length > 1000 ? "Too long for DM" : "Good length for DM"}
                    </span>
                  )}
                </p>
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

      {/* Type picker modal */}
      {showTypePicker && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize:18, fontWeight:700, color:"#0F2544", marginBottom:6 }}>What type of template?</h3>
            <p style={{ fontSize:13, color:"#9FB3C8", marginBottom:24 }}>Choose the type before writing your message</p>
            <div style={{ display:"flex", gap:12, flexDirection:"column" }}>
              <button style={s.typePickerBtn} onClick={() => startNewTemplate("email")}>
                <div style={s.typePickerIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9"/></svg>
                </div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <p style={{ fontWeight:700, color:"#0F2544", fontSize:15, marginBottom:2 }}>Email Template</p>
                  <p style={{ fontSize:12, color:"#9FB3C8" }}>Has subject line — used for email outreach</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button style={s.typePickerBtn} onClick={() => startNewTemplate("instagram")}>
                <div style={{ ...s.typePickerIcon, background:"#FDF0F8" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C13584" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#C13584"/></svg>
                </div>
                <div style={{ flex:1, textAlign:"left" }}>
                  <p style={{ fontWeight:700, color:"#0F2544", fontSize:15, marginBottom:2 }}>Instagram DM Template</p>
                  <p style={{ fontSize:12, color:"#9FB3C8" }}>No subject — used for Instagram direct messages</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            <button style={{ ...s.cancelBtn, marginTop:16, width:"100%" }} onClick={() => setShowTypePicker(false)}>Cancel</button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.confirmModal}>
            <h3 style={{ fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:18, marginBottom:8 }}>Delete this template?</h3>
            <p style={{ fontSize:14, color:"#4A6A8A", marginBottom:20 }}>This cannot be undone.</p>
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
  title: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:28, fontWeight:700, color:"#0F2544", marginBottom:4 },
  subtitle: { fontSize:14, color:"#9FB3C8" },
  newBtn: { background:"#0F2544", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  body: { display:"grid", gridTemplateColumns:"280px 1fr", gap:20, alignItems:"start" },
  listPanel: { display:"flex", flexDirection:"column", gap:8 },
  templateItem: { padding:"14px", borderRadius:12, border:"1.5px solid #e2e8f0", cursor:"pointer", background:"#fff", transition:"all 0.15s", display:"flex", alignItems:"flex-start", gap:10 },
  templateItemActive: { border:"1.5px solid #6366f1", background:"#FEF0EC" },
  templateName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:2 },
  templateSubject: { fontSize:12, color:"#E85D3D", marginBottom:3 },
  templatePreview: { fontSize:11, color:"#9FB3C8", lineHeight:1.5 },
  deleteBtn: { background:"none", border:"none", cursor:"pointer", padding:4, flexShrink:0 },
  editor: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", padding:"24px" },
  editorHeader: { marginBottom:20 },
  editorTitle: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:20, fontWeight:700, color:"#0F2544" },
  field: { marginBottom:18 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  hint: { fontSize:12, color:"#9FB3C8", marginBottom:8 },
  code: { background:"#F0EBE5", padding:"1px 6px", borderRadius:4, fontSize:11, fontFamily:"monospace" },
  input: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none" },
  toolbar: { display:"flex", gap:6, marginBottom:8, flexWrap:"wrap" },
  toolBtn: { padding:"5px 12px", border:"1.5px solid #e2e8f0", borderRadius:7, background:"#fff", fontSize:13, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#1E3A5F" },
  textarea: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none", resize:"vertical", lineHeight:1.7 },
  charCount: { fontSize:11, color:"#cbd5e1", marginTop:4, textAlign:"right" },
  saveBtn: { background:"#E85D3D", color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", transition:"opacity 0.2s" },
  emptyState: { display:"flex", flexDirection:"column", alignItems:"center", gap:10, padding:"48px 24px", color:"#9FB3C8", fontSize:14, textAlign:"center" },
  filterTab: { padding:"5px 12px", border:"1px solid #DDD5CC", borderRadius:20, fontSize:12, fontWeight:500, cursor:"pointer", color:"#9FB3C8", background:"#fff", fontFamily:"inherit", transition:"all 0.15s" },
  filterTabActive: { background:"#0F2544", color:"#F7F3EF", border:"1px solid #0F2544" },
  typePickerBtn: { display:"flex", alignItems:"center", gap:14, padding:"16px", border:"1.5px solid #DDD5CC", borderRadius:12, background:"#fff", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", width:"100%" },
  typePickerIcon: { width:48, height:48, borderRadius:12, background:"#FEF0EC", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  typeRow: { display:"flex", gap:8, marginBottom:20 },
  typeBtn: { display:"flex", alignItems:"center", gap:7, padding:"9px 16px", border:"1.5px solid #DDD5CC", borderRadius:10, background:"#fff", cursor:"pointer", fontSize:13, fontWeight:500, color:"#4A6A8A", fontFamily:"inherit", transition:"all 0.15s" },
  typeBtnActive: { border:"1.5px solid #E85D3D", background:"#FEF0EC", color:"#E85D3D" },
  typeBtnActiveIG: { border:"1.5px solid #C13584", background:"#FDF0F8", color:"#C13584" },
  typePill: { fontSize:10, fontWeight:700, padding:"2px 7px", borderRadius:20, background:"#FEF0EC", color:"#E85D3D" },
  typePillIG: { background:"#FDF0F8", color:"#C13584" },
  empty: { color:"#9FB3C8", fontSize:14, padding:"24px", textAlign:"center" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  confirmModal: { background:"#fff", borderRadius:16, padding:"28px", maxWidth:380, width:"90%" },
  cancelBtn: { background:"#fff", color:"#4A6A8A", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"10px 20px", fontSize:14, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  deleteConfirmBtn: { background:"#ef4444", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
};
