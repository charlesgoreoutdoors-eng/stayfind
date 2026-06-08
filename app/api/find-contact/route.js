export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("website");

  if (!website) return Response.json({ email: null, instagram: null });

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

    // 1. Direct href links to instagram
    [...html.matchAll(/href=["']https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})\/?["'?]/gi)]
      .forEach(m => add(m[1], 10));

    // 2. Any instagram.com/handle URL in the HTML
    [...html.matchAll(/instagram\.com\/([a-zA-Z0-9._]{2,30})(?:\/|\?|"|'|\s|>|\\|&)/g)]
      .forEach(m => add(m[1], 9));

    // 3. JSON-LD sameAs
    [...html.matchAll(/"sameAs"\s*:\s*\[([^\]]+)\]/gi)]
      .forEach(m => {
        const ig = m[1].match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i);
        if (ig) add(ig[1], 9);
      });

    // 4. JSON properties in scripts
    [...html.matchAll(/"(?:instagram|ig_?handle|instagram_?url|instagramHandle)"\s*:\s*"([^"]{2,50})"/gi)]
      .forEach(m => {
        const ig = m[1].match(/(?:instagram\.com\/)?@?([a-zA-Z0-9._]{2,30})/i);
        if (ig) add(ig[1], 8);
      });

    // 5. data-* attributes
    [...html.matchAll(/data-(?:instagram|ig)(?:-\w+)?=["']@?([a-zA-Z0-9._]{2,30})["']/gi)]
      .forEach(m => add(m[1], 8));

    // 6. Meta tags
    [...html.matchAll(/(?:instagram|ig)[_-]?(?:url|handle|username|profile)["'\s]*[:=]["'\s]*@?([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 8));

    // 7. aria-label or title near instagram icon
    [...html.matchAll(/(?:aria-label|title)=["'][^"']*instagram[^"']*["'][^>]*href=["']https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 9));

    // 8. SVG icon followed by instagram link (button detection)
    [...html.matchAll(/(?:instagram|ig)[^<]{0,200}instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 7));

    // 9. @mention near instagram keyword
    [...html.matchAll(/instagram[^<]{0,100}@([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 6));

    // 10. URL-encoded
    [...html.matchAll(/instagram\.com%2F([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 5));

    // 11. Script tags / window objects (JS-rendered clues)
    [...html.matchAll(/(?:instagram|igHandle|ig_handle)\s*[:=]\s*["']@?([a-zA-Z0-9._]{2,30})["']/gi)]
      .forEach(m => add(m[1], 7));

    // 12. Link element with rel="me" pointing to instagram
    [...html.matchAll(/<link[^>]*rel=["']me["'][^>]*href=["'][^"']*instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 10));

    // 13. Open Graph / Twitter card meta
    [...html.matchAll(/<meta[^>]*(?:property|name)=["'][^"']*(?:instagram|social)[^"']*["'][^>]*content=["'][^"']*instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)]
      .forEach(m => add(m[1], 9));

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
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(10000),
        redirect: "follow",
      });
      if (!res.ok) return null;
      return await res.text();
    } catch { return null; }
  };

  const extractEmails = (html) => {
    if (!html) return [];
    const found = new Set();
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const mailtoRegex = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi;
    const obfuscated = /([a-zA-Z0-9._%+\-]+)\s*[\[\(]?\s*at\s*[\]\)]?\s*([a-zA-Z0-9.\-]+)\s*[\[\(]?\s*dot\s*[\]\)]?\s*([a-zA-Z]{2,})/gi;
    (html.match(emailRegex) || []).forEach(e => found.add(e));
    [...html.matchAll(mailtoRegex)].forEach(m => found.add(m[1]));
    [...html.matchAll(obfuscated)].forEach(m => found.add(`${m[1]}@${m[2]}.${m[3]}`));
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

      allEmails.push(...cleanEmails(extractEmails(html)));
      if (!instagram) instagram = findInstagram(html);
      if (allEmails.length > 0 && instagram) break;
    }

    email = cleanEmails(allEmails)[0] || null;
    return Response.json({ email, instagram });
  } catch {
    return Response.json({ email: null, instagram: null });
  }
}
