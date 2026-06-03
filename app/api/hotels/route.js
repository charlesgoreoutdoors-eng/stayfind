const PRICE_LEVEL_MAP = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };

// Get city centre + rough radius using Geocoding API
async function geocodeCity(query, key) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== "OK" || !data.results[0]) return null;

  const result = data.results[0];
  const loc = result.geometry.location;
  const viewport = result.geometry.viewport;

  // Calculate radius from viewport
  const latDiff = Math.abs(viewport.northeast.lat - viewport.southwest.lat);
  const lngDiff = Math.abs(viewport.northeast.lng - viewport.southwest.lng);
  const radiusMetres = Math.min(
    Math.max(latDiff * 111000 / 2, lngDiff * 111000 / 2),
    25000 // cap at 25km
  );

  return { lat: loc.lat, lng: loc.lng, radius: radiusMetres, viewport };
}

// Generate a grid of search points covering the city bounds
function generateGridPoints(viewport, targetRadius) {
  const points = [];
  const { northeast, southwest } = viewport;

  // Step size based on radius - overlap slightly for full coverage
  const stepLat = (targetRadius / 111000) * 1.5;
  const stepLng = stepLat / Math.cos((northeast.lat * Math.PI) / 180);

  for (let lat = southwest.lat; lat <= northeast.lat + stepLat; lat += stepLat) {
    for (let lng = southwest.lng; lng <= northeast.lng + stepLng; lng += stepLng) {
      points.push({ lat: Math.min(lat, 90), lng: Math.min(lng, 180) });
    }
  }

  // Cap at 12 grid points to avoid excessive API calls
  return points.slice(0, 12);
}

// Search for hotels at a single lat/lng point
async function searchAtPoint(lat, lng, radius, keyword, key) {
  const searchRadius = Math.min(radius, 5000); // max 5km per point
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${searchRadius}&type=lodging&keyword=${encodeURIComponent(keyword)}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

// Get full details for a place
async function getPlaceDetails(placeId, key) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,price_level,website,formatted_phone_number,photos,editorial_summary,geometry&key=${key}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.result || null;
  } catch {
    return null;
  }
}

function buildHotel(place, details) {
  const d = details || {};
  const geo = d.geometry?.location || place.geometry?.location;
  const photos = d.photos || place.photos;
  let photoUrl = null;
  if (photos && photos.length > 0) {
    photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${photos[0].photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`;
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
  const query = searchParams.get("query");
  const keyword = searchParams.get("keyword") || "hotel";
  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!query) return Response.json({ error: "Missing query" }, { status: 400 });
  if (!key)   return Response.json({ error: "API key not configured" }, { status: 500 });

  try {
    // 1. Geocode the city
    const cityData = await geocodeCity(query, key);
    if (!cityData) {
      return Response.json({ error: "Could not find that location" }, { status: 400 });
    }

    const { lat, lng, radius, viewport } = cityData;

    // 2. Generate grid points
    const gridRadius = Math.min(radius / 3, 5000);
    const points = generateGridPoints(viewport, gridRadius);

    // 3. Search all grid points in parallel (batches of 4)
    const allPlaces = [];
    const seen = new Set();

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

    // 4. Also run the original text search for good measure
    const textUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword + " in " + query)}&type=lodging&key=${key}`;
    const textRes = await fetch(textUrl);
    const textData = await textRes.json();
    for (const place of (textData.results || [])) {
      if (!seen.has(place.place_id)) {
        seen.add(place.place_id);
        allPlaces.push(place);
      }
    }

    // 5. Get details for all places in parallel (batches of 10)
    const hotels = [];
    for (let i = 0; i < allPlaces.length; i += 10) {
      const batch = allPlaces.slice(i, i + 10);
      const details = await Promise.all(
        batch.map(p => getPlaceDetails(p.place_id, key))
      );
      for (let j = 0; j < batch.length; j++) {
        hotels.push(buildHotel(batch[j], details[j]));
      }
    }

    // 6. Sort by rating (best first)
    hotels.sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return Response.json({
      hotels,
      total: hotels.length,
      gridPoints: points.length,
    });

  } catch (err) {
    console.error("Hotels search error:", err);
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
