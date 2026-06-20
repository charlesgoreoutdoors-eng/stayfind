"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";
const REFRESH_BUFFER = 5 * 60 * 1000; // refresh 5 mins before expiry

async function supabaseAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const t = data?.session?.access_token;
  return t ? { Authorization: `Bearer ${t}` } : null;
}

export function useGmail() {
  const [gmailToken, setGmailToken]     = useState(null);
  const [gmailEmail, setGmailEmail]     = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const refreshTimer = useRef(null);

  // Pull a fresh access token from the server (minted from the stored refresh token).
  const refresh = useCallback(async () => {
    const headers = await supabaseAuthHeader();
    if (!headers) { setGmailToken(null); return false; }
    try {
      const res = await fetch("/api/gmail/token", { headers });
      const data = await res.json();
      if (!res.ok || !data.connected) {
        setGmailToken(null);
        setGmailEmail(null);
        return false;
      }
      setGmailToken(data.accessToken);
      setGmailEmail(data.email || null);
      setTokenExpired(false);
      // Schedule the next refresh just before this token expires.
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      const ms = Math.max(30 * 1000, (data.expiresIn || 3600) * 1000 - REFRESH_BUFFER);
      refreshTimer.current = setTimeout(() => refresh(), ms);
      return true;
    } catch {
      setGmailToken(null);
      return false;
    }
  }, []);

  // On mount, try to restore the connection from the server.
  useEffect(() => {
    refresh();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, [refresh]);

  const connectGmail = useCallback(() => {
    setGmailLoading(true);
    setTokenExpired(false);
    if (!GMAIL_CLIENT_ID) {
      alert("Gmail Client ID not configured.");
      setGmailLoading(false);
      return;
    }

    const redirectUri = window.location.origin + "/api/auth/gmail";

    const handleMessage = async (event) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data) return;

      if (event.data.type === "gmail_code" && event.data.code) {
        window.removeEventListener("message", handleMessage);
        const headers = await supabaseAuthHeader();
        if (!headers) { setGmailLoading(false); alert("Please sign in again."); return; }
        try {
          const res = await fetch("/api/gmail/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ code: event.data.code, redirectUri }),
          });
          const data = await res.json();
          if (!res.ok || !data.connected) throw new Error([data.error, data.detail].filter(Boolean).join(": ") || "Connect failed");
          setGmailToken(data.accessToken);
          setGmailEmail(data.email || null);
          setTokenExpired(false);
          if (refreshTimer.current) clearTimeout(refreshTimer.current);
          const ms = Math.max(30 * 1000, (data.expiresIn || 3600) * 1000 - REFRESH_BUFFER);
          refreshTimer.current = setTimeout(() => refresh(), ms);
        } catch (e) {
          alert("Could not connect Gmail: " + e.message);
        } finally {
          setGmailLoading(false);
        }
      } else if (event.data.type === "gmail_error") {
        window.removeEventListener("message", handleMessage);
        setGmailLoading(false);
      }
    };
    window.addEventListener("message", handleMessage);

    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      access_type: "offline",
      prompt: "consent",
      scope: GMAIL_SCOPES,
    });
    const popup = window.open(
      "https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(),
      "gmail-auth", "width=500,height=600,left=200,top=100"
    );
    const check = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(check);
        window.removeEventListener("message", handleMessage);
        setGmailLoading(false);
      }
    }, 1000);
  }, [refresh]);

  const disconnectGmail = useCallback(async () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setGmailToken(null);
    setGmailEmail(null);
    setTokenExpired(false);
    const headers = await supabaseAuthHeader();
    if (headers) {
      try { await fetch("/api/gmail/disconnect", { method: "POST", headers }); } catch {}
    }
  }, []);

  return { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail };
}
