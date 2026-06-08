export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("url") || "https://www.malibubeachinn.com";

  // Call find-contact directly exactly as the search page does
  const res = await fetch(
    `https://stayfind-ix81.vercel.app/api/find-contact?website=${encodeURIComponent(website)}&name=Test`,
    { signal: AbortSignal.timeout(25000) }
  );
  const data = await res.json();

  return Response.json({
    calledUrl: website,
    findContactResult: data,
    status: res.status,
  });
}
