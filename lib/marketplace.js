// Shared marketplace vocabulary used by both the hotel form and the creator
// job board, so labels stay in sync.

export const SERVICE_OPTIONS = [
  { value: "sponsored_collab", label: "Sponsored / Collab" },
  { value: "gifting",          label: "Gifting (free stay)" },
  { value: "affiliate",        label: "Affiliate" },
  { value: "ugc",              label: "UGC (content only)" },
  { value: "photography_paid", label: "Photography (paid)" },
  { value: "videography_paid", label: "Videography (paid)" },
];

export const SERVICE_LABELS = Object.fromEntries(SERVICE_OPTIONS.map(o => [o.value, o.label]));

export const CURRENCIES = ["USD", "AUD", "EUR", "GBP", "NZD", "CAD"];

// "Paid · USD 500" / "Free collab"
export function compensationLabel(o) {
  if (!o) return "";
  return o.type === "paid"
    ? `Paid · ${[o.currency, o.payment_amount].filter(v => v != null && v !== "").join(" ")}`.trim()
    : "Free collab";
}

// Remove characters a Postgres `text` column can't store / that break a JSON
// request — null bytes and other C0 control chars — while keeping tab (9),
// newline (10) and carriage return (13). Text pasted from websites often
// carries these invisibly, which otherwise makes a save throw or get rejected.
export function sanitizeText(v) {
  if (typeof v !== "string") return v;
  let out = "";
  for (const ch of v) {
    const c = ch.codePointAt(0);
    if (c === 9 || c === 10 || c === 13 || c >= 32) out += ch;
  }
  return out;
}

export function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}
