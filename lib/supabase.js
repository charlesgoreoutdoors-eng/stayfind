import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const missing = [
  !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
  !supabaseKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
].filter(Boolean);

if (missing.length) {
  const message = [
    `Supabase is not configured — missing ${missing.join(" and ")}.`,
    ``,
    `Without it the client points at a placeholder project, so sign-in never`,
    `creates a session and every database read comes back empty. Nothing`,
    `throws on its own — it just looks like "login doesn't work".`,
    ``,
    `Fix: add the missing keys to .env.local, then RESTART the dev server.`,
    `NEXT_PUBLIC_* values are inlined at build time, so hot reload will not`,
    `pick them up.`,
    ``,
    `  vercel env pull .env.local`,
    ``,
    `or copy the values from .env.production.`,
  ].join("\n");

  // Fail loudly in development: a missing key should stop you immediately,
  // not resurface later as a mystery auth bug.
  if (process.env.NODE_ENV === "development") throw new Error(message);

  // In production, don't take the whole app down at import time — but make
  // the cause unmistakable in the logs.
  console.error(message);
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseKey || "placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
