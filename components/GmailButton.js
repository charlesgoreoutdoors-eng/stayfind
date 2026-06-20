"use client";

export default function GmailButton({ gmailToken, gmailEmail, gmailLoading, tokenExpired, onConnect, onDisconnect }) {
  if (tokenExpired) {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:8, background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:10, padding:"8px 14px" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <span style={{ fontSize:12, color:"#B83A22", fontWeight:500 }}>Gmail session expired</span>
        <button onClick={onConnect} style={{ fontSize:12, color:"#E85D3D", fontWeight:700, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", textDecoration:"underline" }}>
          Reconnect
        </button>
      </div>
    );
  }

  if (!gmailToken) {
    return (
      <button
        style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"#0F2544", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", color:"#F7F3EF", opacity: gmailLoading ? 0.7 : 1 }}
        onClick={onConnect}
        disabled={gmailLoading}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
        {gmailLoading ? "Connecting..." : "Connect Gmail"}
      </button>
    );
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, padding:"7px 12px" }}>
      <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", flexShrink:0 }} />
      <span style={{ fontSize:12, color:"#166534", fontWeight:500 }}>{gmailEmail}</span>
      <div style={{ width:1, height:14, background:"#86efac" }} />
      <button
        onClick={onConnect}
        style={{ fontSize:12, color:"#15803d", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }}
      >
        Reconnect
      </button>
      <button
        onClick={onDisconnect}
        style={{ fontSize:12, color:"#dc2626", fontWeight:600, background:"none", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }}
      >
        Disconnect
      </button>
    </div>
  );
}
