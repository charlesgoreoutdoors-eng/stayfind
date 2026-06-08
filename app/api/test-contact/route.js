export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const website = searchParams.get("url") || "https://www.malibubeachinn.com";

  const res = await fetch(
    `https://stayfind-ix81.vercel.app/api/find-contact?website=${encodeURIComponent(website)}`,
    { signal: AbortSignal.timeout(30000) }
  );
  const data = await res.json();
  return Response.json({ website, result: data, status: res.status });
}
