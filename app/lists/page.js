"use client";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";

export default function ListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeList, setActiveList] = useState(null);
  const [listHotels, setListHotels] = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("lists")
      .select("*, list_hotels(count)")
      .order("created_at", { ascending: false });
    setLists(data || []);
    setLoading(false);
  };

  const createList = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data } = await supabase
      .from("lists")
      .insert({ name: newName.trim(), description: newDesc.trim() || null })
      .select()
      .single();
    if (data) {
      setLists(prev => [{ ...data, list_hotels: [{ count: 0 }] }, ...prev]);
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
      contacted_at: updated ? new Date().toISOString() : null
    }).eq("id", hotel.id);
    setListHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, contacted: updated } : h));
  };

  const removeHotel = async (hotelId) => {
    await supabase.from("list_hotels").delete().eq("id", hotelId);
    setListHotels(prev => prev.filter(h => h.id !== hotelId));
    setLists(prev => prev.map(l => l.id === activeList.id
      ? { ...l, list_hotels: [{ count: Math.max(0, (l.list_hotels?.[0]?.count || 1) - 1) }] }
      : l
    ));
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>My Lists</h1>
          <p style={s.subtitle}>Organise hotels into lists for each trip or campaign</p>
        </div>
        <button style={s.newBtn} onClick={() => setShowNew(v => !v)}>
          + New List
        </button>
      </div>

      {/* New list form */}
      {showNew && (
        <div style={s.newForm}>
          <input style={s.input} placeholder="List name e.g. Malibu Summer 2025"
            value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createList()} autoFocus />
          <input style={s.input} placeholder="Description (optional)"
            value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          <div style={{ display:"flex", gap:8 }}>
            <button style={s.saveBtn} onClick={createList} disabled={saving || !newName.trim()}>
              {saving ? "Creating..." : "Create List"}
            </button>
            <button style={s.cancelBtn} onClick={() => setShowNew(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={s.body}>
        {/* Lists panel */}
        <div style={s.listsPanel}>
          {loading ? (
            <div style={s.empty}>Loading...</div>
          ) : lists.length === 0 ? (
            <div style={s.empty}>
              <span style={{ fontSize:36 }}>📋</span>
              <p>No lists yet. Create one to start organising hotels.</p>
            </div>
          ) : (
            lists.map(list => (
              <div key={list.id}
                style={{ ...s.listItem, background: activeList?.id === list.id ? "#eef2ff" : "#fff", borderColor: activeList?.id === list.id ? "#6366f1" : "#e2e8f0" }}
                onClick={() => openList(list)}
              >
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={s.listName}>{list.name}</p>
                  {list.description && <p style={s.listDesc}>{list.description}</p>}
                  <p style={s.listMeta}>{list.list_hotels?.[0]?.count || 0} hotels</p>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                  <Link href={`/compose?list=${list.id}`}>
                    <button style={s.composeBtn} title="Compose emails for this list">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                    </button>
                  </Link>
                  <button style={s.deleteBtn} onClick={() => setDeleteConfirm(list.id)} title="Delete list">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Hotels table */}
        <div style={s.hotelsPanel}>
          {!activeList ? (
            <div style={s.empty}>
              <span style={{ fontSize:36 }}>👈</span>
              <p>Select a list to see its hotels</p>
            </div>
          ) : (
            <>
              <div style={s.hotelsPanelHeader}>
                <div>
                  <h2 style={s.panelTitle}>{activeList.name}</h2>
                  <p style={s.panelSub}>{listHotels.length} hotels</p>
                </div>
                <Link href={`/compose?list=${activeList.id}`}>
                  <button style={s.composeBtnLg}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Compose Emails
                  </button>
                </Link>
              </div>

              {hotelsLoading ? (
                <div style={s.empty}>Loading hotels...</div>
              ) : listHotels.length === 0 ? (
                <div style={s.empty}>
                  <span style={{ fontSize:36 }}>🏨</span>
                  <p>No hotels in this list yet.<br />Add hotels from the Search page.</p>
                </div>
              ) : (
                <div style={s.table}>
                  <div style={s.tableHeader}>
                    <div style={{ ...s.th, flex:3 }}>Hotel</div>
                    <div style={{ ...s.th, flex:2 }}>Contact</div>
                    <div style={{ ...s.th, flex:1 }}>Status</div>
                    <div style={{ ...s.th, width:60 }}></div>
                  </div>
                  {listHotels.map(hotel => (
                    <div key={hotel.id} style={s.tableRow} className="fade-up">
                      <div style={{ ...s.td, flex:3 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          {hotel.photo_url ? (
                            <img src={hotel.photo_url} alt={hotel.name} style={s.hotelThumb} onError={e => e.target.style.display="none"} />
                          ) : (
                            <div style={s.hotelThumbFallback}>🏨</div>
                          )}
                          <div>
                            <p style={s.hotelName}>{hotel.name}</p>
                            <p style={s.hotelAddr}>{hotel.address}</p>
                            {hotel.rating && <p style={s.hotelRating}>{"★".repeat(Math.round(hotel.rating))} {hotel.rating}</p>}
                          </div>
                        </div>
                      </div>
                      <div style={{ ...s.td, flex:2 }}>
                        {hotel.email ? (
                          <p style={s.emailText}>✉ {hotel.email}</p>
                        ) : (
                          <p style={s.noEmail}>No email found</p>
                        )}
                        {hotel.phone && <p style={s.phoneText}>{hotel.phone}</p>}
                        {hotel.website && (
                          <a href={hotel.website} target="_blank" rel="noreferrer" style={s.websiteLink}>Visit website</a>
                        )}
                      </div>
                      <div style={{ ...s.td, flex:1 }}>
                        <button
                          style={{ ...s.statusBtn, ...(hotel.contacted ? s.statusContacted : s.statusPending) }}
                          onClick={() => toggleContacted(hotel)}
                        >
                          {hotel.contacted ? "Contacted" : "Pending"}
                        </button>
                        {hotel.contacted_at && (
                          <p style={s.contactedDate}>{new Date(hotel.contacted_at).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div style={{ ...s.td, width:60, justifyContent:"center" }}>
                        <button style={s.removeBtn} onClick={() => removeHotel(hotel.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
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

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.confirmModal}>
            <h3 style={{ fontFamily:"Georgia,serif", fontSize:18, marginBottom:8 }}>Delete this list?</h3>
            <p style={{ fontSize:14, color:"#64748b", marginBottom:20 }}>All hotels in this list will also be removed. This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.deleteConfirmBtn} onClick={() => deleteList(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { padding:"32px 24px 80px", maxWidth:1100, margin:"0 auto" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 },
  title: { fontFamily:"Georgia,serif", fontSize:28, fontWeight:700, color:"#0f0e17", marginBottom:4 },
  subtitle: { fontSize:14, color:"#94a3b8" },
  newBtn: { background:"#0f0e17", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  newForm: { background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:14, padding:"20px", marginBottom:24, display:"flex", flexDirection:"column", gap:10, maxWidth:480 },
  input: { border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none" },
  saveBtn: { background:"#6366f1", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  cancelBtn: { background:"#fff", color:"#64748b", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"10px 20px", fontSize:14, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  body: { display:"grid", gridTemplateColumns:"280px 1fr", gap:20, alignItems:"start" },
  listsPanel: { display:"flex", flexDirection:"column", gap:8 },
  listItem: { padding:"14px 14px", borderRadius:12, border:"1.5px solid #e2e8f0", cursor:"pointer", transition:"all 0.15s", display:"flex", alignItems:"center", gap:10 },
  listName: { fontSize:14, fontWeight:600, color:"#1e293b", marginBottom:2 },
  listDesc: { fontSize:12, color:"#94a3b8", marginBottom:3 },
  listMeta: { fontSize:11, color:"#cbd5e1" },
  composeBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#6366f1" },
  deleteBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid #fee2e2", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#ef4444" },
  hotelsPanel: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", overflow:"hidden" },
  hotelsPanelHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 20px", borderBottom:"1px solid #f1f5f9" },
  panelTitle: { fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:"#0f0e17" },
  panelSub: { fontSize:13, color:"#94a3b8", marginTop:2 },
  composeBtnLg: { display:"flex", alignItems:"center", gap:8, background:"#6366f1", color:"#fff", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  table: { width:"100%" },
  tableHeader: { display:"flex", padding:"10px 20px", background:"#f8fafc", borderBottom:"1px solid #f1f5f9" },
  th: { fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"0.5px", textTransform:"uppercase" },
  tableRow: { display:"flex", padding:"14px 20px", borderBottom:"1px solid #f8fafc", alignItems:"center", transition:"background 0.1s" },
  td: { display:"flex", flexDirection:"column", justifyContent:"center", paddingRight:12 },
  hotelThumb: { width:44, height:44, borderRadius:8, objectFit:"cover", flexShrink:0 },
  hotelThumbFallback: { width:44, height:44, borderRadius:8, background:"#f1f5f9", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  hotelName: { fontSize:14, fontWeight:600, color:"#1e293b", marginBottom:2 },
  hotelAddr: { fontSize:11, color:"#94a3b8" },
  hotelRating: { fontSize:11, color:"#f59e0b", marginTop:2 },
  emailText: { fontSize:12, color:"#6366f1", fontWeight:500, marginBottom:2 },
  noEmail: { fontSize:12, color:"#cbd5e1", marginBottom:2 },
  phoneText: { fontSize:11, color:"#64748b", marginBottom:2 },
  websiteLink: { fontSize:11, color:"#6366f1", textDecoration:"none" },
  statusBtn: { fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"system-ui,sans-serif", width:"fit-content" },
  statusContacted: { background:"#dcfce7", color:"#166534" },
  statusPending: { background:"#f1f5f9", color:"#64748b" },
  contactedDate: { fontSize:10, color:"#94a3b8", marginTop:3 },
  removeBtn: { background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, padding:"60px 24px", color:"#94a3b8", fontSize:14, textAlign:"center" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  confirmModal: { background:"#fff", borderRadius:16, padding:"28px", maxWidth:380, width:"90%" },
  deleteConfirmBtn: { background:"#ef4444", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
};
