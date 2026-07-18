"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

// Seeded once for a brand-new user so the page demonstrates a filled-out
// portfolio instead of an empty state. These are real, deletable rows — they
// carry no uploaded file (file_url stays null), so their View action is
// disabled until the user replaces them with a real upload.
const SAMPLE_PORTFOLIOS = [
  { name: "Travel Photography 2025",   file_name: "travel-photography-2025.pdf",  file_size: 4_200_000, file_url: null },
  { name: "Boutique Stays Media Kit",  file_name: "boutique-stays-media-kit.pdf", file_size: 2_800_000, file_url: null },
  { name: "Instagram Rate Card",       file_name: "instagram-rate-card.pdf",      file_size: 1_100_000, file_url: null },
];

export default function PortfolioPage() {
  const [portfolios, setPortfolios]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [portfolioName, setPortfolioName] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [dragging, setDragging]         = useState(false);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => { fetchPortfolios(); }, []);

  const fetchPortfolios = async () => {
    setLoading(true);
    if (!user) return;
    const { data, error } = await supabase
      .from("portfolios")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { setError("Could not load portfolios."); setLoading(false); return; }

    // A brand-new user sees three sample rows so the page shows what a
    // filled-out portfolio looks like. They're real rows they can delete or
    // replace — seeded once, only when the portfolio is completely empty.
    if ((data || []).length === 0) {
      const seeded = await seedSamples();
      setPortfolios(seeded);
    } else {
      setPortfolios(data);
    }
    setLoading(false);
  };

  const seedSamples = async () => {
    const rows = SAMPLE_PORTFOLIOS.map(sample => ({ ...sample, user_id: user.id }));
    const { data, error } = await supabase.from("portfolios").insert(rows).select();
    // If seeding fails (e.g. offline), fall back to the real empty state
    // rather than showing cards that aren't actually saved.
    if (error) return [];
    return data || [];
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setError("Only PDF files are supported."); return; }
    if (file.size > 10 * 1024 * 1024) { setError("File must be under 10MB."); return; }
    setError("");
    setSelectedFile(file);
    if (!portfolioName) setPortfolioName(file.name.replace(".pdf", ""));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const upload = async () => {
    if (!selectedFile || !portfolioName.trim()) return;
    setUploading(true);
    setError("");
    setUploadProgress(0);

    try {
      const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from("portfolios")
        .upload(fileName, selectedFile, { contentType: "application/pdf" });

      if (storageError) throw new Error(storageError.message);

      setUploadProgress(70);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("portfolios")
        .getPublicUrl(fileName);

      const fileUrl = urlData.publicUrl;

      // Save to database
      const { error: dbError } = await supabase.from("portfolios").insert({
        name: portfolioName.trim(),
        file_url: fileUrl,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
        user_id: user.id,
      });

      if (dbError) throw new Error(dbError.message);

      setUploadProgress(100);
      setSuccess(`"${portfolioName}" uploaded successfully!`);
      setPortfolioName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await fetchPortfolios();
      setTimeout(() => setSuccess(""), 3000);
    } catch (e) {
      setError("Upload failed: " + e.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deletePortfolio = async (portfolio) => {
    try {
      // Sample rows have no uploaded file — only remove storage for real ones.
      if (portfolio.file_url) {
        const fileName = portfolio.file_url.split("/").pop();
        await supabase.storage.from("portfolios").remove([fileName]);
      }
      await supabase.from("portfolios").delete().eq("id", portfolio.id);
      setPortfolios(prev => prev.filter(p => p.id !== portfolio.id));
      setDeleteConfirm(null);
    } catch (e) {
      setError("Could not delete portfolio.");
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={s.root}>
      <style>{`
        @media (max-width: 1000px) { .dp-pf-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 640px)  { .dp-pf-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Portfolio</h1>
          <p style={s.subtitle}>Upload your PDF portfolios to attach to outreach emails</p>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}
      {success && <div style={s.successBox}>{success}</div>}

      {/* Upload banner — full width, dashed amber */}
      <div
        style={{ ...s.uploadBanner, ...(dragging ? s.uploadBannerActive : {}) }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          style={{ display:"none" }}
          onChange={e => handleFileSelect(e.target.files[0])}
        />
        <div style={s.bannerIcon}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-terracotta)" strokeWidth="1.9">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>

        {selectedFile ? (
          <div style={{ flex:1, minWidth:0 }}>
            <p style={s.bannerTitle}>{selectedFile.name}</p>
            <p style={s.bannerSub}>{formatSize(selectedFile.size)} — name it below, then upload</p>
            <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }} onClick={e => e.stopPropagation()}>
              <input
                style={s.bannerInput}
                placeholder="Portfolio name e.g. Travel Photography 2025"
                value={portfolioName}
                onChange={e => setPortfolioName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && upload()}
                autoFocus
              />
              <button
                style={{ ...s.chooseBtn, opacity: portfolioName.trim() && !uploading ? 1 : 0.45 }}
                onClick={upload}
                disabled={!portfolioName.trim() || uploading}
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
              <button style={s.bannerCancel} onClick={() => { setSelectedFile(null); setPortfolioName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                Cancel
              </button>
            </div>
            {uploading && (
              <div style={s.progressWrap}><div style={{ ...s.progressBar, width: `${uploadProgress}%` }} /></div>
            )}
          </div>
        ) : (
          <>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={s.bannerTitle}>{dragging ? "Drop your PDF here" : "Drag & drop a PDF, or click to browse"}</p>
              <p style={s.bannerSub}>PDF only, max 10MB — name it after upload</p>
            </div>
            <button style={s.chooseBtn} onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
              Choose File
            </button>
          </>
        )}
      </div>

      {/* Portfolio cards */}
      {loading ? (
        <div style={s.empty}><div style={s.loadingSpinner} /><p>Loading…</p></div>
      ) : portfolios.length === 0 ? (
        <div style={s.empty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <p style={{ fontSize:14, color:"var(--color-ink-muted)", marginTop:12 }}>No portfolios yet</p>
          <p style={{ fontSize:12, color:"var(--color-ink-faint)" }}>Upload your first PDF above</p>
        </div>
      ) : (
        <div className="dp-pf-grid" style={s.cardGrid}>
          {portfolios.map(portfolio => (
            <div key={portfolio.id} style={s.pfCard}>
              {/* Icon-tile preview */}
              <div style={s.pfPreview}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-terracotta)" strokeWidth="1.6">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>

              <div style={s.pfBody}>
                <p style={s.pfName}>
                  {portfolio.name}
                  {!portfolio.file_url && <span style={s.sampleTag}>Sample</span>}
                </p>
                <p style={s.pfMeta}>
                  {portfolio.file_name}
                  {portfolio.file_size ? ` \u00b7 ${formatSize(portfolio.file_size)}` : ""}
                </p>
                <p style={s.pfDate}>
                  {portfolio.file_url
                    ? new Date(portfolio.created_at).toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" })
                    : "Example — upload your own to replace it"}
                </p>

                <div style={s.pfActions}>
                  {portfolio.file_url ? (
                    <a href={portfolio.file_url} target="_blank" rel="noreferrer" style={s.viewBtn} title="View PDF">View</a>
                  ) : (
                    <span style={{ ...s.viewBtn, ...s.viewBtnDisabled }} title="Sample — no file uploaded yet">View</span>
                  )}
                  <button style={s.deleteBtn} onClick={() => setDeleteConfirm(portfolio)} title="Delete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14H6L5 6"/>
                      <path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={s.modalTitle}>Delete this portfolio?</h3>
            <p style={s.modalDesc}>"{deleteConfirm.name}" will be permanently deleted. This cannot be undone.</p>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.confirmDeleteBtn} onClick={() => deletePortfolio(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { padding:"28px 20px 80px", maxWidth:1000, margin:"0 auto" },
  header: { marginBottom:28 },
  title: { fontSize:26, fontWeight:700, color:"var(--color-ink-primary)", letterSpacing:"-0.3px", marginBottom:4 },
  subtitle: { fontSize:14, color:"var(--color-ink-muted)" },
  errorBox: { background:"var(--status-error-bg)", border:"1px solid var(--color-accent-amber)", borderRadius:10, padding:"12px 16px", color:"var(--color-error)", fontSize:13, marginBottom:16 },
  successBox: { background:"var(--status-success-bg)", border:"1px solid rgba(22,101,52,0.3)", borderRadius:10, padding:"12px 16px", color:"var(--status-success-ink)", fontSize:13, marginBottom:16 },
  // Upload banner — full width, dashed amber
  uploadBanner: { display:"flex", alignItems:"center", gap:18, padding:"22px 24px", marginBottom:26, border:"2px dashed var(--color-accent-amber)", borderRadius:"var(--radius-card)", background:"var(--color-amber-tint)", cursor:"pointer", transition:"background 0.2s, border-color 0.2s", flexWrap:"wrap" },
  uploadBannerActive: { borderColor:"var(--color-accent-terracotta)", background:"rgba(224,149,74,0.18)" },
  bannerIcon: { width:56, height:56, flex:"none", borderRadius:"var(--radius-lg)", background:"rgba(224,149,74,0.22)", display:"flex", alignItems:"center", justifyContent:"center" },
  bannerTitle: { fontFamily:"var(--font-display)", fontSize:17, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:3 },
  bannerSub: { fontSize:13, color:"var(--color-ink-mid)" },
  bannerInput: { flex:1, minWidth:200, border:"1.5px solid var(--color-border)", borderRadius:"var(--radius-md)", padding:"10px 13px", fontSize:13.5, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", background:"var(--color-ground-card)" },
  bannerCancel: { fontSize:13, fontWeight:600, color:"var(--color-ink-mid)", background:"none", border:"1px solid var(--color-border)", borderRadius:"var(--radius-md)", padding:"10px 16px", cursor:"pointer", fontFamily:"inherit" },
  chooseBtn: { flex:"none", padding:"12px 22px", background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-lg)", fontSize:14, fontWeight:700, fontFamily:"var(--font-display)", cursor:"pointer", whiteSpace:"nowrap" },

  progressWrap: { height:4, background:"var(--color-ground-sand)", borderRadius:4, marginTop:12, overflow:"hidden" },
  progressBar: { height:"100%", background:"var(--color-action-forest)", borderRadius:4, transition:"width 0.3s ease" },

  // Card gallery
  cardGrid: { display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:20, alignItems:"start" },
  pfCard: { background:"var(--color-ground-card)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-card)", overflow:"hidden", boxShadow:"var(--shadow-low)" },
  pfPreview: { height:150, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(160deg, var(--color-ground-sand), var(--color-amber-tint))" },
  pfBody: { padding:"16px 18px 18px" },
  pfName: { fontFamily:"var(--font-display)", fontSize:15, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:4 },
  pfMeta: { fontSize:12, color:"var(--color-ink-muted)", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  pfDate: { fontSize:12, color:"var(--color-ink-faint)", marginBottom:14 },
  pfActions: { display:"flex", alignItems:"center", gap:8 },

  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(247,243,239,0.3)", borderTopColor:"var(--color-ground-page)", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 24px", gap:8, color:"var(--color-ink-muted)", textAlign:"center" },
  loadingSpinner: { width:24, height:24, border:"2.5px solid var(--color-ground-sand)", borderTopColor:"var(--color-accent-amber)", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  portfolioList: { display:"flex", flexDirection:"column", gap:10 },
  portfolioItem: { display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:12, border:"1px solid var(--color-ground-sand)", background:"var(--color-ground-sand)", transition:"border-color 0.15s" },
  portfolioIcon: { width:44, height:44, background:"rgba(224,149,74,0.16)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  portfolioInfo: { flex:1, minWidth:0 },
  portfolioName: { fontSize:14, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:2 },
  portfolioMeta: { fontSize:11, color:"var(--color-ink-muted)", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  portfolioSize: { color:"var(--color-border)" },
  portfolioDate: { fontSize:11, color:"var(--color-border)" },
  portfolioActions: { display:"flex", alignItems:"center", gap:8, flexShrink:0 },
  viewBtn: { flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"10px 12px", background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:"var(--radius-md)", fontSize:13, fontWeight:700, fontFamily:"var(--font-display)", cursor:"pointer", textDecoration:"none" },
  viewBtnDisabled: { background:"var(--color-ground-sand)", color:"var(--color-ink-muted)", cursor:"default" },
  sampleTag: { marginLeft:8, fontSize:10, fontWeight:700, letterSpacing:"0.04em", textTransform:"uppercase", color:"var(--color-accent-amber-deep)", background:"var(--color-amber-tint)", padding:"2px 7px", borderRadius:"var(--radius-pill)", verticalAlign:"middle" },
  deleteBtn: { width:40, height:40, flex:"none", display:"flex", alignItems:"center", justifyContent:"center", background:"var(--color-ground-card)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-md)", cursor:"pointer" },
  overlay: { position:"fixed", inset:0, background:"rgba(43,39,34,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"var(--color-ground-card)", borderRadius:16, padding:"28px", maxWidth:400, width:"100%" },
  modalTitle: { fontSize:18, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:8 },
  modalDesc: { fontSize:14, color:"var(--color-ink-mid)", marginBottom:24, lineHeight:1.6 },
  modalActions: { display:"flex", gap:10, justifyContent:"flex-end" },
  cancelBtn: { padding:"10px 20px", border:"1.5px solid var(--color-border)", borderRadius:9, background:"var(--color-ground-card)", fontSize:14, cursor:"pointer", color:"var(--color-ink-mid)", fontFamily:"inherit" },
  confirmDeleteBtn: { padding:"10px 20px", background:"var(--color-error)", color:"var(--color-ground-page)", border:"none", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
};
