// Browser-local draft persistence for account forms. Unsaved edits are kept in
// localStorage so the fields remember what was typed if the user leaves the
// page, and are cleared once a real Save writes them to the profile. All
// access is wrapped so it degrades quietly where storage is unavailable
// (private windows, blocked cookies, SSR).

export function readDraft(key) {
  if (!key || typeof window === "undefined") return null;
  try { const raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}

export function writeDraft(key, value) {
  if (!key || typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function clearDraft(key) {
  if (!key || typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch {}
}
