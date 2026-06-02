export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("website");

  if (!website) return Response.json({ email: null, instagram: null });

  const emailBlacklist = ["example.com", "sentry.io", "wix.com", "googleapis", "schema.org",
    "cloudflare", "jquery", "bootstrap", "w3.org", "png", "jpg", "svg", "gif",
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com"];

  const igBlacklist = ["p", "explore", "reel", "tv", "stories", "share", "sharer",
    "accounts", "legal", "about", "help", "press", "api", "blog", "jobs",
    "privacy", "terms", ""];

  const cleanEmail = (emails) => {
    if (!emails) return null;
    return [...new Set(emails)]
      .filter(e => !emailBlacklist.some(b => e.includes(b)))
      .filter(e => !e.startsWith("no-reply") && !e.startsWith("noreply") && !e.startsWith("donotreply"))
      .filter(e => e.length < 80)
      [0] || null;
  };

  const findInstagram = (html) => {
    if (!html) return null;
    // Match instagram.com/handle URLs in page
    const igPattern = /instagram\.com\/([a-zA-Z0-9._]{2,30})\/?(?:"|'|\s|>)/g;
    const matches = [...html.matchAll(igPattern)];
    for (const match of matches) {
      const handle = match[1]?.toLowerCase().replace(/\/$/, "");
      if (handle && !igBlacklist.includes(handle)) {
        return "@" + handle;
      }
    }
    return null;
  };

  const fetchPage = async (url) => {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; StayFind/1.0)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) return null;
      return await res.text();
    } catch { return null; }
  };

  try {
    const base = website.replace(/\/$/, "");
    let email = null;
    let instagram = null;

    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

    // Try homepage first
    const home = await fetchPage(base);
    if (home) {
      const found = home.match(emailRegex);
      email = cleanEmail(found || []);
      instagram = findInstagram(home);
    }

    // Try contact/about pages if still missing info
    if (!email || !instagram) {
      const contactUrls = [
        `${base}/contact`,
        `${base}/contact-us`,
        `${base}/about`,
        `${base}/about-us`,
      ];
      for (const url of contactUrls) {
        if (email && instagram) break;
        const page = await fetchPage(url);
        if (page) {
          if (!email) {
            const found = page.match(emailRegex);
            email = cleanEmail(found || []);
          }
          if (!instagram) instagram = findInstagram(page);
        }
      }
    }

    return Response.json({ email, instagram });
  } catch {
    return Response.json({ email: null, instagram: null });
  }
}
