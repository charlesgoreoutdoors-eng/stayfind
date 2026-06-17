import { createClient } from "@supabase/supabase-js";

const PRICE_LEVEL_MAP = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const makeCacheKey = (query, keyword) =>
  `${query}_${keyword}`.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 200);

// Geocode city — falls back gracefully if Geocoding API not enabled
async function geocodeCity(query, key) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results[0]) return null;

    const result = data.results[0];
    const loc = result.geometry.location;
    const viewport = result.geometry.viewport;

    const latDiff = Math.abs(viewport.northeast.lat - viewport.southwest.lat);
    const lngDiff = Math.abs(viewport.northeast.lng - viewport.southwest.lng);
    const radiusMetres = Math.min(
      Math.max(latDiff * 111000 / 2, lngDiff * 111000 / 2),
      25000
    );

    return { lat: loc.lat, lng: loc.lng, radius: radiusMetres, viewport };
  } catch {
    return null;
  }
}

// Get centre point from a text search result to use for grid
async function getCentreFromTextSearch(query, keyword, key) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + " in " + query)}&type=lodging&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== "OK" || !data.results[0]) return null;

    // Use the average of first few results as centre
    const places = data.results.slice(0, 5);
    const avgLat = places.reduce((s, p) => s + p.geometry.location.lat, 0) / places.length;
    const avgLng = places.reduce((s, p) => s + p.geometry.location.lng, 0) / places.length;

    return {
      lat: avgLat,
      lng: avgLng,
      radius: 8000,
      places: data.results, // reuse these
      viewport: {
        northeast: { lat: avgLat + 0.08, lng: avgLng + 0.08 },
        southwest: { lat: avgLat - 0.08, lng: avgLng - 0.08 },
      }
    };
  } catch {
    return null;
  }
}

function generateGridPoints(viewport, gridRadius) {
  const points = [];
  const { northeast, southwest } = viewport;
  const stepLat = (gridRadius / 111000) * 1.6;
  const stepLng = stepLat / Math.cos((((northeast.lat + southwest.lat) / 2) * Math.PI) / 180);

  for (let lat = southwest.lat; lat <= northeast.lat + stepLat; lat += stepLat) {
    for (let lng = southwest.lng; lng <= northeast.lng + stepLng; lng += stepLng) {
      points.push({ lat: Math.min(lat, 90), lng: Math.min(lng, 180) });
    }
  }
  return points.slice(0, 12);
}

async function searchAtPoint(lat, lng, radius, keyword, key) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${Math.min(radius, 5000)}&type=lodging&keyword=${encodeURIComponent(keyword)}&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

async function getPlaceDetails(placeId, key) {
  try {
    // Include url field which sometimes contains social links
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,price_level,website,formatted_phone_number,photos,editorial_summary,geometry,url&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

function buildHotel(place, details, apiKey) {
  const d = details || {};
  const geo = d.geometry?.location || place.geometry?.location;
  const photos = d.photos || place.photos;
  let photoUrl = null;
  if (photos && photos.length > 0) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photos[0].photo_reference}&key=${apiKey}`;
  }
  return {
    name: d.name || place.name,
    address: d.formatted_address || place.vicinity || "",
    rating: d.rating || place.rating || null,
    ratingCount: d.user_ratings_total || place.user_ratings_total || null,
    priceLevel: PRICE_LEVEL_MAP[d.price_level] || PRICE_LEVEL_MAP[place.price_level] || null,
    website: d.website || null,
    phone: d.formatted_phone_number || null,
    photoUrl,
    description: d.editorial_summary?.overview || null,
    placeId: place.place_id,
    lat: geo?.lat || null,
    lng: geo?.lng || null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query   = searchParams.get("query");
  const keyword = searchParams.get("keyword") || "hotel";
  const key     = process.env.GOOGLE_PLACES_API_KEY;

  if (!query) return Response.json({ error: "Missing query" }, { status: 400 });
  if (!key)   return Response.json({ error: "API key not configured" }, { status: 500 });

  // Check search cache
  const cacheKey = makeCacheKey(query, keyword);
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("search_cache")
    .select("results")
    .eq("cache_key", cacheKey)
    .gte("created_at", cutoff)
    .maybeSingle();
  if (cached?.results) {
    return Response.json({ hotels: cached.results, total: cached.results.length, fromCache: true });
  }

  try {
    const seen = new Set();
    const allPlaces = [];

    // Step 1 — try to geocode the city for accurate grid placement
    let cityData = await geocodeCity(query, key);

    // Step 2 — if geocoding fails, fall back to using text search centre
    if (!cityData) {
      cityData = await getCentreFromTextSearch(query, keyword, key);
      // Add the text search results to our pool immediately
      if (cityData?.places) {
        for (const place of cityData.places) {
          if (!seen.has(place.place_id)) {
            seen.add(place.place_id);
            allPlaces.push(place);
          }
        }
      }
    }

    if (!cityData) {
      return Response.json({ error: "Could not find that location" }, { status: 400 });
    }

    const { lat, lng, radius, viewport } = cityData;

    // Step 3 — generate grid and run nearby searches
    const gridRadius = Math.min(radius / 2.5, 5000);
    const points = generateGridPoints(viewport, gridRadius);

    for (let i = 0; i < points.length; i += 4) {
      const batch = points.slice(i, i + 4);
      const results = await Promise.all(
        batch.map(p => searchAtPoint(p.lat, p.lng, gridRadius, keyword, key))
      );
      for (const places of results) {
        for (const place of places) {
          if (!seen.has(place.place_id)) {
            seen.add(place.place_id);
            allPlaces.push(place);
          }
        }
      }
    }

    // Step 4 — always run a text search too to catch anything missed
    const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + " in " + query)}&type=lodging&key=${key}`;
    const textRes = await fetch(textUrl);
    const textData = await textRes.json();
    for (const place of (textData.results || [])) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id);
        allPlaces.push(place);
      }
    }

    if (allPlaces.length === 0) {
      return Response.json({ hotels: [], total: 0 });
    }

    // Step 5 — get full details in batches of 10
    const hotels = [];
    for (let i = 0; i < allPlaces.length; i += 10) {
      const batch = allPlaces.slice(i, i + 10);
      const details = await Promise.all(batch.map(p => getPlaceDetails(p.place_id, key)));
      for (let j = 0; j < batch.length; j++) {
        hotels.push(buildHotel(batch[j], details[j], key));
      }
    }

    // Step 6 — sort by rating
    hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    // Save to search cache (fire and forget)
    supabase.from("search_cache").upsert(
      { cache_key: cacheKey, results: hotels, created_at: new Date().toISOString() },
      { onConflict: "cache_key" }
    ).then(() => {});

    return Response.json({ hotels, total: hotels.length });

  } catch (err) {
    console.error("Hotels search error:", err);
    return Response.json({ error: "Search failed: " + err.message }, { status: 500 });
  }
}
