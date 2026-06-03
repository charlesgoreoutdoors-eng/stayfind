"use client";
import { useState, useEffect, useCallback } from "react";

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";
const STORAGE_KEY = "stayfind_gmail";
const TOKEN_BUFFER = 5 * 60 * 1000; // refresh 5 mins before expiry

function loadStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Check if token is still valid (with buffer)
    if (data.expiresAt && Date.now() < data.expiresAt - TOKEN_BUFFER) {
      return data;
    }
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch { return null; }
}

function saveToken(token, email, expiresIn = 3600) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      token,
      email,
      expiresAt: Date.now() + expiresIn * 1000,
    }));
  } catch {}
}

function clearToken() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function useGmail() {
  const [gmailToken, setGmailToken]   = useState(null);
  const [gmailEmail, setGmailEmail]   = useState(null);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);

  // Load stored token on mount
  useEffect(() => {
    const stored = loadStoredToken();
    if (stored) {
      setGmailToken(stored.token);
      setGmailEmail(stored.email);
    }
  }, []);

  // Check expiry every minute
  useEffect(() => {
    if (!gmailToken) return;
    const interval = setInterval(() => {
      const stored = loadStoredToken();
      if (!stored) {
        setTokenExpired(true);
        setGmailToken(null);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [gmailToken]);

  const connectGmail = useCallback(() => {
    setGmailLoading(true);
    setTokenExpired(false);
    if (!GMAIL_CLIENT_ID) {
      alert("Gmail Client ID not configured.");
      setGmailLoading(false);
      return;
    }

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === "gmail_token" && event.data.token) {
        const { token, expiresIn } = event.data;
        setGmailToken(token);
        setGmailLoading(false);
        setTokenExpired(false);
        window.removeEventListener("message", handleMessage);
        // Fetch profile and save with expiry
        fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => {
            const email = d.email || "";
            setGmailEmail(email);
            saveToken(token, email, expiresIn || 3600);
          })
          .catch(() => saveToken(token, "", expiresIn || 3600));
      }
    };
    window.addEventListener("message", handleMessage);

    const redirectUri = window.location.origin + "/api/auth/gmail";
    const params = new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: GMAIL_SCOPES,
      prompt: "select_account",
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
  }, []);

  const disconnectGmail = useCallback(() => {
    setGmailToken(null);
    setGmailEmail(null);
    setTokenExpired(false);
    clearToken();
  }, []);

  return { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail };
}
