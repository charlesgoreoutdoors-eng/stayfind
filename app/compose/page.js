"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email";

function ComposeInner() {
  const searchParams = useSearchParams();
  const listId = searchParams.get("list");

  const [lists, setLists] = useState([]);
  const [selectedListId, setSelectedListId] = useState(listId || "");
  const [hotels, setHotels] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [subject, setSubject] = useState("Content Collaboration Opportunity");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [gmailToken, setGmailToken] = useState(null);
  const [gmailEmail, setGmailEmail] = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentIds, setSentIds] = useState([]);
  const [results, setResults] = useState([]);
  const [previewHotel, setPreviewHotel] = useState(null);

  useEffect(() => {
    fetchLists();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedListId) fetchHotels(selectedListId);
    else setHotels([]);
  }, [selectedListId]);

  useEffect(() => {
    if (selectedTemplateId) {
      const t = templates.find(t => t.id === selectedTemplateId);
      if (t) { setSubject(t.subject); setBody(t.body); }
    }
  }, [selectedTemplateId]);

  useEffect(() => {
    if (hotels.length > 0 && !previewHotel) setPreviewHotel(hotels[0]);
  }, [hotels]);

  const fetchLists = async () => {
    const { data } = await supabase.from("lists").select("*").order("created_at", { ascending: false });
    setLists(data || []);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
    setTemplates(data || []);
  };

  const fetchHotels = async (id) => {
    setLoading(true);
    const { data } = await supabase.from("list_hotels").select("*").eq("list_id", id).order("created_at", { ascending: false });
    setHotels(data || []);
    setLoading(false);
  };

  const connectGmail = () => {
    setGmailLoading(true);
    if (!GMAIL_CLIENT_ID) {
      alert("Gmail Client ID not configured.");
      setGmailLoading(false);
      return;
    }
    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === "gmail_token" && event.data.token) {
        setGmailToken(event.data.token);
        fetchProfile(event.data.token);
        setGmailLoading(false);
        window.removeEventListener("message", handleMessage);
      }
    };
    window.addEventListener("message", handleMessage);
    const redirectUri = window.location.origin + "/api/auth/gmail";
    const params = new URLSearchParams({ client_id: GMAIL_CLIENT_ID, redirect_uri: redirectUri, response_type: "token", scope: GMAIL_SCOPES, prompt: "select_account" });
    const popup = window.open("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(), "gmail-auth", "width=500,height=600,left=200,top=100");
    const check = setInterval(() => {
      if (!popup || popup.closed) { clearInterval(check); window.removeEventListener("message", handleMessage); setGmailLoading(false); }
    }, 1000);
  };

  const fetchProfile = async (token) => {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.email) setGmailEmail(data.email);
    } catch {}
  };

  const buildBody = (hotel) => body.replace(/\{hotel_name\}/g, hotel.name);

  const sendAll = async () => {
    if (!gmailToken) { alert("Connect your Gmail account first."); return; }
    if (!body.trim()) { alert("Write a message first."); return; }
    const toSend = hotels.filter(h => h.email && !sentIds.includes(h.id));
    if (toSend.length === 0) { alert("No hotels with email addresses to send to."); return; }
    setSending(true);
    const newResults = [];
    for (const hotel of toSend) {
      try {
        const res = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: gmailToken, to: hotel.email, subject, body: buildBody(hotel), fromName: gmailEmail || "Me" }),
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
  };

  const hotelsWithEmail = hotels.filter(h => h.email);
  const hotelsNoEmail = hotels.filter(h => !h.email);
  const allSent = hotelsWithEmail.length > 0 && hotelsWithEmail.every(h => sentIds.includes(h.id));

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Compose Outreach</h1>
          <p style={s.subtitle}>Write one email and send it to every hotel in your list</p>
        </div>
        {/* Gmail connect */}
        {!gmailToken ? (
          <button style={s.gmailBtn} onClick={connectGmail} disabled={gmailLoading}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
            {gmailLoading ? "Connecting..." : "Connect Gmail"}
          </button>
        ) : (
          <div style={s.gmailConnected}>
            <div style={s.gmailDot} />
            <span style={s.gmailText}>{gmailEmail}</span>
            <button style={s.disconnectBtn} onClick={() => { setGmailToken(null); setGmailEmail(null); }}>Disconnect</button>
          </div>
        )}
      </div>

      <div style={s.body}>
        {/* Left: compose */}
        <div style={s.composePanel}>
          {/* List selector */}
          <div style={s.field}>
            <label style={s.label}>Select List</label>
            <select style={s.select} value={selectedListId} onChange={e => setSelectedListId(e.target.value)}>
              <option value="">Choose a list...</option>
              {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Template selector */}
          <div style={s.field}>
            <label style={s.label}>Load Template (optional)</label>
            <select style={s.select} value={selectedTemplateId} onChange={e => setSelectedTemplateId(e.target.value)}>
              <option value="">Write from scratch...</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div style={s.field}>
            <label style={s.label}>Subject</label>
            <input style={s.input} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" />
          </div>

          {/* Body */}
          <div style={s.field}>
            <label style={s.label}>Message</label>
            <p style={s.hint}>Use <code style={s.code}>{"{hotel_name}"}</code> to auto-fill each hotel's name</p>
            <textarea
              style={s.textarea}
              rows={16}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={"Hi {hotel_name} team,\n\nMy name is [Your Name] and I'm a content creator...\n\nI'd love to explore a collaboration.\n\nWarm regards,\n[Your Name]"}
            />
          </div>

          {/* Send button */}
          <button
            style={{ ...s.sendBtn, opacity: sending || !gmailToken || !body.trim() || hotelsWithEmail.length === 0 ? 0.5 : 1 }}
            onClick={sendAll}
            disabled={sending || !gmailToken || !body.trim() || hotelsWithEmail.length === 0}
          >
            {sending ? (
              <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
                <span style={s.spinner} />Sending...
              </span>
            ) : allSent ? "All Sent!" : `Send to ${hotelsWithEmail.length - sentIds.length} Hotels`}
          </button>

          {!gmailToken && <p style={s.gmailWarning}>Connect Gmail above to send emails</p>}
        </div>

        {/* Right: hotel list + preview */}
        <div style={s.rightPanel}>
          {/* Hotel list */}
          <div style={s.hotelListBox}>
            <p style={s.sectionLabel}>
              {selectedListId
                ? `${hotels.length} hotels in list${hotelsNoEmail.length > 0 ? ` · ${hotelsNoEmail.length} missing email` : ""}`
                : "Select a list to see hotels"}
            </p>
            {loading ? (
              <p style={s.loadingText}>Loading hotels...</p>
            ) : (
              hotels.map(hotel => (
                <div key={hotel.id}
                  style={{ ...s.hotelRow, borderColor: previewHotel?.id === hotel.id ? "#6366f1" : "#f1f5f9", background: previewHotel?.id === hotel.id ? "#eef2ff" : "#fff" }}
                  onClick={() => setPreviewHotel(hotel)}
                >
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={s.hotelName}>{hotel.name}</p>
                    {hotel.email
                      ? <p style={s.hotelEmail}>✉ {hotel.email}</p>
                      : <p style={s.noEmail}>No email — will be skipped</p>}
                  </div>
                  {sentIds.includes(hotel.id) && <span style={s.sentBadge}>Sent</span>}
                  {!hotel.email && <span style={s.skipBadge}>Skip</span>}
                </div>
              ))
            )}
          </div>

          {/* Email preview */}
          {previewHotel && body && (
            <div style={s.previewBox}>
              <p style={s.sectionLabel}>Preview — {previewHotel.name}</p>
              <div style={s.previewInner}>
                <div style={s.previewField}><span style={s.previewLabel}>To:</span><span>{previewHotel.email || "No email"}</span></div>
                <div style={s.previewField}><span style={s.previewLabel}>Subject:</span><span>{subject}</span></div>
                <div style={s.previewDivider} />
                <pre style={s.previewBody}>{buildBody(previewHotel)}</pre>
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div style={s.resultsBox}>
              <p style={s.sectionLabel}>Send Results</p>
              {results.map((r, i) => (
                <div key={i} style={s.resultRow}>
                  <span style={r.success ? s.resultSuccess : s.resultFail}>
                    {r.success ? "Sent" : "Failed"}
                  </span>
                  <span style={s.resultName}>{r.hotel.name}</span>
                  {!r.success && <span style={s.resultError}>{r.error}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div style={{ padding:40, color:"#94a3b8" }}>Loading...</div>}>
      <ComposeInner />
    </Suspense>
  );
}

const s = {
  root: { padding:"32px 24px 80px", maxWidth:1200, margin:"0 auto" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28, flexWrap:"wrap", gap:12 },
  title: { fontFamily:"Georgia,serif", fontSize:28, fontWeight:700, color:"#0f0e17", marginBottom:4 },
  subtitle: { fontSize:14, color:"#94a3b8" },
  gmailBtn: { display:"flex", alignItems:"center", gap:8, padding:"10px 18px", background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", color:"#1e293b", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" },
  gmailConnected: { display:"flex", alignItems:"center", gap:8, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:"8px 14px" },
  gmailDot: { width:8, height:8, borderRadius:"50%", background:"#22c55e" },
  gmailText: { fontSize:13, color:"#166534", fontWeight:500 },
  disconnectBtn: { fontSize:11, color:"#16a34a", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" },
  body: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start" },
  composePanel: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", padding:"24px", display:"flex", flexDirection:"column", gap:4 },
  rightPanel: { display:"flex", flexDirection:"column", gap:16 },
  field: { marginBottom:16 },
  label: { display:"block", fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  hint: { fontSize:12, color:"#94a3b8", marginBottom:6 },
  code: { background:"#f1f5f9", padding:"1px 6px", borderRadius:4, fontSize:11, fontFamily:"monospace" },
  select: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none", background:"#fff", cursor:"pointer" },
  input: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none" },
  textarea: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none", resize:"vertical", lineHeight:1.7 },
  sendBtn: { width:"100%", padding:14, background:"#6366f1", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif", marginTop:4, transition:"opacity 0.2s" },
  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  gmailWarning: { fontSize:12, color:"#f59e0b", textAlign:"center", marginTop:4 },
  sectionLabel: { fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:10 },
  hotelListBox: { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0", padding:"16px" },
  loadingText: { fontSize:13, color:"#94a3b8", textAlign:"center", padding:"16px 0" },
  hotelRow: { display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:10, border:"1.5px solid #f1f5f9", marginBottom:6, cursor:"pointer", transition:"all 0.15s" },
  hotelName: { fontSize:13, fontWeight:600, color:"#1e293b", marginBottom:2 },
  hotelEmail: { fontSize:11, color:"#6366f1" },
  noEmail: { fontSize:11, color:"#cbd5e1" },
  sentBadge: { background:"#dcfce7", color:"#166534", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, flexShrink:0 },
  skipBadge: { background:"#fef3c7", color:"#92400e", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20, flexShrink:0 },
  previewBox: { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0", padding:"16px" },
  previewInner: { background:"#f8fafc", borderRadius:10, padding:"14px" },
  previewField: { fontSize:13, color:"#64748b", marginBottom:6, display:"flex", gap:8 },
  previewLabel: { fontWeight:600, color:"#374151", minWidth:55 },
  previewDivider: { borderTop:"1px solid #e2e8f0", margin:"10px 0" },
  previewBody: { fontSize:13, color:"#374151", lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"system-ui,sans-serif" },
  resultsBox: { background:"#fff", borderRadius:14, border:"1.5px solid #e2e8f0", padding:"16px" },
  resultRow: { display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #f8fafc", fontSize:13 },
  resultSuccess: { background:"#dcfce7", color:"#166534", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  resultFail: { background:"#fee2e2", color:"#991b1b", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20 },
  resultName: { color:"#1e293b", fontWeight:500, flex:1 },
  resultError: { fontSize:11, color:"#ef4444" },
};
