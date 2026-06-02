"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

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
    if (error) setError("Could not load portfolios.");
    else setPortfolios(data || []);
    setLoading(false);
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
      // Extract filename from URL
      const fileName = portfolio.file_url.split("/").pop();
      await supabase.storage.from("portfolios").remove([fileName]);
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
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Portfolio</h1>
          <p style={s.subtitle}>Upload your PDF portfolios to attach to outreach emails</p>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}
      {success && <div style={s.successBox}>{success}</div>}

      <div style={s.layout}>
        {/* Upload panel */}
        <div style={s.uploadPanel}>
          <h2 style={s.panelTitle}>Upload New Portfolio</h2>

          {/* Drop zone */}
          <div
            style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}), ...(selectedFile ? s.dropZoneDone : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              style={{ display:"none" }}
              onChange={e => handleFileSelect(e.target.files[0])}
            />
            {selectedFile ? (
              <>
                <div style={s.pdfIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="1.8">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                  </svg>
                </div>
                <p style={s.dropFileName}>{selectedFile.name}</p>
                <p style={s.dropFileSize}>{formatSize(selectedFile.size)}</p>
                <button style={s.changeFileBtn} onClick={e => { e.stopPropagation(); setSelectedFile(null); setPortfolioName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                  Change file
                </button>
              </>
            ) : (
              <>
                <div style={s.dropIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9FB3C8" strokeWidth="1.8">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </div>
                <p style={s.dropTitle}>{dragging ? "Drop your PDF here" : "Drag and drop your PDF"}</p>
                <p style={s.dropSub}>or click to browse — PDF only, max 10MB</p>
              </>
            )}
          </div>

          {/* Name input */}
          <div style={s.field}>
            <label style={s.label}>Portfolio Name</label>
            <input
              style={s.input}
              placeholder="e.g. Travel Photography 2025"
              value={portfolioName}
              onChange={e => setPortfolioName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && upload()}
            />
          </div>

          {/* Progress bar */}
          {uploading && (
            <div style={s.progressWrap}>
              <div style={{ ...s.progressBar, width: `${uploadProgress}%` }} />
            </div>
          )}

          <button
            style={{ ...s.uploadBtn, opacity: selectedFile && portfolioName.trim() && !uploading ? 1 : 0.45 }}
            onClick={upload}
            disabled={!selectedFile || !portfolioName.trim() || uploading}
          >
            {uploading ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <span style={s.spinner} />Uploading...
              </span>
            ) : "Upload Portfolio"}
          </button>
        </div>

        {/* Portfolios list */}
        <div style={s.listPanel}>
          <h2 style={s.panelTitle}>Your Portfolios <span style={s.count}>{portfolios.length}</span></h2>

          {loading ? (
            <div style={s.empty}>
              <div style={s.loadingSpinner} />
              <p>Loading...</p>
            </div>
          ) : portfolios.length === 0 ? (
            <div style={s.empty}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#DDD5CC" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <p style={{ fontSize:14, color:"#9FB3C8", marginTop:12 }}>No portfolios yet</p>
              <p style={{ fontSize:12, color:"#DDD5CC" }}>Upload your first PDF portfolio on the left</p>
            </div>
          ) : (
            <div style={s.portfolioList}>
              {portfolios.map(portfolio => (
                <div key={portfolio.id} style={s.portfolioItem}>
                  <div style={s.portfolioIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div style={s.portfolioInfo}>
                    <p style={s.portfolioName}>{portfolio.name}</p>
                    <p style={s.portfolioMeta}>
                      {portfolio.file_name}
                      {portfolio.file_size && <span style={s.portfolioSize}> - {formatSize(portfolio.file_size)}</span>}
                    </p>
                    <p style={s.portfolioDate}>{new Date(portfolio.created_at).toLocaleDateString()}</p>
                  </div>
                  <div style={s.portfolioActions}>
                    <a href={portfolio.file_url} target="_blank" rel="noreferrer" style={s.viewBtn} title="View PDF">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                      View
                    </a>
                    <button style={s.deleteBtn} onClick={() => setDeleteConfirm(portfolio)} title="Delete">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
  title: { fontSize:26, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px", marginBottom:4 },
  subtitle: { fontSize:14, color:"#9FB3C8" },
  errorBox: { background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:10, padding:"12px 16px", color:"#B83A22", fontSize:13, marginBottom:16 },
  successBox: { background:"#E8F8F5", border:"1px solid #A8E6E0", borderRadius:10, padding:"12px 16px", color:"#1A6B5A", fontSize:13, marginBottom:16 },
  layout: { display:"grid", gridTemplateColumns:"380px 1fr", gap:24, alignItems:"start" },
  uploadPanel: { background:"#fff", borderRadius:16, border:"1px solid #DDD5CC", padding:"24px" },
  listPanel: { background:"#fff", borderRadius:16, border:"1px solid #DDD5CC", padding:"24px" },
  panelTitle: { fontSize:16, fontWeight:700, color:"#0F2544", marginBottom:20, display:"flex", alignItems:"center", gap:10 },
  count: { background:"#F0EBE5", color:"#9FB3C8", fontSize:12, fontWeight:600, padding:"2px 8px", borderRadius:20 },
  dropZone: { border:"2px dashed #DDD5CC", borderRadius:12, padding:"32px 20px", textAlign:"center", cursor:"pointer", transition:"all 0.2s", marginBottom:20, background:"#FAF7F4" },
  dropZoneActive: { borderColor:"#E85D3D", background:"#FEF0EC" },
  dropZoneDone: { borderColor:"#2A9D8F", background:"#E8F8F5", borderStyle:"solid" },
  dropIcon: { width:56, height:56, background:"#F0EBE5", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" },
  pdfIcon: { width:56, height:56, background:"#FEF0EC", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" },
  dropTitle: { fontSize:14, fontWeight:600, color:"#1E3A5F", marginBottom:4 },
  dropSub: { fontSize:12, color:"#9FB3C8" },
  dropFileName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:2 },
  dropFileSize: { fontSize:12, color:"#9FB3C8", marginBottom:10 },
  changeFileBtn: { fontSize:12, color:"#E85D3D", background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:600, textDecoration:"underline" },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:7 },
  input: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"inherit", color:"#1E3A5F", outline:"none" },
  progressWrap: { height:4, background:"#F0EBE5", borderRadius:4, marginBottom:16, overflow:"hidden" },
  progressBar: { height:"100%", background:"#E85D3D", borderRadius:4, transition:"width 0.3s ease" },
  uploadBtn: { width:"100%", padding:13, background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer", transition:"opacity 0.2s" },
  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(247,243,239,0.3)", borderTopColor:"#F7F3EF", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"48px 24px", gap:8, color:"#9FB3C8", textAlign:"center" },
  loadingSpinner: { width:24, height:24, border:"2.5px solid #F0EBE5", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  portfolioList: { display:"flex", flexDirection:"column", gap:10 },
  portfolioItem: { display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:12, border:"1px solid #F0EBE5", background:"#FAF7F4", transition:"border-color 0.15s" },
  portfolioIcon: { width:44, height:44, background:"#FEF0EC", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  portfolioInfo: { flex:1, minWidth:0 },
  portfolioName: { fontSize:14, fontWeight:700, color:"#0F2544", marginBottom:2 },
  portfolioMeta: { fontSize:11, color:"#9FB3C8", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  portfolioSize: { color:"#C4B8AD" },
  portfolioDate: { fontSize:11, color:"#C4B8AD" },
  portfolioActions: { display:"flex", alignItems:"center", gap:8, flexShrink:0 },
  viewBtn: { display:"flex", alignItems:"center", gap:5, padding:"7px 12px", background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", textDecoration:"none" },
  deleteBtn: { width:32, height:32, background:"#fff", border:"1px solid #DDD5CC", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"#fff", borderRadius:16, padding:"28px", maxWidth:400, width:"100%" },
  modalTitle: { fontSize:18, fontWeight:700, color:"#0F2544", marginBottom:8 },
  modalDesc: { fontSize:14, color:"#4A6A8A", marginBottom:24, lineHeight:1.6 },
  modalActions: { display:"flex", gap:10, justifyContent:"flex-end" },
  cancelBtn: { padding:"10px 20px", border:"1.5px solid #DDD5CC", borderRadius:9, background:"#fff", fontSize:14, cursor:"pointer", color:"#4A6A8A", fontFamily:"inherit" },
  confirmDeleteBtn: { padding:"10px 20px", background:"#ef4444", color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
};
