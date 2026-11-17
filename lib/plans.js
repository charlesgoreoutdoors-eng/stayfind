// Plan limits — single source of truth, used by the server (enforcement) and the
// app (usage meters). Limits reset on the 1st of each month (UTC).
//
// A "search" is a new city (or map area) searched in the month — repeating the
// same city, or switching property tabs for it, doesn't use another one.
// Email / Instagram finds count per hotel website; re-checking the same hotel
// in the same month is free.

export const PLAN_LIMITS = {
  spark:    { search: 0,  email_find: 0,   ig_find: 0,   hunter: 0 },
  glow:     { search: 10, email_find: 200, ig_find: 200, hunter: 0 },
  radiant:  { search: 40, email_find: 500, ig_find: 500, hunter: 100 },
  founding: { search: 40, email_find: 500, ig_find: 500, hunter: 100 },
};

export const USAGE_LABELS = {
  search:     { label: "City searches",       hint: "New cities or map areas searched" },
  email_find: { label: "Email finds",         hint: "Hotels checked for an email" },
  ig_find:    { label: "Instagram finds",     hint: "Hotels checked for an Instagram handle" },
  hunter:     { label: "Named contacts",      hint: "Hotels looked up for marketing contacts" },
};

export const PLAN_PRICES = { spark: "Free", glow: "$29/mo", radiant: "$79/mo", founding: "Founding member" };

export function limitsFor(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.spark;
}

export function currentPeriod(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
