"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import { useAuth } from "../../../../lib/auth";
import HotelAccountTabs from "../../../../components/HotelAccountTabs";

const MAX_IMAGE = 15 * 1024 * 1024; // 15MB
const BUCKET = "property-images";

// Extract the storage object path from a public URL for deletion.
function objectPathFromUrl(url) {
  const marker = `/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

export default function HotelPropertyPhotosPage() {
  const { user } = useAuth();
  const [hotelId, setHotelId] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: hp } = await supabase.from("hotel_profiles").select("id").eq("user_id", user.id).maybeSingle();
    if (!hp) { setNoProfile(true); setLoading(false); return; }
    setNoProfile(false);
    setHotelId(hp.id);
    const { data } = await supabase.from("property_images").select("*").eq("hotel_id", hp.id).order("created_at", { ascending: false });
    setImages(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const uploadFiles = async (files) => {
    if (!user || !hotelId || !files?.length) return;
    setUploading(true); setError("");
    const toInsert = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) { setError("Only image files are allowed."); continue; }
      if (file.size > MAX_IMAGE) { setError(`"${file.name}" is over 15MB.`); continue; }
      const safe = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) { setError("Upload failed: " + upErr.message); continue; }
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      toInsert.push({ hotel_id: hotelId, url: data.publicUrl, file_name: file.name, file_size: file.size });
    }
    if (toInsert.length) {
      const { data: rows, error: insErr } = await supabase.from("property_images").insert(toInsert).select("*");
      if (insErr) setError(insErr.message);
      else setImages(prev => [...(rows || []), ...prev]);
    }
    setUploading(false);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length) uploadFiles(files);
  };

  const doDelete = async (img) => {
    setConfirmDel(null);
    const path = objectPathFromUrl(img.url);
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("property_images").delete().eq("id", img.id);
    setImages(prev => prev.filter(x => x.id !== img.id));
  };

  return (
    <div style={s.wrap}>
      <HotelAccountTabs />

      <div style={s.header}>
        <h1 style={s.title}>Property photos</h1>
        <p style={s.sub}>Build a library of your property’s photos, then attach a selection to any job so creators can see the space while reviewing it.</p>
      </div>

      {noProfile ? (
        <div style={s.noticeWarn}>Set up your <Link href="/hotel/profile" style={s.inlineLink}>hotel profile</Link> first.</div>
      ) : loading ? (
        <div style={s.loadingRow}><span style={s.spinner} /> Loading…</div>
      ) : (
        <>
          <div
            style={{ ...s.dropzone, ...(dragging ? s.dropzoneActive : {}) }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <div style={s.dropIcon}>🏨</div>
            <div style={s.dropTitle}>{uploading ? "Uploading…" : "Drag & drop photos here"}</div>
            <div style={s.dropSub}>or click to browse — JPG, PNG or WebP, up to 15MB each</div>
            <span style={s.chooseBtn}>Choose files</span>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
              onChange={e => { const f = Array.from(e.target.files || []); if (f.length) uploadFiles(f); e.target.value = ""; }} />
          </div>

          {error && <p style={s.error}>{error}</p>}

          {images.length === 0 ? (
            <div style={s.empty}>No property photos yet. Upload a few above.</div>
          ) : (
            <>
              <div style={s.count}>{images.length} photo{images.length === 1 ? "" : "s"}</div>
              <div style={s.gallery}>
                {images.map(img => (
                  <div key={img.id} style={s.tile}>
                    <img src={img.url} alt={img.file_name || ""} style={s.tileImg} />
                    <button style={s.tileDelete} onClick={() => setConfirmDel(img)} aria-label="Delete photo" title="Delete">✕</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {confirmDel && (
        <div style={s.overlay} onClick={() => setConfirmDel(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>Delete this photo?</h3>
            <p style={s.modalText}>It will be removed from your library. Jobs that already use it will no longer show it.</p>
            <div style={s.modalActions}>
              <button style={s.ghost} onClick={() => setConfirmDel(null)}>Cancel</button>
              <button style={s.deleteBtn} onClick={() => doDelete(confirmDel)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  wrap: { maxWidth: 820, margin: "0 auto", padding: "40px 24px 64px" },
  header: { marginBottom: 22 },
  title: { fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em", color: "var(--color-ink-primary)" },
  sub: { fontSize: 14, color: "var(--color-ink-muted)", marginTop: 6, maxWidth: "58ch", lineHeight: 1.55 },
  noticeWarn: { background: "var(--status-sent-bg)", color: "var(--status-sent-ink)", border: "1px solid rgba(43,39,34,0.08)", borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 13.5, lineHeight: 1.5 },
  inlineLink: { color: "var(--color-accent-amber-deep)", fontWeight: 700 },
  loadingRow: { display: "flex", alignItems: "center", gap: 10, color: "var(--color-ink-muted)", fontSize: 14, padding: "40px 0" },
  spinner: { display: "inline-block", width: 16, height: 16, border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent-amber)", borderRadius: "50%", animation: "spin 0.7s linear infinite" },

  dropzone: { border: "1.5px dashed var(--color-border)", borderRadius: "var(--radius-card)", padding: "34px 24px", textAlign: "center", cursor: "pointer", background: "var(--color-ground-card)", transition: "border-color .15s, background .15s" },
  dropzoneActive: { borderColor: "var(--color-action-forest)", background: "rgba(47,74,54,0.05)" },
  dropIcon: { fontSize: 28, marginBottom: 8 },
  dropTitle: { fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--color-ink-primary)" },
  dropSub: { fontSize: 13, color: "var(--color-ink-muted)", marginTop: 4 },
  chooseBtn: { display: "inline-block", marginTop: 14, background: "var(--color-action-forest)", color: "var(--color-ground-page)", borderRadius: "var(--radius-md)", padding: "9px 18px", fontSize: 13, fontWeight: 700, fontFamily: "var(--font-display)" },
  error: { fontSize: 13, color: "var(--color-error)", fontWeight: 600, margin: "12px 0 0" },

  count: { fontSize: 13, fontWeight: 600, color: "var(--color-ink-muted)", margin: "24px 0 12px" },
  empty: { textAlign: "center", padding: "40px 20px", color: "var(--color-ink-muted)", fontSize: 14, marginTop: 20, border: "1px dashed var(--color-border)", borderRadius: "var(--radius-card)" },
  gallery: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 },
  tile: { position: "relative", aspectRatio: "4 / 3", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--color-border)", background: "var(--color-ground-sand)" },
  tileImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  tileDelete: { position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", border: "none", background: "rgba(43,39,34,0.6)", color: "var(--color-ground-page)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },

  overlay: { position: "fixed", inset: 0, background: "rgba(43,39,34,0.55)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { background: "var(--color-ground-card)", borderRadius: "var(--radius-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-popup)", padding: "26px 28px", maxWidth: 420, width: "100%" },
  modalTitle: { fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 700, color: "var(--color-ink-primary)", marginBottom: 8 },
  modalText: { fontSize: 14, color: "var(--color-ink-mid)", lineHeight: 1.55, marginBottom: 20 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 10 },
  ghost: { background: "transparent", color: "var(--color-ink-mid)", border: "1.5px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  deleteBtn: { background: "var(--color-error)", color: "var(--color-ground-page)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 18px", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-display)" },
};
