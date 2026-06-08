export async function GET(request) {
  const key = process.env.BROWSERLESS_API_KEY;
  if (!key) return Response.json({ error: "No API key found in env" });

  try {
    const res = await fetch(
      `https://production-sfo.browserless.io/content?token=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://www.malibubeachinn.com",
          waitForTimeout: 2000,
        }),
        signal: AbortSignal.timeout(20000),
      }
    );

    const text = await res.text();
    const igMatches = text.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/g) || [];

    return Response.json({
      status: res.status,
      ok: res.ok,
      htmlLength: text.length,
      instagramMatches: igMatches.slice(0, 10),
    });
  } catch (e) {
    return Response.json({ error: e.message });
  }
}
