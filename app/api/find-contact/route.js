const BROWSERLESS_KEY = process.env.BROWSERLESS_API_KEY;

const igBlacklist = [
  "p", "explore", "reel", "reels", "tv", "stories", "share", "sharer",
  "accounts", "legal", "about", "help", "press", "api", "blog",
  "jobs", "privacy", "terms", "developers", "directory", "lite",
  "web", "login", "signup", "static", "cdn", "graphql", "",
  "null", "undefined", "true", "false", "home", "index",
  "instagram", "facebook", "twitter", "tiktok", "youtube",
];

const emailBlacklist = [
  "example.com", "sentry.io", "wix.com", "googleapis", "schema.org",
  "cloudflare", "jquery", "bootstrap", "w3.org", "facebook.com",
  "twitter.com", "instagram.com", "linkedin.com", "youtube.com",
  "google.com", "apple.com", "microsoft.com", "amazon.com",
  "placeholder", "domain.com", "email.com", "test.com",
];

const emailPrefixBlacklist = [
  "no-reply", "noreply", "donotreply", "do-not-reply", "bounce",
  "mailer", "daemon", "postmaster", "webmaster", "abuse",
];

const scoreEmail = (email) => {
  const lower = email.toLowerCase();
  const highValue = ["info", "contact", "hello", "enquir", "booking", "reserv", "sales", "marketing", "media", "pr@", "press"];
  const medValue = ["admin", "manager", "general", "hotel", "stay", "guest"];
  if (highValue.some(p => lower.startsWith(p))) return 3;
  if (medValue.some(p => lower.startsWith(p))) return 2;
  return 1;
};

const cleanEmails = (rawEmails) => {
  if (!rawEmails) return [];
  return [...new Set(rawEmails)]
    .filter(e => e.length > 5 && e.length < 80)
    .filter(e => e.includes("@") && e.includes("."))
    .filter(e => !emailBlacklist.some(b => e.includes(b)))
    .filter(e => !emailPrefixBlacklist.some(p => e.toLowerCase().startsWith(p)))
    .sort((a, b) => scoreEmail(b) - scoreEmail(a));
};

const findInstagram = (html) => {
  if (!html) return null;
  const candidates = new Map();

  const add = (handle, score) => {
    if (!handle) return;
    const clean = handle.toLowerCase().replace(/[\\/'">\s]/g, "").replace(/\?.*$/, "");
    if (!clean || clean.length < 2 || clean.length > 30) return;
    if (igBlacklist.includes(clean)) return;
    if (/^\d+$/.test(clean)) return;
    candidates.set(clean, Math.max(candidates.get(clean) || 0, score));
  };

  [...html.matchAll(/href=["']https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?["'?]/gi)].forEach(m => add(m[1], 10));
  [...html.matchAll(/instagram\.com\/([a-zA-Z0-9._]{2,30})(?:\/|\?|"|'|\s|>|\\|&)/g)].forEach(m => add(m[1], 9));
  [...html.matchAll(/"sameAs"\s*:\s*\[([^\]]+)\]/gi)].forEach(m => { const ig = m[1].match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i); if (ig) add(ig[1], 9); });
  [...html.matchAll(/"(?:instagram|ig_?handle|instagram_?url|instagramHandle)"\s*:\s*"([^"]{2,50})"/gi)].forEach(m => { const ig = m[1].match(/(?:instagram\.com\/)?@?([a-zA-Z0-9._]{2,30})/i); if (ig) add(ig[1], 8); });
  [...html.matchAll(/data-(?:instagram|ig)(?:-\w+)?=["']@?([a-zA-Z0-9._]{2,30})["']/gi)].forEach(m => add(m[1], 8));
  [...html.matchAll(/(?:instagram|ig)[^<]{0,100}@([a-zA-Z0-9._]{2,30})/gi)].forEach(m => add(m[1], 6));
  [...html.matchAll(/instagram\.com%2F([a-zA-Z0-9._]{2,30})/gi)].forEach(m => add(m[1], 5));
  [...html.matchAll(/(?:instagram|igHandle|ig_handle)\s*[:=]\s*["']@?([a-zA-Z0-9._]{2,30})["']/gi)].forEach(m => add(m[1], 7));
  [...html.matchAll(/<link[^>]*rel=["']me["'][^>]*href=["'][^"']*instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)].forEach(m => add(m[1], 10));

  if (candidates.size === 0) return null;
  const best = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? "@" + best[0] : null;
};

const extractEmails = (html) => {
  if (!html) return [];
  const found = new Set();
  (html.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []).forEach(e => found.add(e));
  [...html.matchAll(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi)].forEach(m => found.add(m[1]));
  [...html.matchAll(/([a-zA-Z0-9._%+\-]+)\s*[\[\(]?\s*at\s*[\]\)]?\s*([a-zA-Z0-9.\-]+)\s*[\[\(]?\s*dot\s*[\]\)]?\s*([a-zA-Z]{2,})/gi)].forEach(m => found.add(`${m[1]}@${m[2]}.${m[3]}`));
  return [...found];
};

// Standard fetch — fast, works for static HTML sites
const fetchStatic = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
};

// Browserless fetch — renders full JS like a real browser
const fetchRendered = async (url) => {
  if (!BROWSERLESS_KEY) return null;
  try {
    const res = await fetch(
      `https://chrome.browserless.io/content?token=${BROWSERLESS_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          waitFor: 2000, // wait 2s for JS to render
          gotoOptions: { waitUntil: "networkidle2", timeout: 15000 },
        }),
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    return await res.text();
  } catch { return null; }
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("website");
  if (!website) return Response.json({ email: null, instagram: null });

  try {
    const base = website.replace(/\/$/, "").replace(/^http:/, "https:");
    let email = null;
    let instagram = null;
    let allEmails = [];

    const pagesToTry = [
      base,
      `${base}/contact`,
      `${base}/contact-us`,
      `${base}/about`,
      `${base}/about-us`,
      `${base}/contacts`,
      `${base}/reach-us`,
      `${base}/get-in-touch`,
      `${base}/social`,
      `${base}/follow-us`,
    ];

    // Pass 1 — try static fetch on all pages first (fast)
    for (const url of pagesToTry) {
      const html = await fetchStatic(url);
      if (!html) continue;
      allEmails.push(...cleanEmails(extractEmails(html)));
      if (!instagram) instagram = findInstagram(html);
      if (allEmails.length > 0 && instagram) break;
    }

    // Pass 2 — if still missing instagram, use Browserless on homepage + contact
    // This renders the full JS so social buttons are visible
    if (!instagram && BROWSERLESS_KEY) {
      const priorityPages = [base, `${base}/contact`, `${base}/about`];
      for (const url of priorityPages) {
        const html = await fetchRendered(url);
        if (!html) continue;
        if (!instagram) instagram = findInstagram(html);
        // Also pick up any emails missed in static pass
        const moreEmails = cleanEmails(extractEmails(html));
        if (moreEmails.length > 0) allEmails.push(...moreEmails);
        if (instagram) break;
      }
    }

    email = cleanEmails(allEmails)[0] || null;
    return Response.json({ email, instagram });
  } catch {
    return Response.json({ email: null, instagram: null });
  }
}
