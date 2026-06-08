export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("website");
  const hotelName = searchParams.get("name") || "";

  if (!website) return Response.json({ email: null, instagram: null });

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
    "support@wix", "info@wix", "hello@squarespace",
  ];

  const igBlacklist = [
    "p", "explore", "reel", "reels", "tv", "stories", "share", "sharer",
    "accounts", "legal", "about", "help", "press", "api", "blog",
    "jobs", "privacy", "terms", "developers", "directory", "lite",
    "web", "login", "signup", "static", "cdn", "graphql", "",
    "null", "undefined", "true", "false", "home", "index",
    "instagram", "facebook", "twitter", "tiktok", "youtube",
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

  const findInstagram = (html, sourceUrl = "") => {
    if (!html) return null;

    const candidates = new Map(); // handle -> score

    const addCandidate = (handle, score) => {
      if (!handle) return;
      const clean = handle.toLowerCase()
        .replace(/\/$/, "")
        .replace(/\\/g, "")
        .replace(/['"]/g, "")
        .trim();
      if (!clean || clean.length < 2 || clean.length > 30) return;
      if (igBlacklist.includes(clean)) return;
      if (/^\d+$/.test(clean)) return; // skip pure numbers
      candidates.set(clean, Math.max(candidates.get(clean) || 0, score));
    };

    // Pattern 1: Direct instagram.com/handle links — highest confidence
    const directLinks = [...html.matchAll(/instagram\.com\/([a-zA-Z0-9._]{2,30})\/?(?:"|'|\s|>|\\|\?)/g)];
    directLinks.forEach(m => addCandidate(m[1], 10));

    // Pattern 2: href="https://instagram.com/handle"
    const hrefLinks = [...html.matchAll(/href=["']https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?["']/gi)];
    hrefLinks.forEach(m => addCandidate(m[1], 10));

    // Pattern 3: JSON-LD structured data
    const jsonLd = [...html.matchAll(/"sameAs"\s*:\s*\[([^\]]+)\]/gi)];
    jsonLd.forEach(match => {
      const igMatch = match[1].match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i);
      if (igMatch) addCandidate(igMatch[1], 9);
    });

    // Pattern 4: Open Graph / meta tags
    const metaIG = [...html.matchAll(/(?:instagram|ig)[_-]?(?:url|handle|username|profile)["'\s]*[:=]["'\s]*@?([a-zA-Z0-9._]{2,30})/gi)];
    metaIG.forEach(m => addCandidate(m[1], 8));

    // Pattern 5: data attributes
    const dataAttrs = [...html.matchAll(/data-(?:instagram|ig)(?:-\w+)?=["']@?([a-zA-Z0-9._]{2,30})["']/gi)];
    dataAttrs.forEach(m => addCandidate(m[1], 8));

    // Pattern 6: JSON properties like "instagram": "handle"
    const jsonProps = [...html.matchAll(/"(?:instagram|ig_handle|instagramHandle|instagram_url|instagramUrl)"\s*:\s*"([^"]{2,50})"/gi)];
    jsonProps.forEach(m => {
      const igMatch = m[1].match(/(?:instagram\.com\/)?@?([a-zA-Z0-9._]{2,30})/i);
      if (igMatch) addCandidate(igMatch[1], 7);
    });

    // Pattern 7: @handle mentions near "instagram" keyword
    const nearInstagram = [...html.matchAll(/instagram[^<]{0,50}@([a-zA-Z0-9._]{2,30})/gi)];
    nearInstagram.forEach(m => addCandidate(m[1], 6));

    // Pattern 8: URL-encoded instagram links
    const urlEncoded = [...html.matchAll(/instagram\.com%2F([a-zA-Z0-9._]{2,30})/gi)];
    urlEncoded.forEach(m => addCandidate(m[1], 5));

    // Pattern 9: Social media icon links (often near instagram text)
    const socialLinks = [...html.matchAll(/(?:follow|social|find)[^<]{0,100}instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)];
    socialLinks.forEach(m => addCandidate(m[1], 7));

    // Pick highest scoring candidate
    if (candidates.size === 0) return null;
    const best = [...candidates.entries()].sort((a, b) => b[1] - a[1])[0];
    return best ? "@" + best[0] : null;
  };

  const fetchPage = async (url) => {
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

  const extractEmails = (html) => {
    if (!html) return [];
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
    const obfuscatedRegex = /([a-zA-Z0-9._%+\-]+)\s*[\[\(]?\s*at\s*[\]\)]?\s*([a-zA-Z0-9.\-]+)\s*[\[\(]?\s*dot\s*[\]\)]?\s*([a-zA-Z]{2,})/gi;

    const found = new Set();
    (html.match(emailRegex) || []).forEach(e => found.add(e));
    [...html.matchAll(mailtoRegex)].forEach(m => found.add(m[1]));
    [...html.matchAll(obfuscatedRegex)].forEach(m => found.add(`${m[1]}@${m[2]}.${m[3]}`));
    return [...found];
  };

  try {
    const base = website.replace(/\/$/, "").replace(/^http:/, "https:");
    let email = null;
    let instagram = null;
    let allEmails = [];

    const pagesToTry = [
      base,
      `${base}/contact`,
      `${base}/contact-us`,
      `${base}/contacts`,
      `${base}/about`,
      `${base}/about-us`,
      `${base}/reach-us`,
      `${base}/get-in-touch`,
      `${base}/en/contact`,
      `${base}/en/contact-us`,
      `${base}/social`,
      `${base}/follow-us`,
      `${base}/connect`,
    ];

    for (const url of pagesToTry) {
      const html = await fetchPage(url);
      if (!html) continue;

      const pageEmails = extractEmails(html);
      allEmails.push(...cleanEmails(pageEmails));

      if (!instagram) instagram = findInstagram(html, url);

      // Stop early if we have both
      if (allEmails.length > 0 && instagram) break;
    }

    email = cleanEmails(allEmails)[0] || null;

    return Response.json({ email, instagram });
  } catch {
    return Response.json({ email: null, instagram: null });
  }
}
