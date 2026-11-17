"use client";
import { supabase } from "./supabase";

// fetch() that sends the signed-in user's token, so API routes can identify the
// caller and enforce plan limits.
export async function authFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  return fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${session?.access_token || ""}` },
  });
}
