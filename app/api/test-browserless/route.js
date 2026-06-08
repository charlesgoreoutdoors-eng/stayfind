export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url") || "https://www.malibubeachinn.com";
  const key = process.env.BROWSERLESS_API_KEY;

  const results = {
    hasKey: !!key,
    keyPrefix: key ? key.substring(0, 8) + "..." : "missing",
    url,
    staticResult: null,
    browserlessResult: null,
  };

  // Test 1: static fetch
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();
    const igMatches = html.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/g) || [];
    results.staticResult = {
      status: res.status,
      htmlLength: html.length,
      igMatches: [...new Set(igMatches)].slice(0, 5),
    };
  } catch (e) {
    results.staticResult = { error: e.message };
  }

  // Test 2: Browserless
  if (key) {
    try {
      const res = await fetch(
        `https://production-sfo.browserless.io/content?token=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, waitForTimeout: 2000 }),
          signal: AbortSignal.timeout(20000),
        }
      );
      const html = await res.text();
      const igMatches = html.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/g) || [];
      results.browserlessResult = {
        status: res.status,
        htmlLength: html.length,
        igMatches: [...new Set(igMatches)].slice(0, 5),
      };
    } catch (e) {
      results.browserlessResult = { error: e.message };
    }
  } else {
    results.browserlessResult = { error: "No API key" };
  }

  return Response.json(results);
}
