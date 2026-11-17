import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Returns just the website for one hotel. Called only when a hotel is added to
// a list, so we pay for a single narrow lookup (website only — no phone, photos
// or reviews) instead of full details for every search result.
export async function GET(request) {
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const placeId = new URL(request.url).searchParams.get("place_id");
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!placeId || !/^[A-Za-z0-9_-]{10,200}$/.test(placeId)) return Response.json({ error: "Missing place_id" }, { status: 400 });
  if (!key) return Response.json({ error: "API key not configured" }, { status: 500 });

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=website&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return Response.json({ website: data.result?.website || null });
  } catch {
    return Response.json({ website: null });
  }
}
