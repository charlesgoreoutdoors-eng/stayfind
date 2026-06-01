"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const PRICE_RANGES = [
  { label: "Budget",    sub: "Under $100",  value: "budget",   keyword: "budget affordable hotel" },
  { label: "Mid-range", sub: "$100-$250",   value: "midrange", keyword: "hotel" },
  { label: "Upscale",   sub: "$250-$500",   value: "upscale",  keyword: "upscale boutique hotel" },
  { label: "Luxury",    sub: "$500+",        value: "luxury",   keyword: "luxury resort 5 star hotel" },
];

function Stars({ rating }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? "#f59e0b" : "#e2e8f0"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={s.card}>
      <div style={{ height: 190, background: "linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
      <div style={{ padding: "16px 18px" }}>
        {[80,55,100,60].map((w,i) => (
          <div key={i} style={{ height: i===0?18:13, width:`${w}%`, borderRadius:6, marginBottom:10, background:"linear-gradient(90deg,#f1f5f9 25%,#e8edf2 50%,#f1f5f9 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }}/>
        ))}
      </div>
    </div>
  );
}

function HotelCard({ hotel, index, onSelect, selected }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      className="hotel-card fade-up"
      style={{ ...s.card, animationDelay:`${index*0.07}s`, outline: selected ? "2px solid #6366f1" : "none" }}
      onClick={() => onSelect(hotel)}
    >
      <div style={s.imgBox}>
        {hotel.photoUrl && !imgErr ? (
          <img src={hotel.photoUrl} alt={hotel.name} style={s.img} onError={() => setImgErr(true)} />
        ) : (
          <div style={s.imgFallback}><span style={{ fontSize:46 }}>🏨</span></div>
        )}
        <div style={s.imgGradient} />
        {hotel.priceLevel && <span style={s.pricePill}>{hotel.priceLevel}</span>}
      </div>
      <div style={s.cardBody}>
        <h3 style={s.hotelName}>{hotel.name}</h3>
        <p style={s.address}>📍 {hotel.address}</p>
        {hotel.description && <p style={s.desc}>{hotel.description}</p>}
        <div style={s.cardFooter}>
          {hotel.rating && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Stars rating={hotel.rating} />
              <span style={s.ratingText}>{hotel.rating}{hotel.ratingCount ? ` (${hotel.ratingCount.toLocaleString()})` : ""}</span>
            </div>
          )}
          {hotel.phone && <a href={`tel:${hotel.phone}`} style={s.phone}>{hotel.phone}</a>}
        </div>
        {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer" style={s.websiteLink}>Visit website</a>}
      </div>
    </div>
  );
}

function MapView({ hotels, apiKey }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [imgErr, setImgErr] = useState(false);

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || !hotels.length) return;
    const validHotels = hotels.filter(h => h.lat && h.lng);
    if (!validHotels.length) return;
    const center = { lat: validHotels[0].lat, lng: validHotels[0].lng };
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      styles: [
        { featureType:"all", elementType:"geometry", stylers:[{ color:"#f8f7f4" }] },
        { featureType:"water", elementType:"geometry", stylers:[{ color:"#c9d8e8" }] },
        { featureType:"road", elementType:"geometry", stylers:[{ color:"#ffffff" }] },
        { featureType:"poi", elementType:"labels", stylers:[{ visibility:"off" }] },
      ],
      mapTypeControl: false,
      streetViewControl: false,
    });
    mapInstanceRef.current = map;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    const bounds = new window.google.maps.LatLngBounds();
    validHotels.forEach((hotel, i) => {
      bounds.extend({ lat: hotel.lat, lng: hotel.lng });
      const marker = new window.google.maps.Marker({
        position: { lat: hotel.lat, lng: hotel.lng },
        map,
        title: hotel.name,
        label: { text: String(i + 1), color: "#fff", fontSize: "12px", fontWeight: "700" },
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 18,
          fillColor: "#6366f1",
          fillOpacity: 1,
          strokeColor: "#fff",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        setSelectedHotel(hotel);
        setImgErr(false);
        map.panTo({ lat: hotel.lat, lng: hotel.lng });
      });
      markersRef.current.push(marker);
    });
    map.fitBounds(bounds);
  }, [hotels]);

  useEffect(() => {
    if (window.google) {
      initMap();
    } else {
      const scriptId = "google-maps-script";
      const existing = document.getElementById(scriptId);
      if (existing) { existing.addEventListener("load", initMap); }
      else {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.onload = initMap;
        document.head.appendChild(script);
      }
    }
  }, [initMap, apiKey]);

  return (
    <div style={s.mapWrap}>
      <div ref={mapRef} style={s.mapEl} />
      <div style={s.mapSidebar}>
        <p style={s.sidebarTitle}>Hotels</p>
        {hotels.filter(h => h.lat && h.lng).map((hotel, i) => (
          <div
            key={hotel.placeId || i}
            style={{
              ...s.sidebarItem,
              background: selectedHotel?.placeId === hotel.placeId ? "#eef2ff" : "#fff",
              borderColor: selectedHotel?.placeId === hotel.placeId ? "#6366f1" : "#e2e8f0",
            }}
            onClick={() => {
              setSelectedHotel(hotel);
              setImgErr(false);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.panTo({ lat: hotel.lat, lng: hotel.lng });
                mapInstanceRef.current.setZoom(15);
              }
            }}
          >
            <div style={s.sidebarNum}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.sidebarName}>{hotel.name}</p>
              {hotel.rating && (
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                  <Stars rating={hotel.rating} />
                  <span style={{ fontSize:10, color:"#94a3b8" }}>{hotel.rating}</span>
                </div>
              )}
            </div>
            {hotel.priceLevel && <span style={s.sidebarPrice}>{hotel.priceLevel}</span>}
          </div>
        ))}
      </div>
      {selectedHotel && (
        <div style={s.mapPopup}>
          <button style={s.popupClose} onClick={() => setSelectedHotel(null)}>X</button>
          {selectedHotel.photoUrl && !imgErr && (
            <img src={selectedHotel.photoUrl} alt={selectedHotel.name} style={s.popupImg} onError={() => setImgErr(true)} />
          )}
          <div style={s.popupBody}>
            <h3 style={s.popupName}>{selectedHotel.name}</h3>
            <p style={s.popupAddr}>📍 {selectedHotel.address}</p>
            {selectedHotel.rating && (
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
                <Stars rating={selectedHotel.rating} />
                <span style={{ fontSize:12, color:"#64748b" }}>{selectedHotel.rating}</span>
              </div>
            )}
            {selectedHotel.website && (
              <a href={selectedHotel.website} target="_blank" rel="noreferrer" style={s.popupLink}>Visit website</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [location, setLocation]           = useState("");
  const [price, setPrice]                 = useState("midrange");
  const [hotels, setHotels]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [searched, setSearched]           = useState(false);
  const [searchLabel, setSearchLabel]     = useState("");
  const [view, setView]                   = useState("list");
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore]     = useState(false);

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  useEffect(() => {
    if (!apiKey) return;
    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) { initAutocomplete(); return; }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, []);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, { types: ["(cities)"] });
    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current.getPlace();
      setLocation(place.formatted_address || place.name || "");
    });
  }, []);

  const search = async () => {
    if (!location.trim()) return;
    setLoading(true);
    setError("");
    setHotels([]);
    setSearched(true);
    setSelectedHotel(null);
    setNextPageToken(null);
    const priceObj = PRICE_RANGES.find(p => p.value === price);
    const query = `${priceObj.keyword} in ${location}`;
    setSearchLabel(`${priceObj.label} hotels in ${location}`);
    try {
      const res = await fetch(`/api/hotels?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHotels(data.hotels || []);
      setNextPageToken(data.nextPageToken || null);
    } catch {
      setError("Could not find hotels. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    const priceObj = PRICE_RANGES.find(p => p.value === price);
    const query = `${priceObj.keyword} in ${location}`;
    try {
      const res = await fetch(`/api/hotels?query=${encodeURIComponent(query)}&pageToken=${encodeURIComponent(nextPageToken)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHotels(prev => [...prev, ...(data.hotels || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch {
      setError("Could not load more hotels. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main>
      <div style={s.header}>
        <div style={s.logoRow}>
          <span style={s.logoMark}>SF</span>
          <span style={s.logoText}>StayFind</span>
        </div>
        <h1 style={s.headline}>Find Your Perfect<br /><em style={s.headlineAccent}>Hotel Partner</em></h1>
        <p style={s.tagline}>Search hotels by location and budget to kickstart your content outreach</p>
      </div>

      <div style={s.searchCard}>
        <label style={s.fieldLabel}>Location</label>
        <div style={s.inputRow}>
          <input
            ref={inputRef}
            style={s.input}
            placeholder="e.g. Malibu, Miami Beach, Santorini"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
          />
        </div>
        <label style={{ ...s.fieldLabel, marginTop:20 }}>Price Range</label>
        <div style={s.priceGrid}>
          {PRICE_RANGES.map(p => (
            <button key={p.value}
              style={{ ...s.priceBtn, ...(price===p.value ? s.priceBtnActive : {}) }}
              onClick={() => setPrice(p.value)}>
              <span style={s.priceBtnLabel}>{p.label}</span>
              <span style={s.priceBtnSub}>{p.sub}</span>
            </button>
          ))}
        </div>
        <button
          style={{ ...s.searchBtn, opacity: location.trim() && !loading ? 1 : 0.45 }}
          onClick={search}
          disabled={!location.trim() || loading}
        >
          {loading
            ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={s.spinner} />Searching...</span>
            : "Search Hotels"}
        </button>
        {error && <div style={s.errorBox}>{error}</div>}
      </div>

      <div style={s.resultsWrap}>
        {loading && (
          <div style={s.grid}>
            {[...Array(12)].map((_,i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && searched && hotels.length > 0 && (
          <>
            <div style={s.resultsBar}>
              <div>
                <h2 style={s.resultsTitle}>{hotels.length} Hotels Found</h2>
                <p style={s.resultsSub}>{searchLabel}</p>
              </div>
              <div style={s.viewToggle}>
                <button
                  style={{ ...s.toggleBtn, ...(view==="list" ? s.toggleBtnActive : {}) }}
                  onClick={() => setView("list")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                  </svg>
                  List
                </button>
                <button
                  style={{ ...s.toggleBtn, ...(view==="map" ? s.toggleBtnActive : {}) }}
                  onClick={() => setView("map")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  Map
                </button>
              </div>
            </div>

            {view === "list" && (
              <div style={s.grid}>
                {hotels.map((hotel,i) => (
                  <HotelCard key={hotel.placeId||i} hotel={hotel} index={i}
                    onSelect={setSelectedHotel}
                    selected={selectedHotel?.placeId === hotel.placeId} />
                ))}
              </div>
            )}

            {view === "list" && nextPageToken && (
              <div style={{ textAlign:"center", marginTop:36 }}>
                <button
                  style={{ ...s.loadMoreBtn, opacity: loadingMore ? 0.6 : 1 }}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore
                    ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={s.spinner} />Loading more...</span>
                    : "Load More Hotels"}
                </button>
                <p style={{ fontSize:12, color:"#94a3b8", marginTop:10 }}>Showing {hotels.length} hotels so far</p>
              </div>
            )}

            {view === "map" && (
              <MapView hotels={hotels} apiKey={apiKey} />
            )}
          </>
        )}

        {!loading && searched && hotels.length === 0 && !error && (
          <div style={s.emptyState}>
            <span style={{ fontSize:40 }}>🔍</span>
            <p style={s.emptyText}>No hotels found. Try a different location or price range.</p>
          </div>
        )}

        {!searched && !loading && (
          <div style={s.emptyState}>
            <span style={{ fontSize:40 }}>🏨</span>
            <p style={s.emptyText}>Enter a location above to discover hotels</p>
          </div>
        )}
      </div>
    </main>
  );
}

const s = {
  header: { background:"#0f0e17", padding:"44px 24px 68px", textAlign:"center" },
  logoRow: { display:"flex", alignItems:"center", justifyContent:"center", gap:8, marginBottom:24 },
  logoMark: { fontSize:14, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,0.15)", padding:"4px 8px", borderRadius:6 },
  logoText: { fontFamily:"Georgia, serif", fontSize:17, color:"#e2e8f0", letterSpacing:"0.5px" },
  headline: { fontFamily:"Georgia, serif", fontSize:"clamp(30px,6vw,50px)", color:"#f1f5f9", fontWeight:700, lineHeight:1.18, marginBottom:14 },
  headlineAccent: { color:"#a78bfa", fontStyle:"italic" },
  tagline: { color:"#94a3b8", fontSize:14, fontWeight:300, maxWidth:360, margin:"0 auto", lineHeight:1.65 },
  searchCard: { background:"#fff", borderRadius:20, padding:"28px 24px 24px", boxShadow:"0 8px 40px rgba(0,0,0,0.11)", maxWidth:640, width:"calc(100% - 32px)", margin:"-34px auto 0", position:"relative", zIndex:10 },
  fieldLabel: { display:"block", fontSize:11, fontWeight:600, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 },
  inputRow: { display:"flex", alignItems:"center", gap:10, border:"1.5px solid #e2e8f0", borderRadius:12, padding:"13px 16px", marginBottom:4 },
  input: { flex:1, border:"none", outline:"none", fontSize:15, fontFamily:"system-ui,sans-serif", color:"#1e293b", background:"transparent", width:"100%" },
  priceGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 },
  priceBtn: { display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 4px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontFamily:"system-ui,sans-serif", transition:"all 0.15s" },
  priceBtnActive: { border:"1.5px solid #6366f1", background:"#eef2ff" },
  priceBtnLabel: { fontSize:12, fontWeight:600, color:"#1e293b", marginBottom:2 },
  priceBtnSub: { fontSize:10, color:"#94a3b8", textAlign:"center" },
  searchBtn: { width:"100%", padding:15, background:"#0f0e17", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif", transition:"opacity 0.2s" },
  loadMoreBtn: { padding:"14px 40px", background:"#0f0e17", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif", transition:"opacity 0.2s" },
  spinner: { display:"inline-block", width:16, height:16, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  errorBox: { marginTop:14, padding:"13px 16px", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, color:"#dc2626", fontSize:13 },
  resultsWrap: { maxWidth:980, margin:"40px auto 80px", padding:"0 16px" },
  resultsBar: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:12 },
  resultsTitle: { fontFamily:"Georgia, serif", fontSize:24, fontWeight:700, color:"#0f0e17" },
  resultsSub: { fontSize:13, color:"#94a3b8", marginTop:3 },
  viewToggle: { display:"flex", background:"#f1f5f9", borderRadius:10, padding:3, gap:3 },
  toggleBtn: { display:"flex", alignItems:"center", gap:6, padding:"8px 14px", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"system-ui,sans-serif", color:"#64748b", background:"transparent", transition:"all 0.15s" },
  toggleBtnActive: { background:"#fff", color:"#0f0e17", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:20 },
  card: { background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 14px rgba(0,0,0,0.07)", cursor:"pointer" },
  imgBox: { position:"relative", height:190, background:"#e2e8f0", overflow:"hidden" },
  img: { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  imgFallback: { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#e0e7ff 0%,#f0fdf4 100%)" },
  imgGradient: { position:"absolute", bottom:0, left:0, right:0, height:60, background:"linear-gradient(transparent,rgba(0,0,0,0.25))", pointerEvents:"none" },
  pricePill: { position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.58)", color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, letterSpacing:"0.5px" },
  cardBody: { padding:"16px 18px 18px" },
  hotelName: { fontFamily:"Georgia, serif", fontSize:17, fontWeight:700, color:"#0f0e17", marginBottom:5, lineHeight:1.25 },
  address: { fontSize:12, color:"#94a3b8", marginBottom:8, lineHeight:1.4 },
  desc: { fontSize:12, color:"#64748b", lineHeight:1.6, marginBottom:12 },
  cardFooter: { display:"flex", flexDirection:"column", gap:5, paddingTop:12, borderTop:"1px solid #f1f5f9" },
  ratingText: { fontSize:11, color:"#94a3b8", marginLeft:2 },
  phone: { fontSize:12, color:"#6366f1", fontWeight:500, textDecoration:"none" },
  websiteLink: { display:"inline-block", marginTop:10, fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" },
  emptyState: { textAlign:"center", padding:"80px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 },
  emptyText: { color:"#94a3b8", fontSize:15, maxWidth:300, lineHeight:1.6 },
  mapWrap: { position:"relative", height:580, borderRadius:16, overflow:"hidden", boxShadow:"0 2px 14px rgba(0,0,0,0.07)" },
  mapEl: { width:"100%", height:"100%" },
  mapSidebar: { position:"absolute", top:12, right:12, width:220, background:"#fff", borderRadius:14, boxShadow:"0 4px 20px rgba(0,0,0,0.12)", padding:"12px 10px", maxHeight:"calc(100% - 24px)", overflowY:"auto", zIndex:10 },
  sidebarTitle: { fontSize:11, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8, paddingLeft:4 },
  sidebarItem: { display:"flex", alignItems:"center", gap:8, padding:"9px 8px", borderRadius:10, border:"1.5px solid #e2e8f0", marginBottom:6, cursor:"pointer", transition:"all 0.15s" },
  sidebarNum: { width:24, height:24, borderRadius:"50%", background:"#6366f1", color:"#fff", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 },
  sidebarName: { fontSize:12, fontWeight:600, color:"#1e293b", lineHeight:1.3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  sidebarPrice: { fontSize:11, color:"#6366f1", fontWeight:700, flexShrink:0 },
  mapPopup: { position:"absolute", bottom:16, left:16, width:260, background:"#fff", borderRadius:16, boxShadow:"0 8px 32px rgba(0,0,0,0.18)", overflow:"hidden", zIndex:20 },
  popupClose: { position:"absolute", top:8, right:8, background:"rgba(0,0,0,0.45)", border:"none", color:"#fff", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 },
  popupImg: { width:"100%", height:130, objectFit:"cover", display:"block" },
  popupBody: { padding:"12px 14px 14px" },
  popupName: { fontFamily:"Georgia, serif", fontSize:15, fontWeight:700, color:"#0f0e17", marginBottom:4 },
  popupAddr: { fontSize:11, color:"#94a3b8", lineHeight:1.4 },
  popupLink: { display:"inline-block", marginTop:8, fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" },
};
