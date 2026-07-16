"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useGmail } from "../../lib/useGmail";
import GmailButton from "../../components/GmailButton";
import { useIsMobile } from "../../lib/useIsMobile";

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email";

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleString([], { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

function extractEmailAddress(str) {
  const match = str.match(/<(.+?)>/) || str.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  return match ? match[1] : str;
}

function extractName(str) {
  const match = str.match(/^(.+?)\s*</);
  return match ? match[1].replace(/"/g, "").trim() : extractEmailAddress(str);
}

const GENERIC_DOMAINS = new Set([
  "gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","hotmail.com",
  "hotmail.co.uk","outlook.com","live.com","icloud.com","me.com",
  "mac.com","aol.com","msn.com","protonmail.com","proton.me",
]);

function emailDomain(email) {
  return email ? email.split("@")[1]?.toLowerCase() : null;
}

export default function MessagesPage() {
  const [lists, setLists]                 = useState([]);
  const [allHotels, setAllHotels]         = useState([]);
  const [threads, setThreads]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [activeThread, setActiveThread]   = useState(null);
  const [replyText, setReplyText]         = useState("");
  const [sending, setSending]             = useState(false);
  const [selectedList, setSelectedList]   = useState("all");
  const [error, setError]                 = useState("");
  const [unread, setUnread]               = useState({});
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail } = useGmail();
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("list"); // "list" | "conversation"

  useEffect(() => { fetchListsAndHotels(); }, []);
  useEffect(() => { if (gmailToken) fetchThreads(); }, [gmailToken]);
  useEffect(() => { if (activeThread) messagesEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [activeThread]);

  const fetchListsAndHotels = async () => {
    if (!user) return;
    const { data: listsData } = await supabase.from("lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLists(listsData || []);
    const { data: hotelsData } = await supabase.from("list_hotels").select("*").eq("user_id", user.id);
    setAllHotels(hotelsData || []);
  };



  const fetchThreads = async () => {
    if (!gmailToken) return;
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token || "";

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${authToken}` },
        body: JSON.stringify({ accessToken: gmailToken }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      // Enrich threads with hotel info from our lists
      const enriched = (data.threads || []).map(thread => {
        // Exact email match first
        let hotel = allHotels.find(h => h.email && thread.hotelEmail &&
          h.email.toLowerCase() === thread.hotelEmail.toLowerCase());
        // Domain fallback: same @domain, skipping generic providers
        if (!hotel && thread.hotelEmail) {
          const domain = emailDomain(thread.hotelEmail);
          if (domain && !GENERIC_DOMAINS.has(domain)) {
            hotel = allHotels.find(h => h.email && emailDomain(h.email) === domain);
          }
        }
        const list = hotel ? lists.find(l => l.id === hotel.list_id) : null;
        return { ...thread, hotel, list };
      });

      setThreads(enriched);

      // Mark all as unread initially
      const unreadMap = {};
      enriched.forEach(t => { unreadMap[t.id] = true; });
      setUnread(unreadMap);
    } catch (e) {
      setError("Could not load messages. Try reconnecting Gmail.");
    } finally {
      setLoading(false);
    }
  };

  const openThread = (thread) => {
    setActiveThread(thread);
    setReplyText("");
    setUnread(prev => ({ ...prev, [thread.id]: false }));
    if (isMobile) setMobileView("conversation");
  };

  const sendReply = async () => {
    if (!replyText.trim() || !activeThread) return;
    setSending(true);
    try {
      const lastMsg = activeThread.messages[activeThread.messages.length - 1];
      const res = await fetch("/api/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: gmailToken,
          to: activeThread.hotelEmail,
          subject: activeThread.subject,
          body: replyText,
          threadId: activeThread.id,
          messageId: lastMsg.id,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Optimistically add reply to thread
      const newMsg = {
        id: Date.now().toString(),
        from: gmailEmail || "me",
        to: activeThread.hotelEmail,
        subject: activeThread.subject,
        date: new Date().toUTCString(),
        timestamp: Date.now(),
        body: replyText,
        snippet: replyText.substring(0, 100),
      };
      const updatedThread = { ...activeThread, messages: [...activeThread.messages, newMsg], lastTimestamp: Date.now() };
      setActiveThread(updatedThread);
      setThreads(prev => prev.map(t => t.id === activeThread.id ? updatedThread : t));
      setReplyText("");
    } catch (e) {
      alert("Failed to send reply: " + e.message);
    } finally {
      setSending(false);
    }
  };

  // Filter threads by selected list
  const filteredThreads = selectedList === "all"
    ? threads
    : threads.filter(t => t.list?.id === selectedList);

  const unreadCount = Object.values(unread).filter(Boolean).length;

  const isMe = (from) => {
    if (!gmailEmail) return false;
    return from.includes(gmailEmail) || from.toLowerCase().includes("me");
  };

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <h1 style={s.title}>Messages</h1>
          {unreadCount > 0 && <span style={s.unreadBadge}>{unreadCount} new</span>}
        </div>
        <div style={s.headerRight}>
          <GmailButton gmailToken={gmailToken} gmailEmail={gmailEmail} gmailLoading={gmailLoading} tokenExpired={tokenExpired} onConnect={connectGmail} onDisconnect={disconnectGmail} />
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {!gmailToken ? (
        <div style={s.connectPrompt}>
          <div style={s.connectIcon}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <h2 style={s.connectTitle}>Connect Gmail to see replies</h2>
          <p style={s.connectDesc}>When hotels reply to your outreach emails, their messages will appear here grouped by list.</p>
          <button style={s.connectBtn} onClick={connectGmail} disabled={gmailLoading}>
            {gmailLoading ? "Connecting..." : "Connect Gmail"}
          </button>
        </div>
      ) : (
        <div style={{ ...s.layout, gridTemplateColumns: isMobile ? "1fr" : "320px 1fr" }}>
          {/* Left: thread list */}
          <div style={{ ...s.threadPanel, display: isMobile && mobileView === "conversation" ? "none" : "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* List filter */}
            <div style={s.filterRow}>
              <button style={{ ...s.filterBtn, ...(selectedList==="all" ? s.filterBtnActive : {}) }} onClick={() => setSelectedList("all")}>
                All
                {threads.length > 0 && <span style={s.filterCount}>{threads.length}</span>}
              </button>
              {lists.filter(l => threads.some(t => t.list?.id === l.id)).map(l => (
                <button key={l.id} style={{ ...s.filterBtn, ...(selectedList===l.id ? s.filterBtnActive : {}) }} onClick={() => setSelectedList(l.id)}>
                  {l.name.length > 14 ? l.name.substring(0, 14) + "..." : l.name}
                  <span style={s.filterCount}>{threads.filter(t => t.list?.id === l.id).length}</span>
                </button>
              ))}
            </div>

            {/* Threads */}
            {loading ? (
              <div style={s.loadingBox}>
                <div style={s.spinner} />
                <p style={s.loadingText}>Checking for replies...</p>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div style={s.emptyThreads}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p style={{ fontSize:14, color:"var(--color-ink-muted)", marginTop:12, textAlign:"center" }}>
                  {selectedList === "all" ? "No replies yet. Hotels that reply to your outreach will appear here." : "No replies from this list yet."}
                </p>
              </div>
            ) : (
              filteredThreads.map(thread => (
                <div key={thread.id}
                  style={{ ...s.threadItem, ...(activeThread?.id === thread.id ? s.threadItemActive : {}), ...(unread[thread.id] ? s.threadItemUnread : {}) }}
                  onClick={() => openThread(thread)}
                >
                  {/* Hotel avatar */}
                  <div style={s.avatar}>
                    {thread.hotel?.photo_url
                      ? <img src={thread.hotel.photo_url} alt="" style={s.avatarImg} onError={e => e.target.style.display="none"} />
                      : <span style={s.avatarInitial}>{thread.hotel?.name?.[0] || "H"}</span>}
                  </div>
                  <div style={s.threadInfo}>
                    <div style={s.threadTop}>
                      <span style={s.threadHotelName}>{thread.hotel?.name || extractName(thread.hotelEmail)}</span>
                      <span style={s.threadTime}>{timeAgo(thread.lastTimestamp)}</span>
                    </div>
                    {thread.list && <span style={s.threadList}>{thread.list.name}</span>}
                    {!thread.hotel && <span style={s.threadUnlinked}>Unlinked</span>}
                    <p style={s.threadSnippet}>{thread.lastReply?.snippet?.substring(0, 70) || "..."}</p>
                  </div>
                  {unread[thread.id] && <div style={s.unreadDot} />}
                </div>
              ))
            )}
          </div>

          {/* Right: conversation */}
          <div style={{ ...s.conversationPanel, display: isMobile && mobileView === "list" ? "none" : "flex", flexDirection: "column" }}>
            {!activeThread ? (
              <div style={s.noThread}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" strokeWidth="1.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                <p style={s.noThreadText}>Select a conversation to read it</p>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div style={s.threadHeader}>
                  <div style={s.threadHeaderLeft}>
                  {isMobile && (
                    <button onClick={() => setMobileView("list")} style={{ background:"none", border:"none", cursor:"pointer", color:"var(--color-ink-muted)", padding:"0 8px 0 0", display:"flex", alignItems:"center" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                  )}
                    <div style={s.headerAvatar}>
                      {activeThread.hotel?.photo_url
                        ? <img src={activeThread.hotel.photo_url} alt="" style={s.avatarImg} onError={e => e.target.style.display="none"} />
                        : <span style={{ ...s.avatarInitial, fontSize:18 }}>{activeThread.hotel?.name?.[0] || "H"}</span>}
                    </div>
                    <div>
                      <p style={s.threadHeaderName}>{activeThread.hotel?.name || extractName(activeThread.hotelEmail)}</p>
                      <p style={s.threadHeaderMeta}>
                        {activeThread.hotelEmail}
                        {activeThread.list && <span style={s.headerListTag}>{activeThread.list.name}</span>}
                      </p>
                    </div>
                  </div>
                  <span style={s.msgCount}>{activeThread.messageCount} message{activeThread.messageCount !== 1 ? "s" : ""}</span>
                </div>

                {/* Messages */}
                <div style={s.messageList}>
                  {activeThread.messages.map((msg, i) => {
                    const mine = isMe(msg.from);
                    return (
                      <div key={msg.id || i} style={{ ...s.messageBubbleWrap, justifyContent: mine ? "flex-end" : "flex-start" }}>
                        {!mine && (
                          <div style={s.bubbleAvatar}>
                            <span style={s.bubbleAvatarText}>{activeThread.hotel?.name?.[0] || "H"}</span>
                          </div>
                        )}
                        <div style={{ maxWidth:"72%" }}>
                          <div style={{ ...s.bubble, ...(mine ? s.bubbleMine : s.bubbleTheirs) }}>
                            <pre style={{ ...s.bubbleText, color: mine ? "var(--color-ground-page)" : "var(--color-ink-primary)" }}>{msg.body || msg.snippet}</pre>
                          </div>
                          <p style={{ ...s.bubbleTime, textAlign: mine ? "right" : "left" }}>{formatDate(msg.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply box */}
                <div style={s.replyBox}>
                  <textarea
                    style={s.replyInput}
                    placeholder="Write a reply..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) sendReply(); }}
                  />
                  <div style={s.replyFooter}>
                    <span style={s.replyHint}>Cmd+Enter to send</span>
                    <button
                      style={{ ...s.sendBtn, opacity: replyText.trim() && !sending ? 1 : 0.45 }}
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                    >
                      {sending ? (
                        <span style={{ display:"flex", alignItems:"center", gap:8 }}><span style={s.spinnerWhite} />Sending...</span>
                      ) : (
                        <span style={{ display:"flex", alignItems:"center", gap:8 }}>
                          Send Reply
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  root: { padding:"28px 20px 0", maxWidth:1200, margin:"0 auto", height:"calc(100vh - 52px)", display:"flex", flexDirection:"column" },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 },
  headerLeft: { display:"flex", alignItems:"center", gap:12 },
  headerRight: { display:"flex", alignItems:"center", gap:10 },
  title: { fontSize:24, fontWeight:700, color:"var(--color-ink-primary)", letterSpacing:"-0.3px" },
  unreadBadge: { background:"var(--color-action-forest)", color:"var(--color-ground-page)", fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20 },
  gmailBtn: { display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"var(--color-ink-primary)", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", color:"var(--color-ground-page)" },
  gmailConnected: { display:"flex", alignItems:"center", gap:8, background:"var(--color-ground-sand)", border:"1px solid var(--color-border)", borderRadius:10, padding:"7px 14px" },
  gmailDot: { width:8, height:8, borderRadius:"50%", background:"var(--status-success-ink)", flexShrink:0 },
  gmailText: { fontSize:12, color:"var(--color-ink-primary)", fontWeight:500 },
  refreshBtn: { background:"none", border:"none", cursor:"pointer", color:"var(--color-ink-muted)", display:"flex", alignItems:"center", padding:4 },
  disconnectBtn: { fontSize:11, color:"var(--color-ink-muted)", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" },
  errorBox: { background:"var(--status-error-bg)", border:"1px solid var(--color-accent-amber)", borderRadius:10, padding:"12px 16px", color:"var(--color-error)", fontSize:13, marginBottom:16 },
  connectPrompt: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", textAlign:"center" },
  connectIcon: { width:72, height:72, background:"var(--color-ground-sand)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 },
  connectTitle: { fontSize:20, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:8 },
  connectDesc: { fontSize:14, color:"var(--color-ink-muted)", maxWidth:360, lineHeight:1.7, marginBottom:24 },
  connectBtn: { background:"var(--color-ink-primary)", color:"var(--color-ground-page)", border:"none", borderRadius:12, padding:"12px 28px", fontSize:14, fontWeight:600, cursor:"pointer" },
  layout: { flex:1, display:"grid", gridTemplateColumns:"320px 1fr", gap:0, minHeight:0, borderRadius:"14px 14px 0 0", overflow:"hidden", border:"1px solid var(--color-border)" },
  threadPanel: { background:"var(--color-ground-card)", borderRight:"1px solid var(--color-ground-sand)", display:"flex", flexDirection:"column", overflow:"hidden" },
  filterRow: { display:"flex", gap:4, padding:"12px 12px 8px", borderBottom:"1px solid var(--color-ground-sand)", flexWrap:"wrap" },
  filterBtn: { padding:"5px 10px", border:"1px solid var(--color-border)", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", color:"var(--color-ink-muted)", background:"var(--color-ground-card)", display:"flex", alignItems:"center", gap:5, transition:"all 0.15s" },
  filterBtnActive: { background:"var(--color-ink-primary)", color:"var(--color-ground-page)", border:"1px solid var(--color-ink-primary)" },
  filterCount: { fontSize:10, background:"rgba(255,255,255,0.2)", padding:"1px 5px", borderRadius:10 },
  loadingBox: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12 },
  spinner: { width:24, height:24, border:"2.5px solid var(--color-ground-sand)", borderTopColor:"var(--color-accent-amber)", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  loadingText: { fontSize:13, color:"var(--color-ink-muted)" },
  emptyThreads: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px 24px" },
  threadItem: { display:"flex", alignItems:"flex-start", gap:10, padding:"14px 14px", borderBottom:"1px solid var(--color-ground-page)", cursor:"pointer", transition:"background 0.12s", position:"relative" },
  threadItemActive: { background:"var(--status-error-bg)" },
  threadItemUnread: { background:"var(--color-ground-sand)" },
  avatar: { width:40, height:40, borderRadius:"50%", background:"var(--color-ground-sand)", flexShrink:0, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center" },
  avatarImg: { width:"100%", height:"100%", objectFit:"cover" },
  avatarInitial: { fontSize:16, fontWeight:700, color:"var(--color-accent-terracotta)" },
  threadInfo: { flex:1, minWidth:0 },
  threadTop: { display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:2 },
  threadHotelName: { fontSize:13, fontWeight:700, color:"var(--color-ink-primary)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  threadTime: { fontSize:11, color:"var(--color-ink-muted)", flexShrink:0, marginLeft:8 },
  threadList: { fontSize:10, color:"var(--color-accent-terracotta)", fontWeight:600, background:"var(--status-error-bg)", padding:"1px 7px", borderRadius:10, display:"inline-block", marginBottom:3 },
  threadUnlinked: { fontSize:10, color:"var(--color-ink-muted)", fontWeight:600, background:"var(--color-ground-sand)", padding:"1px 7px", borderRadius:10, display:"inline-block", marginBottom:3 },
  threadSnippet: { fontSize:12, color:"var(--color-ink-muted)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.4 },
  unreadDot: { position:"absolute", top:18, right:12, width:8, height:8, borderRadius:"50%", background:"var(--color-action-forest)", flexShrink:0 },
  conversationPanel: { background:"var(--color-ground-sand)", display:"flex", flexDirection:"column", minHeight:0 },
  noThread: { flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16 },
  noThreadText: { fontSize:14, color:"var(--color-ink-muted)", textAlign:"center" },
  threadHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", background:"var(--color-ground-card)", borderBottom:"1px solid var(--color-ground-sand)" },
  threadHeaderLeft: { display:"flex", alignItems:"center", gap:12 },
  headerAvatar: { width:44, height:44, borderRadius:"50%", background:"var(--color-ground-sand)", overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  threadHeaderName: { fontSize:15, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:2 },
  threadHeaderMeta: { fontSize:12, color:"var(--color-ink-muted)", display:"flex", alignItems:"center", gap:8 },
  headerListTag: { background:"var(--status-error-bg)", color:"var(--color-accent-terracotta)", fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:10, marginLeft:6 },
  msgCount: { fontSize:12, color:"var(--color-ink-muted)" },
  messageList: { flex:1, overflowY:"auto", padding:"20px 20px", display:"flex", flexDirection:"column", gap:16 },
  messageBubbleWrap: { display:"flex", alignItems:"flex-end", gap:8 },
  bubbleAvatar: { width:28, height:28, borderRadius:"50%", background:"var(--color-action-forest)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginBottom:18 },
  bubbleAvatarText: { fontSize:12, fontWeight:700, color:"var(--color-ground-page)" },
  bubble: { padding:"12px 16px", borderRadius:18, maxWidth:"100%" },
  bubbleMine: { background:"var(--color-ink-primary)", borderBottomRightRadius:4 },
  bubbleTheirs: { background:"var(--color-ground-card)", borderBottomLeftRadius:4, border:"1px solid var(--color-ground-sand)" },
  bubbleText: { fontSize:13, lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"inherit", margin:0 },
  bubbleTime: { fontSize:10, color:"var(--color-ink-muted)", marginTop:4, paddingX:4 },
  replyBox: { padding:"12px 16px 16px", background:"var(--color-ground-card)", borderTop:"1px solid var(--color-ground-sand)" },
  replyInput: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:12, padding:"12px 14px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", resize:"none", lineHeight:1.6 },
  replyFooter: { display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 },
  replyHint: { fontSize:11, color:"var(--color-ink-muted)" },
  sendBtn: { display:"flex", alignItems:"center", gap:8, background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", transition:"opacity 0.2s" },
  spinnerWhite: { display:"inline-block", width:14, height:14, border:"2px solid rgba(255,255,255,0.3)", borderTopcolor:"var(--color-ground-page)", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
};
