"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useAuth } from "../../lib/auth";
import { useIsMobile } from "../../lib/useIsMobile";

export default function ListsPage() {
  const [lists, setLists]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showNew, setShowNew]         = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [activeList, setActiveList]   = useState(null);
  const [listHotels, setListHotels]   = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [igModal, setIgModal] = useState(null); // { hotel, message }
  const [igTemplates, setIgTemplates] = useState([]);
  const [igMessage, setIgMessage] = useState("");
  const [igTemplateId, setIgTemplateId] = useState("");
  const [dbError, setDbError]         = useState("");
  const { user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => { fetchLists(); fetchIgTemplates(); }, []);

  const fetchIgTemplates = async () => {
    const { data } = await supabase.from("templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setIgTemplates(data || []);
  };

  const fetchLists = async () => {
    setLoading(true);
    setDbError("");
    if (!user) return;
    const { data, error } = await supabase
      .from("lists")
      .select("id, name, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setDbError("Could not load lists. Make sure your Supabase keys are set correctly.");
    } else {
      setLists(data || []);
    }
    setLoading(false);
  };

  const createList = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("lists")
      .insert({ name: newName.trim(), description: newDesc.trim() || null, user_id: user.id })
      .select()
      .single();
    if (error) {
      alert("Could not create list: " + error.message);
    } else if (data) {
      setLists(prev => [data, ...prev]);
      setNewName("");
      setNewDesc("");
      setShowNew(false);
    }
    setSaving(false);
  };

  const deleteList = async (id) => {
    await supabase.from("lists").delete().eq("id", id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (activeList?.id === id) { setActiveList(null); setListHotels([]); }
    setDeleteConfirm(null);
  };

  const openIgDm = (hotel) => {
    const msg = igTemplates[0]?.body?.replace(/\{hotel_name\}/g, hotel.name) || "";
    setIgMessage(msg);
    setIgTemplateId(igTemplates[0]?.id || "");
    setIgModal(hotel);
  };

  const sendIgDm = (hotel, message) => {
    const handle = hotel.instagram?.replace("@", "");
    if (!handle) { alert("No Instagram handle found for this hotel."); return; }
    // Open Instagram DM - pre-fill with handle
    const igUrl = `https://www.instagram.com/${handle}/`;
    window.open(igUrl, "_blank");
    // Copy message to clipboard so user can paste it
    navigator.clipboard.writeText(message).catch(() => {});
    setIgModal(null);
  };

  const openList = async (list) => {
    setActiveList(list);
    setHotelsLoading(true);
    const { data } = await supabase
      .from("list_hotels")
      .select("*")
      .eq("list_id", list.id)
      .order("created_at", { ascending: false });
    setListHotels(data || []);
    setHotelsLoading(false);
  };

  const toggleContacted = async (hotel) => {
    const updated = !hotel.contacted;
    await supabase.from("list_hotels").update({
      contacted: updated,
      contacted_at: updated ? new Date().toISOString() : null,
    }).eq("id", hotel.id);
    setListHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, contacted: updated, contacted_at: updated ? new Date().toISOString() : null } : h));
  };

  const saveNote = async (hotelId, note) => {
    await supabase.from("list_hotels").update({ notes: note }).eq("id", hotelId);
    setListHotels(prev => prev.map(h => h.id === hotelId ? { ...h, notes: note } : h));
    setEditingNote(null);
  };

  const removeHotel = async (hotelId) => {
    await supabase.from("list_hotels").delete().eq("id", hotelId);
    setListHotels(prev => prev.filter(h => h.id !== hotelId));
  };

  // Count hotels per list
  const [hotelCounts, setHotelCounts] = useState({});
  useEffect(() => {
    if (lists.length === 0) return;
    const fetchCounts = async () => {
      const { data } = await supabase.from("list_hotels").select("list_id").eq("user_id", user.id);
      if (data) {
        const counts = {};
        data.forEach(row => { counts[row.list_id] = (counts[row.list_id] || 0) + 1; });
        setHotelCounts(counts);
      }
    };
    fetchCounts();
  }, [lists]);

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Lists</h1>
          <p style={s.subtitle}>Organise hotels into lists for each trip or campaign</p>
        </div>
        <button style={s.newBtn} onClick={() => setShowNew(v => !v)}>
          {showNew ? "Cancel" : "+ New List"}
        </button>
      </div>

      {dbError && <div style={s.errorBox}>{dbError}</div>}

      {/* New list form */}
      {showNew && (
        <div style={s.newForm}>
          <h3 style={s.newFormTitle}>Create New List</h3>
          <input
            style={s.input}
            placeholder="List name e.g. Malibu Summer 2025"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createList()}
            autoFocus
          />
          <input
            style={s.input}
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div style={{ display:"flex", gap:8 }}>
            <button style={s.saveBtn} onClick={createList} disabled={saving || !newName.trim()}>
              {saving ? "Creating..." : "Create List"}
            </button>
            <button style={s.cancelBtn} onClick={() => { setShowNew(false); setNewName(""); setNewDesc(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ ...s.body, ...(isMobile ? s.bodyMobile : {}) }}>
        {/* Lists panel */}
        <div style={s.listsPanel}>
          {loading ? (
            <div style={s.empty}>
              <div style={s.loadingSpinner} />
              <p>Loading your lists...</p>
            </div>
          ) : lists.length === 0 ? (
            <div style={s.empty}>
              <span style={{ fontSize:40 }}>📋</span>
              <p style={{ fontWeight:600, color:"#1E3A5F" }}>No lists yet</p>
              <p style={{ fontSize:13 }}>Create a list to start organising hotels from your searches.</p>
              <button style={s.saveBtn} onClick={() => setShowNew(true)}>+ Create your first list</button>
            </div>
          ) : (
            lists.map(list => (
              <div
                key={list.id}
                style={{ ...s.listItem, background: activeList?.id === list.id ? "#FEF0EC" : "#fff", borderColor: activeList?.id === list.id ? "#E85D3D" : "#DDD5CC" }}
                onClick={() => openList(list)}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={s.listName}>{list.name}</p>
                  {list.description && <p style={s.listDesc}>{list.description}</p>}
                  <p style={s.listMeta}>{hotelCounts[list.id] || 0} hotels</p>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                  <Link href={`/compose?list=${list.id}`}>
                    <button style={s.iconBtn} title="Compose outreach for this list">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </Link>
                  <button style={{ ...s.iconBtn, borderColor:"#fee2e2" }} onClick={() => setDeleteConfirm(list.id)} title="Delete list">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Hotels detail panel */}
        <div style={s.detailPanel}>
          {!activeList ? (
            <div style={s.empty}>
              <span style={{ fontSize:36 }}>👈</span>
              <p>Select a list to see its hotels</p>
            </div>
          ) : (
            <>
              <div style={s.detailHeader}>
                <div>
                  <h2 style={s.detailTitle}>{activeList.name}</h2>
                  <p style={s.detailSub}>{listHotels.length} hotel{listHotels.length !== 1 ? "s" : ""}</p>
                </div>
                <Link href={`/compose?list=${activeList.id}`}>
                  <button style={s.composeBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Compose Emails
                  </button>
                </Link>
              </div>

              {hotelsLoading ? (
                <div style={s.empty}><div style={s.loadingSpinner} /><p>Loading hotels...</p></div>
              ) : listHotels.length === 0 ? (
                <div style={s.empty}>
                  <span style={{ fontSize:36 }}>🏨</span>
                  <p style={{ fontWeight:600, color:"#1E3A5F" }}>No hotels yet</p>
                  <p style={{ fontSize:13 }}>Search for hotels and use the "+ Add to List" button to add them here.</p>
                  <Link href="/" style={{ color:"#E85D3D", fontWeight:600, fontSize:13 }}>Go to Search</Link>
                </div>
              ) : (
                <div style={s.tableWrap}>
                  {/* Table header */}
                  <div style={s.tableHead}>
                    <div style={{ flex:3, fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" }}>Hotel</div>
                    <div style={{ flex:2, fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" }}>Contact</div>
                    <div style={{ flex:1, fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" }}>Status</div>
                    <div style={{ width:40 }}></div>
                  </div>
                  {listHotels.map(hotel => (
                    <div key={hotel.id} style={s.tableRow}>
                      {/* Hotel info */}
                      <div style={{ flex:3, display:"flex", alignItems:"center", gap:10, paddingRight:12 }}>
                        {hotel.photo_url ? (
                          <img src={hotel.photo_url} alt={hotel.name} style={s.thumb} onError={e => { e.target.style.display="none"; }} />
                        ) : (
                          <div style={s.thumbFallback}>🏨</div>
                        )}
                        <div style={{ minWidth:0 }}>
                          <p style={s.hotelName}>{hotel.name}</p>
                          <p style={s.hotelAddr}>{hotel.address}</p>
                          {hotel.rating && <p style={s.hotelRating}>{"★".repeat(Math.round(hotel.rating))} {hotel.rating}</p>}
                        </div>
                      </div>
                      {/* Contact */}
                      <div style={{ flex:2, paddingRight:12 }}>
                        {hotel.email
                          ? <p style={s.emailText}>✉ {hotel.email}</p>
                          : <p style={s.noEmailText}>No email found</p>}
                        {hotel.phone && <p style={s.phoneText}>{hotel.phone}</p>}
                        {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer" style={s.websiteLink}>Visit website</a>}
                      </div>
                      {/* Instagram */}
                      <div style={{ flex:1, paddingRight:12 }}>
                        {hotel.instagram ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <a href={`https://www.instagram.com/${hotel.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={s.igHandle}>
                              {hotel.instagram}
                            </a>
                            <button style={s.igDmBtn} onClick={() => openIgDm(hotel)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                <circle cx="12" cy="12" r="4"/>
                                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                              </svg>
                              Send DM
                            </button>
                          </div>
                        ) : (
                          <p style={s.noEmailText}>No handle found</p>
                        )}
                      </div>
                      {/* Status */}
                      <div style={{ flex:1 }}>
                        <button
                          style={{ ...s.statusBtn, ...(hotel.contacted ? s.contacted : s.pending) }}
                          onClick={() => toggleContacted(hotel)}
                        >
                          {hotel.contacted ? "Contacted" : "Pending"}
                        </button>
                        {hotel.contacted_at && (
                          <p style={s.contactedDate}>{new Date(hotel.contacted_at).toLocaleDateString()}</p>
                        )}
                      </div>
                      {/* Notes */}
                      <div style={{ flex:2, paddingRight:12 }}>
                        {editingNote === hotel.id ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                            <textarea
                              style={s.noteInput}
                              rows={2}
                              value={noteText}
                              onChange={e => setNoteText(e.target.value)}
                              placeholder="Add a note..."
                              autoFocus
                              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(hotel.id, noteText); } if (e.key === "Escape") setEditingNote(null); }}
                            />
                            <div style={{ display:"flex", gap:6 }}>
                              <button style={s.noteSaveBtn} onClick={() => saveNote(hotel.id, noteText)}>Save</button>
                              <button style={s.noteCancelBtn} onClick={() => setEditingNote(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div
                            style={s.noteDisplay}
                            onClick={() => { setEditingNote(hotel.id); setNoteText(hotel.notes || ""); }}
                            title="Click to add/edit note"
                          >
                            {hotel.notes
                              ? <p style={s.noteText}>{hotel.notes}</p>
                              : <p style={s.notePlaceholder}>+ Add note</p>}
                          </div>
                        )}
                      </div>

                      {/* Remove */}
                      <div style={{ width:40, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <button style={s.removeBtn} onClick={() => removeHotel(hotel.id)} title="Remove from list">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Instagram DM Modal */}
      {igModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize:18, fontWeight:700, color:"#0F2544", marginBottom:4 }}>
              Send Instagram DM
            </h3>
            <p style={{ fontSize:13, color:"#9FB3C8", marginBottom:16 }}>
              to {igModal.instagram} — {igModal.name}
            </p>

            {/* Warning */}
            <div style={s.igWarning}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Use sparingly — Instagram may restrict accounts that send too many DMs. We recommend max 20-30 per day.</span>
            </div>

            {/* Template picker */}
            {igTemplates.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <label style={s.igLabel}>Load Template</label>
                <select style={s.igSelect} value={igTemplateId} onChange={e => {
                  setIgTemplateId(e.target.value);
                  const t = igTemplates.find(t => t.id === e.target.value);
                  if (t) setIgMessage(t.body.replace(/\{hotel_name\}/g, igModal.name));
                }}>
                  <option value="">Select a template...</option>
                  {igTemplates.filter(t => t.type === "instagram").length > 0 && (
                    <optgroup label="Instagram Templates">
                      {igTemplates.filter(t => t.type === "instagram").map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {igTemplates.filter(t => t.type !== "instagram").length > 0 && (
                    <optgroup label="Email Templates">
                      {igTemplates.filter(t => t.type !== "instagram").map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <label style={s.igLabel}>Message</label>
              <textarea
                style={s.igTextarea}
                rows={5}
                value={igMessage}
                onChange={e => setIgMessage(e.target.value)}
                placeholder="Write your Instagram DM here..."
              />
              <p style={{ fontSize:11, color: igMessage.length > 1000 ? "#ef4444" : "#9FB3C8", textAlign:"right", marginTop:4 }}>
                {igMessage.length}/1000 characters
              </p>
            </div>

            <p style={s.igNote}>
              Clicking "Open & Copy" will open their Instagram profile in a new tab and copy your message to clipboard — just paste it into the DM box.
            </p>

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setIgModal(null)}>Cancel</button>
              <button style={s.igSendBtn} onClick={() => sendIgDm(igModal, igMessage)} disabled={!igMessage.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                </svg>
                Open & Copy Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:18, marginBottom:8, color:"#0F2544" }}>Delete this list?</h3>
            <p style={{ fontSize:14, color:"#4A6A8A", marginBottom:20 }}>All hotels in this list will also be removed. This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.deleteBtn} onClick={() => deleteList(deleteConfirm)}>Delete List</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 700px) {
          .lists-body { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const s = {
  root: { padding:"28px 20px 80px", maxWidth:1100, margin:"0 auto" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap", padding:"0 0 4px" },
  title: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:26, fontWeight:700, color:"#0F2544", marginBottom:4 },
  subtitle: { fontSize:14, color:"#9FB3C8" },
  newBtn: { background:"#0F2544", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", flexShrink:0 },
  errorBox: { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 16px", color:"#dc2626", fontSize:13, marginBottom:16 },
  newForm: { background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:14, padding:"20px", marginBottom:20, display:"flex", flexDirection:"column", gap:10, maxWidth:500 },
  newFormTitle: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:16, fontWeight:700, color:"#0F2544" },
  input: { border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none" },
  saveBtn: { background:"#E85D3D", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  cancelBtn: { background:"#fff", color:"#4A6A8A", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"10px 20px", fontSize:14, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  body: { display:"grid", gridTemplateColumns:"260px 1fr", gap:16, alignItems:"start" },
  bodyMobile: { display:"grid", gridTemplateColumns:"1fr", gap:16 },
  listsPanel: { display:"flex", flexDirection:"column", gap:8 },
  listItem: { padding:"14px", borderRadius:12, border:"1.5px solid #e2e8f0", cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", gap:10, background:"#fff" },
  listName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:2 },
  listDesc: { fontSize:12, color:"#9FB3C8", marginBottom:3 },
  listMeta: { fontSize:11, color:"#F5A882", fontWeight:500 },
  iconBtn: { width:30, height:30, borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  detailPanel: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", overflow:"hidden", minHeight:300 },
  detailHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", borderBottom:"1px solid #f1f5f9" },
  detailTitle: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:20, fontWeight:700, color:"#0F2544" },
  detailSub: { fontSize:13, color:"#9FB3C8", marginTop:2 },
  composeBtn: { display:"flex", alignItems:"center", gap:8, background:"#E85D3D", color:"#fff", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  tableWrap: { overflowX:"auto", WebkitOverflowScrolling:"touch" },
  tableHead: { display:"flex", padding:"10px 20px", background:"#FAF8F5", borderBottom:"1px solid #f1f5f9" },
  tableRow: { display:"flex", padding:"14px 20px", borderBottom:"1px solid #f8fafc", alignItems:"center" },
  thumb: { width:44, height:44, borderRadius:8, objectFit:"cover", flexShrink:0 },
  thumbFallback: { width:44, height:44, borderRadius:8, background:"#F0EBE5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  hotelName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:2 },
  hotelAddr: { fontSize:11, color:"#9FB3C8", lineHeight:1.3 },
  hotelRating: { fontSize:11, color:"#f59e0b", marginTop:2 },
  emailText: { fontSize:12, color:"#E85D3D", fontWeight:500, marginBottom:2, wordBreak:"break-all" },
  noEmailText: { fontSize:12, color:"#cbd5e1", marginBottom:2 },
  phoneText: { fontSize:11, color:"#4A6A8A", marginBottom:2 },
  websiteLink: { fontSize:11, color:"#E85D3D", textDecoration:"none" },
  statusBtn: { fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  contacted: { background:"#dcfce7", color:"#166534" },
  pending: { background:"#F0EBE5", color:"#4A6A8A" },
  contactedDate: { fontSize:10, color:"#9FB3C8", marginTop:4 },
  removeBtn: { background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:"48px 24px", color:"#9FB3C8", fontSize:14, textAlign:"center" },
  loadingSpinner: { width:24, height:24, border:"2.5px solid #e2e8f0", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"#fff", borderRadius:16, padding:"28px", maxWidth:400, width:"100%" },
  igHandle: { fontSize:12, color:"#C13584", fontWeight:600, textDecoration:"none" },
  igDmBtn: { display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#C13584", background:"#FDF0F8", border:"1px solid #e8b4d8", borderRadius:6, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" },
  igWarning: { display:"flex", alignItems:"flex-start", gap:8, background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"10px 12px", marginBottom:16, fontSize:12, color:"#92400e", lineHeight:1.5 },
  igLabel: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  igSelect: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", background:"#fff", cursor:"pointer", marginBottom:0 },
  igTextarea: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", resize:"vertical", lineHeight:1.7 },
  igNote: { fontSize:12, color:"#9FB3C8", lineHeight:1.6, marginBottom:16, fontStyle:"italic" },
  igSendBtn: { display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg, #C13584, #E85D3D)", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  noteInput: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:8, padding:"7px 10px", fontSize:12, fontFamily:"inherit", color:"#1E3A5F", outline:"none", resize:"none", lineHeight:1.5 },
  noteSaveBtn: { fontSize:11, fontWeight:700, color:"#fff", background:"#0F2544", border:"none", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" },
  noteCancelBtn: { fontSize:11, color:"#9FB3C8", background:"none", border:"1px solid #DDD5CC", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:"inherit" },
  noteDisplay: { cursor:"pointer", padding:"6px 8px", borderRadius:8, border:"1px dashed #DDD5CC", minHeight:32, transition:"border-color 0.15s" },
  noteText: { fontSize:12, color:"#1E3A5F", lineHeight:1.5 },
  notePlaceholder: { fontSize:12, color:"#CBD5E1" },
  deleteBtn: { background:"#ef4444", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
};
