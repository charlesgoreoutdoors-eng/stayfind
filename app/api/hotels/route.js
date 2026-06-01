export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const pageToken = searchParams.get("pageToken") || null;
  const key = process.env.GOOGLE_PLACES_API_KEY;

  if (!query) return Response.json({ error: "Missing query" }, { status: 400 });
  if (!key) return Response.json({ error: "API key not configured" }, { status: 500 });

  try {
    // Use pagetoken if loading more, otherwise fresh search
    let searchUrl;
    if (pageToken) {
      // Google requires a short delay before pagetoken is valid
      await new Promise(r => setTimeout(r, 2000));
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?pagetoken=${encodeURIComponent(pageToken)}&key=${key}`;
    } else {
      searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=lodging&key=${key}`;
    }

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== "OK" && searchData.status !== "ZERO_RESULTS") {
      return Response.json({ error: searchData.status }, { status: 400 });
    }

    const places = searchData.results || [];
    const nextPageToken = searchData.next_page_token || null;

    const hotels = await Promise.all(
      places.map(async (place) => {
        try {
          const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,rating,user_ratings_total,price_level,website,formatted_phone_number,photos,editorial_summary,geometry&key=${key}`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          const d = detailData.result || {};

          let photoUrl = null;
          const photos = d.photos || place.photos;
          if (photos && photos.length > 0) {
            const ref = photos[0].photo_reference;
            photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photo_reference=${ref}&key=${key}`;
          }

          const priceLevelMap = { 0: "Free", 1: "$", 2: "$$", 3: "$$$", 4: "$$$$" };
          const geo = d.geometry?.location || place.geometry?.location;

          return {
            name: d.name || place.name,
            address: d.formatted_address || place.formatted_address,
            rating: d.rating || place.rating || null,
            ratingCount: d.user_ratings_total || place.user_ratings_total || null,
            priceLevel: priceLevelMap[d.price_level] || priceLevelMap[place.price_level] || null,
            website: d.website || null,
            phone: d.formatted_phone_number || null,
            photoUrl,
            description: d.editorial_summary?.overview || null,
            placeId: place.place_id,
            lat: geo?.lat || null,
            lng: geo?.lng || null,
          };
        } catch {
          const geo = place.geometry?.location;
          return {
            name: place.name,
            address: place.formatted_address,
            rating: place.rating || null,
            ratingCount: place.user_ratings_total || null,
            priceLevel: null,
            website: null,
            phone: null,
            photoUrl: null,
            description: null,
            placeId: place.place_id,
            lat: geo?.lat || null,
            lng: geo?.lng || null,
          };
        }
      })
    );

    return Response.json({ hotels, nextPageToken });
  } catch (err) {
    return Response.json({ error: "Search failed" }, { status: 500 });
  }
}
