"use client";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/auth";

// Rich text editor: toolbar sits inside the same bordered container as the editor.
// forwardRef exposes the DOM node so the parent can call insertHTML into it.
const RichEditor = forwardRef(function RichEditor({ initialHtml, onChange, placeholder, minHeight }, ref) {
  const innerRef = useRef(null);

  useEffect(() => {
    if (innerRef.current) innerRef.current.innerHTML = initialHtml || "";
  }, []); // Set once on mount; use key prop to force reset

  useImperativeHandle(ref, () => innerRef.current, []);

  return (
    <div
      ref={innerRef}
      contentEditable
      suppressContentEditableWarning
      className="rich-editor"
      data-placeholder={placeholder || "Write your message here..."}
      onInput={() => onChange && onChange(innerRef.current?.innerHTML || "")}
      style={{
        minHeight: minHeight || 220,
        outline: "none",
        lineHeight: 1.8,
        fontSize: 14,
        fontFamily: "inherit",
        color: "var(--color-ink-primary)",
        padding: "14px 16px",
      }}
    />
  );
});

function Toolbar({ onCmd, extraButtons }) {
  const btn = (cmd, label, title) => (
    <button
      key={cmd}
      style={s.toolBtn}
      title={title || label}
      onMouseDown={e => { e.preventDefault(); onCmd(cmd); }}
    >
      {label}
    </button>
  );
  return (
    <div style={s.toolbar}>
      <button style={{ ...s.toolBtn, fontWeight: 700 }} title="Bold" onMouseDown={e => { e.preventDefault(); onCmd("bold"); }}>B</button>
      <button style={{ ...s.toolBtn, fontStyle: "italic" }} title="Italic" onMouseDown={e => { e.preventDefault(); onCmd("italic"); }}>I</button>
      <button style={{ ...s.toolBtn, textDecoration: "underline" }} title="Underline" onMouseDown={e => { e.preventDefault(); onCmd("underline"); }}>U</button>
      <div style={s.toolSep} />
      <button style={s.toolBtn} title="Bullet list" onMouseDown={e => { e.preventDefault(); onCmd("insertUnorderedList"); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
          <circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </button>
      <button style={s.toolBtn} title="Numbered list" onMouseDown={e => { e.preventDefault(); onCmd("insertOrderedList"); }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
          <path d="M4 6h1v4" strokeLinecap="round"/><path d="M4 10h2" strokeLinecap="round"/>
          <path d="M4 15h1.5a.5.5 0 0 1 0 1H4a.5.5 0 0 0 0 1h2" strokeLinecap="round"/>
        </svg>
      </button>
      <div style={s.toolSep} />
      <button style={{ ...s.toolBtn, fontSize: 11, color: "var(--color-ink-muted)" }} title="Clear formatting" onMouseDown={e => { e.preventDefault(); onCmd("removeFormat"); }}>
        Clear
      </button>
      {extraButtons}
    </div>
  );
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", type: "email" });
  const [saving, setSaving] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [typeFilter, setTypeFilter] = useState("all");
  const [signature, setSignature] = useState("");
  const [signatureSaving, setSignatureSaving] = useState(false);
  const editorRef = useRef(null);
  const sigRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => { if (user) { fetchTemplates(); fetchSignature(); } }, [user]);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from("templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTemplates(data || []);
    if (data && data.length > 0) {
      setActive(data[0]);
      setForm({ name: data[0].name, subject: data[0].subject || "", body: data[0].body || "", type: data[0].type || "email" });
    }
    setLoading(false);
  };

  const fetchSignature = async () => {
    const { data } = await supabase.from("profiles").select("email_signature").eq("id", user.id).single();
    const sig = data?.email_signature || "";
    setSignature(sig);
    if (sigRef.current) sigRef.current.innerHTML = sig;
  };

  const saveSignature = async () => {
    setSignatureSaving(true);
    const html = sigRef.current?.innerHTML || "";
    await supabase.from("profiles").update({ email_signature: html }).eq("id", user.id);
    setSignature(html);
    setSignatureSaving(false);
  };

  // Insert the saved signature at the end of the message editor
  const insertSignature = () => {
    const editor = editorRef.current;
    const sigHtml = sigRef.current?.innerHTML || "";
    if (!editor || !sigHtml.trim()) return;

    editor.focus();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    document.execCommand("insertHTML", false, `<br><br>${sigHtml}`);
    setForm(f => ({ ...f, body: editor.innerHTML }));
  };

  const selectTemplate = (t) => {
    setActive(t);
    setForm({ name: t.name, subject: t.subject || "", body: t.body || "", type: t.type || "email" });
    setIsNew(false);
  };

  const newTemplate = () => setShowTypePicker(true);

  const startNewTemplate = (type) => {
    setShowTypePicker(false);
    setActive(null);
    setForm({ name: "", subject: "", body: "", type });
    setIsNew(true);
  };

  const save = async () => {
    if (!form.name.trim()) { alert("Give your template a name."); return; }
    if (!stripHtml(form.body).trim()) { alert("Add a message body."); return; }
    if (!user) { alert("Not logged in."); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase.from("templates")
          .insert({ name: form.name.trim(), subject: form.subject.trim(), body: form.body, type: form.type, user_id: user.id })
          .select().single();
        if (error) throw new Error(error.message);
        setTemplates(prev => [data, ...prev]);
        setActive(data);
        setIsNew(false);
      } else if (active) {
        const { error } = await supabase.from("templates")
          .update({ name: form.name.trim(), subject: form.subject.trim(), body: form.body, type: form.type })
          .eq("id", active.id);
        if (error) throw new Error(error.message);
        setTemplates(prev => prev.map(t => t.id === active.id ? { ...t, ...form } : t));
        setActive(prev => ({ ...prev, ...form }));
      }
    } catch (e) {
      alert("Could not save template: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (id) => {
    await supabase.from("templates").delete().eq("id", id);
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (active?.id === id) { setActive(null); setForm({ name: "", subject: "", body: "", type: "email" }); }
    setDeleteConfirm(null);
  };

  const execCmd = (cmd) => document.execCommand(cmd, false, undefined);

  return (
    <div style={s.root}>
      <style>{`
        @media (max-width: 900px) { .dp-tpl-body { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Email Templates</h1>
          <p style={s.subtitle}>Create and manage your outreach message templates</p>
        </div>
        <button style={s.newBtn} onClick={newTemplate}>+ New Template</button>
      </div>

      <div className="dp-tpl-body" style={s.body}>
        {/* Left column — filter pills above the template list */}
        <div style={s.leftCol}>
          <div style={s.filterRow}>
            {["all", "email", "instagram"].map(t => (
              <button key={t} style={{ ...s.filterTab, ...(typeFilter === t ? s.filterTabActive : {}) }}
                onClick={() => setTypeFilter(t)}>
                {t === "all" ? "All" : t === "email" ? "📧 Email" : "📸 Instagram"}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={s.listPanel}>
          {loading ? <p style={s.empty}>Loading...</p> :
            templates.length === 0 && !isNew ? (
              <div style={s.emptyState}>
                <span style={{ fontSize: 32 }}>✉️</span>
                <p>No templates yet. Create one to get started.</p>
              </div>
            ) : (
              templates.filter(t => typeFilter === "all" || t.type === typeFilter).map(t => (
                <div key={t.id}
                  style={{ ...s.templateItem, ...(active?.id === t.id && !isNew ? s.templateItemActive : {}) }}
                  onClick={() => selectTemplate(t)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <p style={s.templateName}>{t.name}</p>
                      <span style={{ ...s.typePill, ...(t.type === "instagram" ? s.typePillIG : {}) }}>
                        {t.type === "instagram" ? "IG" : "Email"}
                      </span>
                    </div>
                    {t.type === "email" && <p style={s.templateSubject}>{t.subject}</p>}
                    <p style={s.templatePreview}>{stripHtml(t.body).substring(0, 60)}...</p>
                  </div>
                  <button style={s.deleteBtn} onClick={e => { e.stopPropagation(); setDeleteConfirm(t.id); }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor panel */}
        <div style={s.editor}>
          {(!active && !isNew) ? (
            <div style={s.emptyState}>
              <span style={{ fontSize: 32 }}>📝</span>
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
                <p style={s.hint}>Use <code style={s.code}>{"{hotel_name}"}</code> to auto-fill the hotel name</p>

                {/* Toolbar + editor in one bordered box */}
                <div style={s.richEditorBox}>
                  <Toolbar onCmd={execCmd} />
                  <div style={s.richEditorDivider} />
                  <RichEditor
                    ref={editorRef}
                    key={`body-${active?.id || "new"}`}
                    initialHtml={form.body}
                    onChange={html => setForm(f => ({ ...f, body: html }))}
                    placeholder="Hi {hotel_name} team,&#10;&#10;Write your message here..."
                  />
                </div>
                <p style={s.charCount}>{stripHtml(form.body).length} characters</p>
              </div>

              {/* Email Signature */}
              {form.type === "email" && (
                <div style={s.sigSection}>
                  <label style={s.label}>Email Signature</label>
                  <div style={s.sigBox}>
                    <div
                      ref={sigRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="sig-editor"
                      data-placeholder="e.g. — Charles Gore&#10;UGC Creator"
                      style={s.sigEditorStyle}
                    />
                  </div>
                  <div style={s.sigActions}>
                    <button style={s.sigSaveBtn} onClick={saveSignature} disabled={signatureSaving}>
                      {signatureSaving ? "Saving..." : "Save Signature"}
                    </button>
                    <button style={s.sigInsertBtn} onClick={insertSignature} title="Appends your signature to the message above">
                      Insert into Message ↑
                    </button>
                  </div>
                </div>
              )}

              <div style={s.saveRow}>
                <button
                  style={{ ...s.saveBtn, opacity: !form.name.trim() || !stripHtml(form.body).trim() || saving ? 0.5 : 1 }}
                  onClick={save}
                  disabled={!form.name.trim() || !stripHtml(form.body).trim() || saving}
                >
                  {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Type picker modal */}
      {showTypePicker && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 6 }}>What type of template?</h3>
            <p style={{ fontSize: 13, color: "var(--color-ink-muted)", marginBottom: 24 }}>Choose the type before writing your message</p>
            <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
              <button style={s.typePickerBtn} onClick={() => startNewTemplate("email")}>
                <div style={s.typePickerIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-terracotta)" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm0 0l8 9 8-9" /></svg>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontWeight: 700, color: "var(--color-ink-primary)", fontSize: 15, marginBottom: 2 }}>Email Template</p>
                  <p style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>Has subject line — used for email outreach</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
              <button style={s.typePickerBtn} onClick={() => startNewTemplate("instagram")}>
                <div style={{ ...s.typePickerIcon, background: "rgba(193,53,132,0.08)" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand-instagram)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="var(--brand-instagram)" /></svg>
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontWeight: 700, color: "var(--color-ink-primary)", fontSize: 15, marginBottom: 2 }}>Instagram DM Template</p>
                  <p style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>No subject — used for Instagram direct messages</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
            <button style={{ ...s.cancelBtn, marginTop: 16, width: "100%" }} onClick={() => setShowTypePicker(false)}>Cancel</button>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.confirmModal}>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>Delete this template?</h3>
            <p style={{ fontSize: 14, color: "var(--color-ink-mid)", marginBottom: 20 }}>This cannot be undone.</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.deleteConfirmBtn} onClick={() => deleteTemplate(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const s = {
  root: { padding: "32px 24px 80px", maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 },
  title: { fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "var(--color-ink-muted)" },
  newBtn: { background: "var(--color-action-forest)", color:"var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "11px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
  body: { display: "grid", gridTemplateColumns: "330px 1fr", gap: 24, alignItems: "start" },
  leftCol: { display: "flex", flexDirection: "column", gap: 14 },
  filterRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  listPanel: { display: "flex", flexDirection: "column", gap: 8 },
  templateItem: { padding: "14px", borderRadius: 12, border: "1.5px solid var(--color-border)", cursor: "pointer", background:"var(--color-ground-card)", transition: "all 0.15s", display: "flex", alignItems: "flex-start", gap: 10 },
  templateItemActive: { border:"1.5px solid var(--color-accent-amber)", background: "var(--color-amber-tint)" },
  templateName: { fontSize: 14, fontWeight: 600, color: "var(--color-ink-primary)", marginBottom: 2 },
  templateSubject: { fontSize: 12, color: "var(--color-accent-terracotta)", marginBottom: 3 },
  templatePreview: { fontSize: 11, color: "var(--color-ink-muted)", lineHeight: 1.5 },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 },
  editor: { background:"var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-low)", padding: "26px" },
  editorHeader: { marginBottom: 20 },
  editorTitle: { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, color: "var(--color-ink-primary)" },
  field: { marginBottom: 20 },
  label: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--color-ink-muted)", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 },
  hint: { fontSize: 12, color: "var(--color-ink-muted)", marginBottom: 8 },
  code: { background: "var(--color-ground-sand)", padding: "1px 6px", borderRadius: 4, fontSize: 11, fontFamily: "monospace" },
  input: { width: "100%", border: "1.5px solid var(--color-border)", borderRadius: 10, padding: "11px 14px", fontSize: 14, fontFamily: "inherit", color: "var(--color-ink-primary)", outline: "none" },
  // Toolbar + editor in one box
  richEditorBox: { border: "1.5px solid var(--color-border)", borderRadius: 12, overflow: "hidden", background:"var(--color-ground-card)" },
  richEditorDivider: { height: 1, background: "rgba(43,39,34,0.07)" },
  toolbar: { display: "flex", gap: 2, padding: "8px 10px", alignItems: "center", background: "var(--color-ground-sand)", flexWrap: "wrap" },
  toolBtn: { display: "flex", alignItems: "center", justifyContent: "center", gap: 4, padding: "5px 10px", border: "none", borderRadius: 6, background: "transparent", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "var(--color-ink-primary)", lineHeight: 1, minWidth: 32 },
  toolSep: { width: 1, height: 18, background: "var(--color-border)", margin: "0 4px" },
  charCount: { fontSize: 11.5, color: "var(--color-ink-faint)", marginTop: 6, textAlign: "right" },
  // Signature
  sigSection: { marginTop: 4, marginBottom: 20, background: "var(--color-ground-sand)", borderRadius: 12, border: "1.5px solid var(--color-border)", padding: "16px" },
  sigBox: { border: "1.5px solid var(--color-border)", borderRadius: 8, background:"var(--color-ground-card)", padding: "10px 14px", marginBottom: 10 },
  sigEditorStyle: { minHeight: 72, outline: "none", lineHeight: 1.75, fontSize: 13, fontFamily: "inherit", color: "var(--color-ink-primary)" },
  sigActions: { display: "flex", gap: 8, alignItems: "center" },
  sigSaveBtn: { padding: "8px 16px", background: "var(--color-ink-primary)", color:"var(--color-ground-page)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  sigInsertBtn: { padding: "8px 16px", background:"var(--color-action-forest)", color:"var(--color-ground-page)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  saveRow: { marginTop: 8 },
  saveBtn: { background:"var(--color-action-forest)", color:"var(--color-ground-page)", border: "none", borderRadius: "var(--radius-lg)", padding: "13px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)", transition: "opacity 0.2s" },
  emptyState: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "48px 24px", color: "var(--color-ink-muted)", fontSize: 14, textAlign: "center" },
  filterTab: { padding: "5px 12px", border: "1px solid var(--color-border)", borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer", color: "var(--color-ink-muted)", background:"var(--color-ground-card)", fontFamily: "inherit", transition: "all 0.15s" },
  filterTabActive: { background: "var(--color-action-forest)", color: "var(--color-ground-page)", border: "1px solid var(--color-action-forest)", fontWeight: 700 },
  typePickerBtn: { display: "flex", alignItems: "center", gap: 14, padding: "16px", border: "1.5px solid var(--color-border)", borderRadius: 12, background:"var(--color-ground-card)", cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", width: "100%" },
  typePickerIcon: { width: 48, height: 48, borderRadius: 12, background: "rgba(224,149,74,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  typePill: { fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--color-amber-tint)", color:"var(--color-accent-amber-deep)" },
  typePillIG: { background: "rgba(193,53,132,0.08)", color: "var(--brand-instagram)" },
  empty: { color: "var(--color-ink-muted)", fontSize: 14, padding: "24px", textAlign: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(43,39,34,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background:"var(--color-ground-card)", borderRadius: 16, padding: "28px", maxWidth: 420, width: "90%" },
  confirmModal: { background:"var(--color-ground-card)", borderRadius: 16, padding: "28px", maxWidth: 380, width: "90%" },
  cancelBtn: { background:"var(--color-ground-card)", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: 9, padding: "10px 20px", fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  deleteConfirmBtn: { background: "var(--color-error)", color:"var(--color-ground-page)", border: "none", borderRadius: 9, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
};
