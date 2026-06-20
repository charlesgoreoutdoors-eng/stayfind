"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useGmail } from "../../lib/useGmail";
import Link from "next/link";

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";

function ComposeInner() {
  const searchParams = useSearchParams();
  const listId = searchParams.get("list");

  const [lists, setLists]                   = useState([]);
  const [selectedListId, setSelectedListId] = useState(listId || "");
  const [hotels, setHotels]                 = useState([]);
  const [templates, setTemplates]           = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [sendMode, setSendMode]             = useState("email"); // "email" | "sequence"
  const [sequences, setSequences]           = useState([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState("");
  const [launching, setLaunching]           = useState(false);
  const [launched, setLaunched]             = useState(false);
  const [portfolios, setPortfolios]             = useState([]);
  const [attachedPortfolios, setAttachedPortfolios] = useState([]);
  const [showPortfolioPicker, setShowPortfolioPicker] = useState(false);
  const [subject, setSubject]               = useState("Content Collaboration Opportunity");
  const [body, setBody]                     = useState("");
  const [loading, setLoading]               = useState(false);
  const [sending, setSending]               = useState(false);
  const [sentIds, setSentIds]               = useState([]);
  const [results, setResults]               = useState([]);
  const [previewHotel, setPreviewHotel]     = useState(null);
  const [tab, setTab]                       = useState("compose");
  const { user } = useAuth();
  const { gmailToken, gmailEmail } = useGmail();

  useEffect(() => { fetchLists(); fetchTemplates(); fetchSequences(); }, []);
  useEffect(() => { if (selectedListId) fetchHotels(selectedListId); else setHotels([]); }, [selectedListId]);
  useEffect(() => { if (selectedTemplateId) { const t = templates.find(t => t.id === selectedTemplateId); if (t) { setSubject(t.subject); setBody(t.body); } } }, [selectedTemplateId, templates]);
  useEffect(() => { if (hotels.length > 0 && !previewHotel) setPreviewHotel(hotels[0]); }, [hotels]);

  const fetchLists = async () => {
    if (!user) return;
    const { data } = await supabase.from("lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLists(data || []);
  };
  const fetchPortfolios = async () => {
    if (!user) return;
    const { data } = await supabase.from("portfolios").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setPortfolios(data || []);
  };

  const fetchTemplates = async () => {
    if (!user) return;
    const { data } = await supabase.from("templates").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTemplates(data || []);
  };

  const fetchSequences = async () => {
    if (!user) return;
    const { data } = await supabase.from("sequences").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setSequences(data || []);
  };

  const launchSequence = async () => {
    if (!gmailToken) { alert("Connect your Gmail account on the Messages page first."); return; }
    if (!selectedSequenceId) { alert("Select a sequence first."); return; }
    const toSend = hotels.filter(h => h.email);
    if (toSend.length === 0) { alert("No hotels with email addresses in this list."); return; }
    setLaunching(true);
    try {
      const res = await fetch("/api/launch-sequence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sequenceId: selectedSequenceId, hotels: toSend, userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Launch failed");
      setLaunched(true);
      setTimeout(() => setLaunched(false), 4000);
    } catch (e) {
      alert("Could not launch sequence: " + e.message);
    }
    setLaunching(false);
  };
  const fetchHotels = async (id) => {
    setLoading(true);
    const { data } = await supabase.from("list_hotels").select("*").eq("list_id", id).order("created_at", { ascending: false });
    setHotels(data || []);
    setPreviewHotel(null);
    setLoading(false);
  };



  const buildBody = (hotel) => body.replace(/\{hotel_name\}/g, hotel.name);

  const sendAll = async () => {
    if (!gmailToken) { alert("Connect your Gmail account first."); return; }
    if (!body.trim()) { alert("Write a message first."); return; }
    const toSend = hotels.filter(h => h.email && !sentIds.includes(h.id));
    if (toSend.length === 0) { alert("No hotels with emails to send to."); return; }
    setSending(true);
    const newResults = [];
    for (const hotel of toSend) {
      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
              accessToken: gmailToken,
              to: hotel.email,
              subject,
              body: buildBody(hotel) + (attachedPortfolios.length > 0
                ? "\n\n---\nAttached portfolios:\n" + attachedPortfolios.map(p => `${p.name}: ${p.file_url}`).join("\n")
                : ""),
              fromName: gmailEmail || "Me"
            }),
        });
        const data = await res.json();
        if (data.success) {
          setSentIds(prev => [...prev, hotel.id]);
          newResults.push({ hotel, success: true });
          await supabase.from("list_hotels").update({ contacted: true, contacted_at: new Date().toISOString() }).eq("id", hotel.id);
        } else {
          newResults.push({ hotel, success: false, error: data.error });
        }
      } catch (e) {
        newResults.push({ hotel, success: false, error: e.message });
      }
      await new Promise(r => setTimeout(r, 400));
    }
    setResults(prev => [...prev, ...newResults]);
    setSending(false);
    setTab("preview");
  };

  const hotelsWithEmail = hotels.filter(h => h.email);
  const allSent = hotelsWithEmail.length > 0 && hotelsWithEmail.every(h => sentIds.includes(h.id));
  const unsent = hotelsWithEmail.filter(h => !sentIds.includes(h.id)).length;

  return (
    <div style={s.root}>
      {/* Page header */}
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.title}>Compose Outreach</h1>
          <p style={s.subtitle}>{sendMode === "email" ? "Write one email — send it to your whole list" : "Send an automated sequence to your whole list"}</p>
        </div>
        <div style={s.modeToggle}>
          <button style={{ ...s.modeBtn, ...(sendMode === "email" ? s.modeBtnActive : {}) }} onClick={() => setSendMode("email")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            One Email
          </button>
          <button style={{ ...s.modeBtn, ...(sendMode === "sequence" ? s.modeBtnActive : {}) }} onClick={() => setSendMode("sequence")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Sequence
          </button>
        </div>
      </div>

      {/* Setup row: list + template selectors */}
      <div style={s.setupRow}>
        <div style={s.setupField}>
          <label style={s.label}>List</label>
          <select style={s.select} value={selectedListId} onChange={e => setSelectedListId(e.target.value)}>
            <option value="">Choose a list...</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        {sendMode === "email" && (
          <div style={s.setupField}>
            <label style={s.label}>Template (optional)</label>
            <select style={s.select} value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
              <option value="">Write from scratch...</option>
              {templates.filter(t => !t.type || t.type === "email").map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}
        {sendMode === "sequence" && (
          <div style={s.setupField}>
            <label style={s.label}>Sequence</label>
            <select style={s.select} value={selectedSequenceId} onChange={e => setSelectedSequenceId(e.target.value)}>
              <option value="">Choose a sequence...</option>
              {sequences.map(seq => <option key={seq.id} value={seq.id}>{seq.name}</option>)}
            </select>
          </div>
        )}
        {selectedListId && (
          <div style={s.hotelCount}>
            <span style={s.hotelCountNum}>{hotels.length}</span>
            <span style={s.hotelCountLabel}>hotels{hotelsWithEmail.length < hotels.length ? ` - ${hotelsWithEmail.length} with email` : ""}</span>
          </div>
        )}
      </div>

      {/* Mobile tabs */}
      <div style={s.mobileTabs}>
        {["compose","hotels","preview"].map(t => (
          <button key={t} style={{ ...s.mobileTab, ...(tab===t ? s.mobileTabActive : {}) }} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "hotels" && hotels.length > 0 && <span style={s.tabBadge}>{hotels.length}</span>}
            {t === "preview" && results.length > 0 && <span style={{ ...s.tabBadge, background:"#22c55e" }}>{results.filter(r=>r.success).length}</span>}
          </button>
        ))}
      </div>

      {/* Main layout */}
      <div style={s.layout}>
        {/* Left: compose / sequence launch */}
        <div style={{ ...s.composeCol, display: tab === "compose" || typeof window !== "undefined" && window.innerWidth >= 900 ? "flex" : "none" }} className="compose-col">
          <div style={s.card}>
          {sendMode === "sequence" ? (
            <div>
              <p style={s.panelLabel}>Launch Sequence</p>
              {sequences.length === 0 ? (
                <div style={s.emptyPanel}>
                  <span style={{ fontSize:28 }}>📋</span>
                  <p>No sequences yet.</p>
                  <a href="/sequences/builder" style={s.emptyLink}>Build a sequence</a>
                </div>
              ) : !selectedSequenceId ? (
                <p style={{ fontSize:13, color:"#9FB3C8", marginTop:8 }}>Select a sequence and list above to get started.</p>
              ) : !selectedListId ? (
                <p style={{ fontSize:13, color:"#9FB3C8", marginTop:8 }}>Select a list above to send this sequence to.</p>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:8 }}>
                  <div style={s.seqSummary}>
                    <p style={s.seqSummaryTitle}>{sequences.find(s => s.id === selectedSequenceId)?.name}</p>
                    <p style={s.seqSummaryMeta}>Will be sent to <strong>{hotels.filter(h => h.email).length}</strong> hotels with email addresses in this list.</p>
                    {hotels.filter(h => !h.email).length > 0 && (
                      <p style={{ fontSize:12, color:"#f59e0b", marginTop:4 }}>{hotels.filter(h => !h.email).length} hotels without email will be skipped.</p>
                    )}
                  </div>
                  {launched && (
                    <div style={s.launchSuccess}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#166534" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Sequence queued! Emails will be spaced out and sent throughout the day.
                    </div>
                  )}
                  <button
                    style={{ ...s.sendBtn, opacity: launching || !gmailToken || !selectedSequenceId || hotels.filter(h => h.email).length === 0 ? 0.45 : 1 }}
                    onClick={launchSequence}
                    disabled={launching || !gmailToken || !selectedSequenceId || hotels.filter(h => h.email).length === 0}
                  >
                    {launching ? "Launching..." : `Launch Sequence for ${hotels.filter(h => h.email).length} Hotels`}
                  </button>
                  {!gmailToken && <p style={s.warning}>Connect Gmail on the Messages page first</p>}
                </div>
              )}
            </div>
          ) : (
            <>
            <div style={s.field}>
              <label style={s.label}>Subject Line</label>
              <input style={s.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Content Collaboration Opportunity" />
            </div>
            <div style={s.field}>
              <label style={s.label}>Message</label>
              <p style={s.hint}>Use <code style={s.code}>{"{hotel_name}"}</code> to auto-fill each hotel name</p>
              <textarea
                style={s.textarea}
                rows={18}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Hi {hotel_name} team, write your message here..."
              />
              <p style={s.charCount}>{body.length} characters</p>
            </div>
            <button
              style={{ ...s.sendBtn, opacity: sending || !gmailToken || !body.trim() || hotelsWithEmail.length === 0 ? 0.45 : 1 }}
              onClick={sendAll}
              disabled={sending || !gmailToken || !body.trim() || hotelsWithEmail.length === 0}
            >
              {sending
                ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={s.spinner} />Sending to {hotelsWithEmail.length} hotels...</span>
                : allSent ? "All Sent!" : `Send to ${unsent} Hotel${unsent !== 1 ? "s" : ""}`}
            </button>
            {!gmailToken && <p style={s.warning}>Connect Gmail above to send</p>}

            {/* Portfolio attachment */}
            <div style={{ marginTop:16, borderTop:"1px solid #F0EBE5", paddingTop:16 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
                <label style={s.label}>Attach Portfolio</label>
                <button style={sp.attachBtn} onClick={() => setShowPortfolioPicker(v => !v)}>
                  + Attach
                </button>
              </div>

              {attachedPortfolios.length > 0 && (
                <div style={sp.attachedList}>
                  {attachedPortfolios.map(p => (
                    <div key={p.id} style={sp.attachedItem}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span style={sp.attachedName}>{p.name}</span>
                      <button style={sp.removeAttach} onClick={() => setAttachedPortfolios(prev => prev.filter(a => a.id !== p.id))}>x</button>
                    </div>
                  ))}
                </div>
              )}

              {showPortfolioPicker && (
                <div style={sp.picker}>
                  {portfolios.length === 0 ? (
                    <p style={sp.pickerEmpty}>No portfolios yet. Upload one in the Portfolio section.</p>
                  ) : (
                    portfolios.map(p => {
                      const attached = attachedPortfolios.some(a => a.id === p.id);
                      return (
                        <div key={p.id} style={sp.pickerItem} onClick={() => {
                          if (attached) setAttachedPortfolios(prev => prev.filter(a => a.id !== p.id));
                          else setAttachedPortfolios(prev => [...prev, p]);
                        }}>
                          <div style={{ ...sp.pickerCheck, background: attached ? "#E85D3D" : "#fff", border: attached ? "none" : "1.5px solid #DDD5CC" }}>
                            {attached && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                          </div>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span style={sp.pickerName}>{p.name}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
            {!selectedListId && <p style={s.warning}>Select a list above to get started</p>}
            </>
          )}
          </div>
        </div>

        {/* Right: hotels + preview */}
        <div style={{ ...s.rightCol }} className="right-col">
          {/* Hotels */}
          <div style={{ ...s.card, display: tab === "hotels" || tab === "compose" || typeof window !== "undefined" && window.innerWidth >= 900 ? "block" : "none" }} className="hotels-panel">
            <p style={s.panelLabel}>
              {selectedListId ? `Hotels in list (${hotels.length})` : "Select a list to see hotels"}
            </p>
            {loading ? (
              <p style={s.loadingText}>Loading hotels...</p>
            ) : hotels.length === 0 && selectedListId ? (
              <div style={s.emptyPanel}>
                <span style={{ fontSize:28 }}>🏨</span>
                <p>No hotels in this list yet.</p>
                <Link href="/search" style={s.emptyLink}>Go to Search</Link>
              </div>
            ) : (
              <div style={s.hotelList}>
                {hotels.map(hotel => (
                  <div key={hotel.id}
                    style={{ ...s.hotelRow, borderColor: previewHotel?.id === hotel.id ? "#E85D3D" : "#F0EBE5", background: previewHotel?.id === hotel.id ? "#FEF0EC" : "#fff" }}
                    onClick={() => { setPreviewHotel(hotel); setTab("preview"); }}
                  >
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={s.hotelName}>{hotel.name}</p>
                      {hotel.email
                        ? <p style={s.hotelEmail}>✉ {hotel.email}</p>
                        : <p style={s.noEmail}>No email — will be skipped</p>}
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, flexShrink:0 }}>
                      {sentIds.includes(hotel.id) && <span style={s.sentBadge}>Sent</span>}
                      {!hotel.email && <span style={s.skipBadge}>Skip</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email preview */}
          {previewHotel && body && (
            <div style={{ ...s.card, display: tab === "preview" || tab === "compose" ? "block" : "none" }} className="preview-panel">
              <p style={s.panelLabel}>Preview — {previewHotel.name}</p>
              <div style={s.previewBox}>
                <div style={s.previewField}><span style={s.previewLabel}>To:</span><span style={s.previewValue}>{previewHotel.email || "No email"}</span></div>
                <div style={s.previewField}><span style={s.previewLabel}>Subject:</span><span style={s.previewValue}>{subject}</span></div>
                <div style={s.previewDivider} />
                <pre style={s.previewBody}>{buildBody(previewHotel)}</pre>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={s.card}>
              <p style={s.panelLabel}>Send Results</p>
              <div style={{ display:"flex", gap:16, marginBottom:12 }}>
                <span style={s.resultStat}><strong style={{ color:"#22c55e" }}>{results.filter(r=>r.success).length}</strong> sent</span>
                <span style={s.resultStat}><strong style={{ color:"#ef4444" }}>{results.filter(r=>!r.success).length}</strong> failed</span>
              </div>
              {results.map((r, i) => (
                <div key={i} style={s.resultRow}>
                  <span style={r.success ? s.resultSuccess : s.resultFail}>{r.success ? "Sent" : "Failed"}</span>
                  <span style={s.resultName}>{r.hotel.name}</span>
                  {!r.success && <span style={s.resultError}>{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .compose-col { display: flex !important; }
          .right-col { display: flex !important; flex-direction: column; gap: 16px; }
          .hotels-panel { display: block !important; }
          .preview-panel { display: block !important; }
        }
        .hotel-row-item:hover { background: #f8fafc !important; }
      `}</style>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div style={{ padding:40, color:"#9FB3C8", textAlign:"center" }}>Loading...</div>}>
      <ComposeInner />
    </Suspense>
  );
}

const s = {
  root: { padding:"28px 20px 80px", maxWidth:1100, margin:"0 auto" },
  pageHeader: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:24, gap:12, flexWrap:"wrap" },
  title: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:26, fontWeight:700, color:"#0F2544", marginBottom:4 },
  subtitle: { fontSize:14, color:"#9FB3C8" },
  gmailBtn: { display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", color:"#0F2544", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", flexShrink:0 },
  gmailConnected: { display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:"8px 14px" },
  gmailDot: { width:8, height:8, borderRadius:"50%", background:"#22c55e" },
  gmailText: { fontSize:13, color:"#166534", fontWeight:500 },
  disconnectBtn: { fontSize:11, color:"#16a34a", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" },
  modeToggle: { display:"flex", gap:4, background:"#F0EBE5", borderRadius:10, padding:4 },
  modeBtn: { display:"flex", alignItems:"center", gap:6, padding:"8px 14px", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit", color:"#4A6A8A", background:"transparent" },
  modeBtnActive: { background:"#fff", color:"#0F2544", fontWeight:600, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  seqSummary: { background:"#F8FAFC", borderRadius:10, padding:"14px 16px", border:"1px solid #e2e8f0" },
  seqSummaryTitle: { fontSize:15, fontWeight:700, color:"#0F2544", marginBottom:6 },
  seqSummaryMeta: { fontSize:13, color:"#4A6A8A", lineHeight:1.5 },
  launchSuccess: { display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:"12px 16px", fontSize:13, fontWeight:500, color:"#166534" },
  setupRow: { display:"flex", gap:12, marginBottom:20, flexWrap:"wrap", alignItems:"flex-end", width:"100%" },
  setupField: { display:"flex", flexDirection:"column", gap:6, flex:1, minWidth:"min(200px, 100%)" },
  label: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase" },
  select: { border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none", background:"#fff", cursor:"pointer" },
  hotelCount: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#FEF0EC", borderRadius:10, padding:"10px 18px", border:"1.5px solid #c7d2fe" },
  hotelCountNum: { fontSize:22, fontWeight:700, color:"#E85D3D", lineHeight:1 },
  hotelCountLabel: { fontSize:11, color:"#F5A882", marginTop:2 },
  mobileTabs: { display:"flex", background:"#F0EBE5", borderRadius:12, padding:4, gap:4, marginBottom:16 },
  mobileTab: { flex:1, padding:"9px 4px", border:"none", borderRadius:9, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#4A6A8A", background:"transparent", display:"flex", alignItems:"center", justifyContent:"center", gap:6 },
  mobileTabActive: { background:"#fff", color:"#0F2544", boxShadow:"0 1px 4px rgba(0,0,0,0.1)", fontWeight:600 },
  tabBadge: { background:"#E85D3D", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:20, minWidth:18, textAlign:"center" },
  layout: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, alignItems:"start" },
  composeCol: { display:"flex", flexDirection:"column" },
  rightCol: { display:"flex", flexDirection:"column", gap:16 },
  card: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", padding:"20px" },
  field: { marginBottom:18 },
  hint: { fontSize:12, color:"#9FB3C8", marginBottom:8 },
  code: { background:"#F0EBE5", padding:"1px 6px", borderRadius:4, fontSize:11, fontFamily:"monospace" },
  input: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none" },
  textarea: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none", resize:"vertical", lineHeight:1.8 },
  charCount: { fontSize:11, color:"#cbd5e1", marginTop:4, textAlign:"right" },
  sendBtn: { width:"100%", padding:14, background:"#E85D3D", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", transition:"opacity 0.2s" },
  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  warning: { fontSize:12, color:"#f59e0b", textAlign:"center", marginTop:10 },
  panelLabel: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:12 },
  loadingText: { fontSize:13, color:"#9FB3C8", textAlign:"center", padding:"20px 0" },
  emptyPanel: { display:"flex", flexDirection:"column", alignItems:"center", gap:8, padding:"32px 0", color:"#9FB3C8", fontSize:13, textAlign:"center" },
  emptyLink: { color:"#E85D3D", fontWeight:600, fontSize:13, textDecoration:"none" },
  hotelList: { display:"flex", flexDirection:"column", gap:6, maxHeight:320, overflowY:"auto" },
  hotelRow: { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"1.5px solid #f1f5f9", cursor:"pointer", transition:"all 0.15s" },
  hotelName: { fontSize:13, fontWeight:600, color:"#0F2544", marginBottom:2 },
  hotelEmail: { fontSize:11, color:"#E85D3D" },
  noEmail: { fontSize:11, color:"#cbd5e1" },
  sentBadge: { background:"#dcfce7", color:"#166534", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20 },
  skipBadge: { background:"#fef3c7", color:"#92400e", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20 },
  previewBox: { background:"#FAF8F5", borderRadius:10, padding:"14px", border:"1px solid #e2e8f0" },
  previewField: { fontSize:13, marginBottom:6, display:"flex", gap:8, alignItems:"flex-start" },
  previewLabel: { fontWeight:600, color:"#1E3A5F", minWidth:58, flexShrink:0 },
  previewValue: { color:"#4A6A8A", wordBreak:"break-all" },
  previewDivider: { borderTop:"1px solid #e2e8f0", margin:"12px 0" },
  previewBody: { fontSize:13, color:"#1E3A5F", lineHeight:1.8, whiteSpace:"pre-wrap", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", margin:0 },
  resultStat: { fontSize:13, color:"#4A6A8A" },
  resultRow: { display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #f8fafc", fontSize:13 },
  resultSuccess: { background:"#dcfce7", color:"#166534", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0 },
  resultFail: { background:"#fee2e2", color:"#991b1b", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0 },
  resultName: { color:"#0F2544", fontWeight:500, flex:1 },
  resultError: { fontSize:11, color:"#ef4444" },
};

const sp = {
  attachBtn: { fontSize:12, fontWeight:600, color:"#E85D3D", background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:7, padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" },
  attachedList: { display:"flex", flexDirection:"column", gap:6, marginBottom:8 },
  attachedItem: { display:"flex", alignItems:"center", gap:7, padding:"7px 10px", background:"#FEF0EC", borderRadius:8, border:"1px solid #F5A882" },
  attachedName: { flex:1, fontSize:12, color:"#B83A22", fontWeight:500 },
  removeAttach: { background:"none", border:"none", cursor:"pointer", color:"#F5A882", fontSize:13, fontWeight:700, lineHeight:1 },
  picker: { background:"#fff", border:"1px solid #DDD5CC", borderRadius:10, overflow:"hidden", marginTop:4 },
  pickerEmpty: { fontSize:12, color:"#9FB3C8", padding:"14px", textAlign:"center" },
  pickerItem: { display:"flex", alignItems:"center", gap:10, padding:"11px 14px", cursor:"pointer", borderBottom:"1px solid #F7F3EF", transition:"background 0.1s" },
  pickerCheck: { width:20, height:20, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  pickerName: { fontSize:13, color:"#1E3A5F", fontWeight:500 },
};
