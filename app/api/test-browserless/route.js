export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("url") || "https://www.malibubeachinn.com";
  const key = process.env.BROWSERLESS_API_KEY;

  // Simulate exactly what find-contact does
  const res = await fetch(website, {
    headers: { "User-Agent": "Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36" },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();

  // Raw matches
  const rawMatches = html.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/g) || [];

  // Simulate the add() cleanup function
  const igBlacklist = [
    "p","explore","reel","reels","tv","stories","share","sharer",
    "accounts","legal","about","help","press","api","blog",
    "jobs","privacy","terms","developers","directory","lite",
    "web","login","signup","static","cdn","graphql","",
    "null","undefined","true","false","home","index",
    "instagram","facebook","twitter","tiktok","youtube",
  ];

  const candidates = new Map();
  const pattern = /instagram\.com\/([a-zA-Z0-9._]{2,30})(?:\/|\?|"|'|\s|>|\\|&)/g;
  const matches = [...html.matchAll(pattern)];

  matches.forEach(m => {
    const handle = m[1];
    if (!handle) return;
    const clean = handle.toLowerCase().replace(/[\\/'">\s]/g, "").replace(/\?.*$/, "");
    const blacklisted = igBlacklist.includes(clean);
    const tooShort = !clean || clean.length < 2;
    const tooLong = clean.length > 30;
    const pureNumber = /^\d+$/.test(clean);
    candidates.set(handle, { clean, blacklisted, tooShort, tooLong, pureNumber, passes: !blacklisted && !tooShort && !tooLong && !pureNumber });
  });

  return Response.json({
    rawMatches: [...new Set(rawMatches)].slice(0, 10),
    patternMatches: Object.fromEntries(candidates),
    finalResult: [...candidates.entries()].filter(([,v]) => v.passes).map(([k,v]) => v.clean)[0] || null,
  });
}
