export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("website");
  const hotelName = searchParams.get("name");

  if (!website) return Response.json({ email: null });

  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const blacklist = ["example.com", "sentry.io", "wix.com", "googleapis", "schema.org",
    "cloudflare", "jquery", "bootstrap", "w3.org", "png", "jpg", "svg", "gif",
    "facebook.com", "twitter.com", "instagram.com", "linkedin.com"];

  const cleanEmail = (emails) => {
    return [...new Set(emails)]
      .filter(e => !blacklist.some(b => e.includes(b)))
      .filter(e => !e.startsWith("no-reply") && !e.startsWith("noreply") && !e.startsWith("donotreply"))
      .filter(e => e.length < 80)
      [0] || null;
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

    // Try homepage first
    const home = await fetchPage(base);
    if (home) {
      const found = home.match(emailRegex);
      const email = cleanEmail(found || []);
      if (email) return Response.json({ email });
    }

    // Try /contact page
    const contactUrls = [`${base}/contact`, `${base}/contact-us`, `${base}/about`, `${base}/about-us`];
    for (const url of contactUrls) {
      const page = await fetchPage(url);
      if (page) {
        const found = page.match(emailRegex);
        const email = cleanEmail(found || []);
        if (email) return Response.json({ email });
      }
    }

    return Response.json({ email: null });
  } catch {
    return Response.json({ email: null });
  }
}
