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

export function fmtDate(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }); }
  catch { return iso; }
}
