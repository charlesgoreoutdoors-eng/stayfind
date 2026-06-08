"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useGmail } from "../lib/useGmail";
import GmailButton from "../components/GmailButton";

const PRICE_RANGES = [
  { label: "Budget",    sub: "Under $100", value: "budget",   keyword: "budget affordable hotel" },
  { label: "Mid-range", sub: "$100-$250",  value: "midrange", keyword: "hotel" },
  { label: "Upscale",   sub: "$250-$500",  value: "upscale",  keyword: "upscale boutique hotel" },
  { label: "Luxury",    sub: "$500+",       value: "luxury",   keyword: "luxury resort 5 star hotel" },
];

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email";

function Stars({ rating }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:3 }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#E85D3D" : "#DDD5CC"}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={s.card}>
      <div style={{ height:200, background:"linear-gradient(90deg,#EDE8E3 25%,#E2DBD5 50%,#EDE8E3 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite", borderRadius:"14px 14px 0 0" }} />
      <div style={{ padding:"16px 18px" }}>
        {[75,50,90,55].map((w,i) => (
          <div key={i} style={{ height:i===0?16:12, width:`${w}%`, borderRadius:6, marginBottom:10, background:"linear-gradient(90deg,#EDE8E3 25%,#E2DBD5 50%,#EDE8E3 75%)", backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite" }}/>
        ))}
      </div>
    </div>
  );
}

function AddToListDropdown({ hotel, lists, onAdd, onCreateAndAdd, onClose }) {
  const [newListName, setNewListName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} style={dd.wrap}>
      <div style={dd.header}>
        <span style={dd.title}>Add to List</span>
        <button style={dd.close} onClick={onClose}>x</button>
      </div>
      {lists.length === 0 && !showNew && <p style={dd.empty}>No lists yet</p>}
      <div style={{ maxHeight:130, overflowY:"auto" }}>
        {lists.map(l => (
          <button key={l.id} style={dd.item} onClick={() => onAdd(hotel, l.id)}>{l.name}</button>
        ))}
      </div>
      {!showNew
        ? <button style={dd.newBtn} onClick={() => setShowNew(true)}>+ Create new list</button>
        : (
          <div style={dd.newForm}>
            <input style={dd.newInput} placeholder="List name" autoFocus value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && newListName.trim() && onCreateAndAdd(hotel, newListName.trim())} />
            <button style={dd.createBtn} onClick={() => newListName.trim() && onCreateAndAdd(hotel, newListName.trim())}>Create</button>
          </div>
        )}
    </div>
  );
}

const dd = {
  wrap: { position:"absolute", bottom:"calc(100% + 6px)", left:0, right:0, background:"#fff", borderRadius:12, border:"1px solid #DDD5CC", boxShadow:"0 8px 28px rgba(15,37,68,0.14)", padding:"12px", zIndex:200 },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
  title: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" },
  close: { background:"none", border:"none", cursor:"pointer", color:"#9FB3C8", fontSize:14, fontWeight:700 },
  empty: { fontSize:12, color:"#9FB3C8", padding:"4px 0 8px" },
  item: { display:"block", width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8, border:"none", background:"none", cursor:"pointer", fontSize:13, color:"#1E3A5F", fontFamily:"inherit", marginBottom:2 },
  newBtn: { display:"block", width:"100%", textAlign:"left", padding:"8px 10px", borderRadius:8, border:"1.5px dashed #F5A882", background:"none", cursor:"pointer", fontSize:12, color:"#E85D3D", fontFamily:"inherit", marginTop:6, fontWeight:600 },
  newForm: { display:"flex", gap:6, marginTop:8 },
  newInput: { flex:1, border:"1.5px solid #DDD5CC", borderRadius:7, padding:"7px 10px", fontSize:12, fontFamily:"inherit", outline:"none", color:"#1E3A5F" },
  createBtn: { background:"#E85D3D", color:"#fff", border:"none", borderRadius:7, padding:"7px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
};

function HotelCard({ hotel, lists, onAddToList, onCreateAndAdd, showDropdown, onToggleDropdown, addSuccess }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="hotel-card fade-up" style={{ ...s.card, position:"relative" }}>
      <div style={s.imgBox}>
        {hotel.photoUrl && !imgErr
          ? <img src={hotel.photoUrl} alt={hotel.name} style={s.img} onError={() => setImgErr(true)} />
          : <div style={s.imgFallback}><span style={{ fontSize:44 }}>🏨</span></div>}
        <div style={s.imgGradient} />
        {hotel.priceLevel && <span style={s.pricePill}>{hotel.priceLevel}</span>}
      </div>

      <div style={s.cardBody}>
        <h3 style={s.hotelName}>{hotel.name}</h3>
        <p style={s.address}>{hotel.address}</p>
        {hotel.description && <p style={s.desc}>{hotel.description}</p>}

        <div style={s.cardFooter}>
          {hotel.rating && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Stars rating={hotel.rating} />
              <span style={s.ratingText}>{hotel.rating}{hotel.ratingCount ? ` (${hotel.ratingCount.toLocaleString()})` : ""}</span>
            </div>
          )}
        </div>
        {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer" style={s.websiteLink}>Visit website</a>}
        {hotel.instagram && (
          <a href={`https://www.instagram.com/${hotel.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={s.igLink}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
            </svg>
            {hotel.instagram}
          </a>
        )}

        <div style={{ position:"relative", marginTop:10 }}>
          <button
            style={{ ...s.addToListBtn, ...(addSuccess ? s.addToListBtnSuccess : {}) }}
            onClick={e => { e.stopPropagation(); onToggleDropdown(hotel.placeId); }}
          >
            {addSuccess ? "Added to list!" : "+ Add to List"}
          </button>
          {showDropdown && (
            <AddToListDropdown hotel={hotel} lists={lists} onAdd={onAddToList} onCreateAndAdd={onCreateAndAdd} onClose={() => onToggleDropdown(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

const MapView = memo(function MapView({ hotels, apiKey, lists, onAddToList, onCreateAndAdd }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const hotelsRef = useRef(hotels);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [imgErr, setImgErr] = useState(false);
  const [mapDropdown, setMapDropdown] = useState(false);
  const [mapAddSuccess, setMapAddSuccess] = useState(false);

  const handleMapAdd = async (hotel, listId) => {
    await onAddToList(hotel, listId);
    setMapDropdown(false);
    setMapAddSuccess(true);
    setTimeout(() => setMapAddSuccess(false), 2500);
  };
  const handleMapCreate = async (hotel, name) => {
    await onCreateAndAdd(hotel, name);
    setMapDropdown(false);
    setMapAddSuccess(true);
    setTimeout(() => setMapAddSuccess(false), 2500);
  };

  // Keep hotels ref up to date without triggering map reinit
  useEffect(() => { hotelsRef.current = hotels; }, [hotels]);

  const boundsSetRef = useRef(false);

  const updateMarkers = useCallback((map, hotelList, fitBounds = false) => {
    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    const validHotels = hotelList.filter(h => h.lat && h.lng);
    if (!validHotels.length) return;
    const bounds = new window.google.maps.LatLngBounds();
    validHotels.forEach((hotel, i) => {
      bounds.extend({ lat: hotel.lat, lng: hotel.lng });
      const marker = new window.google.maps.Marker({
        position: { lat: hotel.lat, lng: hotel.lng }, map,
        label: { text: String(i + 1), color: "#fff", fontSize: "12px", fontWeight: "700" },
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 18, fillColor: "#E85D3D", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2.5 },
      });
      marker.addListener("click", () => {
        setSelectedHotel(hotel); setImgErr(false); setMapDropdown(false);
        map.panTo({ lat: hotel.lat, lng: hotel.lng });
      });
      markersRef.current.push(marker);
    });
    // Only fitBounds on initial load, never after
    if (fitBounds && !boundsSetRef.current) {
      map.fitBounds(bounds);
      boundsSetRef.current = true;
    }
  }, []);

  // Init map ONCE only
  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google || mapInstanceRef.current) return;
    const validHotels = hotelsRef.current.filter(h => h.lat && h.lng);
    if (!validHotels.length) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: validHotels[0].lat, lng: validHotels[0].lng },
      zoom: 13,
      styles: [
        { featureType:"all", elementType:"geometry", stylers:[{ color:"#F7F3EF" }] },
        { featureType:"water", elementType:"geometry", stylers:[{ color:"#B8D4E8" }] },
        { featureType:"road", elementType:"geometry", stylers:[{ color:"#FFFFFF" }] },
        { featureType:"road.arterial", elementType:"geometry", stylers:[{ color:"#F0EBE5" }] },
        { featureType:"poi", elementType:"labels", stylers:[{ visibility:"off" }] },
        { featureType:"poi.park", elementType:"geometry", stylers:[{ color:"#D4E8D4" }] },
      ],
      mapTypeControl:false, streetViewControl:false, zoomControl:true,
      scrollwheel:true, gestureHandling:"greedy",
    });
    mapInstanceRef.current = map;
    updateMarkers(map, hotelsRef.current, true);
  }, [updateMarkers]);

  // Update markers when hotels change WITHOUT recreating the map or resetting zoom
  // Track previous hotel count to detect a fresh search vs incremental updates
  const prevHotelCountRef = useRef(0);
  useEffect(() => {
    if (mapInstanceRef.current) {
      const isFirstLoad = prevHotelCountRef.current === 0 && hotels.length > 0;
      if (isFirstLoad) boundsSetRef.current = false; // allow fitBounds for fresh results
      updateMarkers(mapInstanceRef.current, hotels, isFirstLoad);
      prevHotelCountRef.current = hotels.length;
    }
  }, [hotels, updateMarkers]);

  // Load Google Maps script once
  useEffect(() => {
    if (window.google) { initMap(); return; }
    const scriptId = "google-maps-script";
    const existing = document.getElementById(scriptId);
    if (existing) {
      existing.addEventListener("load", initMap);
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = initMap;
    document.head.appendChild(script);
  }, []); // empty deps - only runs once

  return (
    <div style={s.mapWrap}>
      <div ref={mapRef} style={s.mapEl} />
      {selectedHotel && (
        <div style={s.mapPopup}>
          <button style={s.popupClose} onClick={() => setSelectedHotel(null)}>x</button>
          {selectedHotel.photoUrl && !imgErr && <img src={selectedHotel.photoUrl} alt={selectedHotel.name} style={s.popupImg} onError={() => setImgErr(true)} />}
          <div style={s.popupBody}>
            <h3 style={s.popupName}>{selectedHotel.name}</h3>
            <p style={s.popupAddr}>{selectedHotel.address}</p>
            {selectedHotel.website && <a href={selectedHotel.website} target="_blank" rel="noreferrer" style={s.popupLink}>Visit website</a>}
            <div style={{ position:"relative", marginTop:10 }}>
              <button
                style={{ ...s.addToListBtn, ...(mapAddSuccess ? s.addToListBtnSuccess : {}), width:"100%" }}
                onClick={() => setMapDropdown(v => !v)}
              >
                {mapAddSuccess ? "Added to list!" : "+ Add to List"}
              </button>
              {mapDropdown && (
                <AddToListDropdown hotel={selectedHotel} lists={lists} onAdd={handleMapAdd} onCreateAndAdd={handleMapCreate} onClose={() => setMapDropdown(false)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if hotel placeIds change (new search) not when emails load
  const prevIds = prevProps.hotels.map(h => h.placeId).join(",");
  const nextIds = nextProps.hotels.map(h => h.placeId).join(",");
  return prevIds === nextIds && prevProps.apiKey === nextProps.apiKey;
});

export default function Home() {
  const [location, setLocation]           = useState("");
  const [price, setPrice]                 = useState("midrange");
  const [hotels, setHotels]               = useState([]);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState("");
  const [searched, setSearched]           = useState(false);
  const [searchLabel, setSearchLabel]     = useState("");
  const [view, setView]                   = useState("list");
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [selectedIds, setSelectedIds]     = useState([]);
  const [lists, setLists]                 = useState([]);
  const [addListDropdown, setAddListDropdown] = useState(null);
  const [addSuccess, setAddSuccess]       = useState(null);

  const inputRef = useRef(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const { user } = useAuth();
  const { gmailToken, gmailEmail, gmailLoading, tokenExpired, connectGmail, disconnectGmail } = useGmail();

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    if (!user) return;
    const { data } = await supabase.from("lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLists(data || []);
  };

  const addToList = useCallback(async (hotel, listId) => {
    await supabase.from("list_hotels").insert({
      user_id: user?.id,
      list_id: listId, name: hotel.name, address: hotel.address || null,
      email: hotel.email || null, phone: hotel.phone || null, website: hotel.website || null,
      photo_url: hotel.photoUrl || null, rating: hotel.rating || null,
      price_level: hotel.priceLevel || null, place_id: hotel.placeId || null,
      instagram: hotel.instagram || null,
    });
    setAddListDropdown(null);
    setAddSuccess(hotel.placeId);
    setTimeout(() => setAddSuccess(null), 2500);
  }, [user]);

  const createListAndAdd = useCallback(async (hotel, name) => {
    const { data } = await supabase.from("lists").insert({ name, user_id: user?.id }).select().single();
    if (data) { setLists(prev => [data, ...prev]); await addToList(hotel, data.id); }
  }, [user, addToList]);

  useEffect(() => {
    if (!apiKey) return;
    const scriptId = "google-maps-script";
    if (document.getElementById(scriptId)) { initAutocomplete(); return; }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true; script.onload = initAutocomplete;
    document.head.appendChild(script);
  }, []);

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google) return;
    const ac = new window.google.maps.places.Autocomplete(inputRef.current, { types: ["(cities)"] });
    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      setLocation(place.formatted_address || place.name || "");
    });
  }, []);


  const search = async () => {
    if (!location.trim()) return;
    setLoading(true); setError(""); setHotels([]); setSearched(true); setSelectedIds([]); setNextPageToken(null);
    const priceObj = PRICE_RANGES.find(p => p.value === price);
    setSearchLabel(`${priceObj.label} hotels in ${location}`);
    try {
      const res = await fetch(`/api/hotels?query=${encodeURIComponent(location)}&keyword=${encodeURIComponent(priceObj.keyword)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const hotelList = (data.hotels || []).map(h => ({ ...h, emailStatus: null, email: null }));
      setHotels(hotelList);
      setNextPageToken(null);
      findContacts(hotelList);
    } catch { setError("Could not find hotels. Please try again."); }
    finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    const priceObj = PRICE_RANGES.find(p => p.value === price);
    try {
      const res = await fetch(`/api/hotels?query=${encodeURIComponent(priceObj.keyword + " in " + location)}&pageToken=${encodeURIComponent(nextPageToken)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const newHotels = (data.hotels || []).map(h => ({ ...h, emailStatus: null, email: null }));
      setHotels(prev => [...prev, ...newHotels]);
      setNextPageToken(data.nextPageToken || null);
      findContacts(newHotels);
    } catch { setError("Could not load more."); }
    finally { setLoadingMore(false); }
  };

  const findContacts = async (hotelList) => {
    const withSite = hotelList.filter(h => h.website);
    // Mark all as finding in one update
    setHotels(prev => prev.map(h =>
      withSite.find(w => w.placeId === h.placeId)
        ? { ...h, emailStatus: "finding" }
        : h.emailStatus ? h : { ...h, emailStatus: "notfound" }
    ));

    // Fetch all contacts, then update hotels in ONE batch at the end
    const results = {};
    for (let i = 0; i < withSite.length; i += 5) {
      await Promise.all(withSite.slice(i, i + 5).map(async hotel => {
        try {
          const res = await fetch(`/api/find-contact?website=${encodeURIComponent(hotel.website)}&name=${encodeURIComponent(hotel.name)}`);
          const data = await res.json();
          results[hotel.placeId] = { email: data.email || null, instagram: data.instagram || null, emailStatus: data.email ? "found" : "notfound" };
        } catch {
          results[hotel.placeId] = { emailStatus: "notfound" };
        }
      }));
    }

    // Single state update with all results — no jitter
    setHotels(prev => prev.map(h =>
      results[h.placeId] ? { ...h, ...results[h.placeId] } : h
    ));
  };

  const toggleSelect = (hotel) => setSelectedIds(prev => prev.includes(hotel.placeId) ? prev.filter(id => id !== hotel.placeId) : [...prev, hotel.placeId]);

  return (
    <main>
      <div style={s.header}>
        <div style={s.headerInner}>
          <div>
            <h1 style={s.headline}>Find Your Perfect <em style={s.headlineAccent}>Hotel Partner</em></h1>
            <p style={s.tagline}>Search hotels by location and budget to start your outreach</p>
          </div>
          <GmailButton gmailToken={gmailToken} gmailEmail={gmailEmail} gmailLoading={gmailLoading} tokenExpired={tokenExpired} onConnect={connectGmail} onDisconnect={disconnectGmail} />
        </div>
      </div>

      <div style={s.searchCard}>
        <label style={s.fieldLabel}>Location</label>
        <div style={s.inputRow}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9FB3C8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} style={s.input} placeholder="e.g. Malibu, Miami Beach, Santorini"
            value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
        </div>
        <label style={{ ...s.fieldLabel, marginTop:20 }}>Price Range</label>
        <div style={s.priceGrid}>
          {PRICE_RANGES.map(p => (
            <button key={p.value} style={{ ...s.priceBtn, ...(price===p.value ? s.priceBtnActive : {}) }} onClick={() => setPrice(p.value)}>
              <span style={s.priceBtnLabel}>{p.label}</span>
              <span style={s.priceBtnSub}>{p.sub}</span>
            </button>
          ))}
        </div>
        <button style={{ ...s.searchBtn, opacity: location.trim() && !loading ? 1 : 0.5 }} onClick={search} disabled={!location.trim() || loading}>
          {loading ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={s.spinner} />Searching...</span> : "Search Hotels"}
        </button>
        {error && <div style={s.errorBox}>{error}</div>}
      </div>

      <div style={s.resultsWrap}>
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 24px" }}>
            <div style={{ width:40, height:40, border:"3px solid #DDD5CC", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 20px" }} />
            <p style={{ fontSize:15, fontWeight:600, color:"#0F2544", marginBottom:6 }}>Searching across the area...</p>
            <p style={{ fontSize:13, color:"#9FB3C8" }}>This may take a few seconds — we search multiple zones to find every hotel</p>
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
                <button style={{ ...s.toggleBtn, ...(view==="list" ? s.toggleActive : {}) }} onClick={() => setView("list")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  List
                </button>
                <button style={{ ...s.toggleBtn, ...(view==="map" ? s.toggleActive : {}) }} onClick={() => setView("map")}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                  Map
                </button>
              </div>
            </div>

            {view === "list" && (
              <div style={s.grid}>
                {hotels.map((hotel, i) => (
                  <HotelCard key={hotel.placeId || i} hotel={hotel}
                    lists={lists} onAddToList={addToList} onCreateAndAdd={createListAndAdd}
                    showDropdown={addListDropdown === hotel.placeId}
                    onToggleDropdown={(id) => setAddListDropdown(prev => prev === id ? null : id)}
                    addSuccess={addSuccess === hotel.placeId} />
                ))}
              </div>
            )}



            {view === "map" && <MapView hotels={hotels} apiKey={apiKey} lists={lists} onAddToList={addToList} onCreateAndAdd={createListAndAdd} />}
          </>
        )}

        {!loading && searched && hotels.length === 0 && !error && (
          <div style={s.emptyState}><span style={{ fontSize:40 }}>🔍</span><p style={s.emptyText}>No hotels found. Try a different location.</p></div>
        )}
        {!searched && !loading && (
          <div style={s.emptyState}><span style={{ fontSize:40 }}>🏨</span><p style={s.emptyText}>Enter a location above to discover hotels</p></div>
        )}
      </div>
    </main>
  );
}

const s = {
  header: { background:"#0F2544", padding:"28px 24px 64px" },
  headerInner: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", maxWidth:980, margin:"0 auto", gap:16, flexWrap:"wrap" },
  headline: { fontSize:"clamp(22px,4vw,36px)", fontWeight:700, color:"#F7F3EF", lineHeight:1.2, marginBottom:6, letterSpacing:"-0.5px" },
  headlineAccent: { color:"#F5A882", fontStyle:"italic" },
  tagline: { color:"#4A6A8A", fontSize:14, fontWeight:400 },
  gmailBtn: { display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"rgba(247,243,239,0.1)", border:"1px solid rgba(247,243,239,0.2)", borderRadius:10, fontSize:13, fontWeight:500, cursor:"pointer", color:"#F7F3EF", flexShrink:0 },
  gmailConnected: { display:"flex", alignItems:"center", gap:8, background:"rgba(42,157,143,0.2)", border:"1px solid rgba(42,157,143,0.4)", borderRadius:10, padding:"8px 14px" },
  gmailDot: { width:8, height:8, borderRadius:"50%", background:"#2A9D8F", flexShrink:0 },
  gmailText: { fontSize:12, color:"#A8E6E0", fontWeight:500 },
  gmailDisconnect: { fontSize:11, color:"#A8E6E0", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" },
  searchCard: { background:"#fff", borderRadius:20, padding:"28px 24px 24px", boxShadow:"0 8px 40px rgba(15,37,68,0.12)", maxWidth:640, width:"calc(100% - 32px)", margin:"-32px auto 0", position:"relative", zIndex:10, border:"1px solid rgba(15,37,68,0.06)" },
  fieldLabel: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:8 },
  inputRow: { display:"flex", alignItems:"center", gap:10, border:"1.5px solid #DDD5CC", borderRadius:12, padding:"12px 16px", marginBottom:4 },
  input: { flex:1, border:"none", outline:"none", fontSize:15, color:"#1E3A5F", background:"transparent", width:"100%" },
  priceGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:20 },
  priceBtn: { display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 4px", border:"1.5px solid #DDD5CC", borderRadius:10, background:"#fff", cursor:"pointer", transition:"all 0.15s" },
  priceBtnActive: { border:"1.5px solid #E85D3D", background:"#FEF0EC" },
  priceBtnLabel: { fontSize:12, fontWeight:600, color:"#1E3A5F", marginBottom:2 },
  priceBtnSub: { fontSize:10, color:"#9FB3C8", textAlign:"center" },
  searchBtn: { width:"100%", padding:14, background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", transition:"opacity 0.2s, background 0.2s" },
  loadMoreBtn: { padding:"13px 36px", background:"#0F2544", color:"#F7F3EF", border:"none", borderRadius:12, fontSize:14, fontWeight:600, cursor:"pointer" },
  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(247,243,239,0.3)", borderTopColor:"#F7F3EF", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  errorBox: { marginTop:12, padding:"12px 16px", background:"#FEF0EC", border:"1px solid #F5A882", borderRadius:10, color:"#B83A22", fontSize:13 },
  resultsWrap: { maxWidth:980, margin:"32px auto 80px", padding:"0 16px" },
  resultsBar: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 },
  resultsTitle: { fontSize:22, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px" },
  resultsSub: { fontSize:13, color:"#9FB3C8", marginTop:3 },
  viewToggle: { display:"flex", background:"#EDE8E3", borderRadius:10, padding:3, gap:3 },
  toggleBtn: { display:"flex", alignItems:"center", gap:5, padding:"7px 14px", border:"none", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", color:"#7A9BBF", background:"transparent", transition:"all 0.15s" },
  toggleActive: { background:"#fff", color:"#0F2544", boxShadow:"0 1px 4px rgba(15,37,68,0.1)" },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:20 },
  card: { background:"#fff", borderRadius:14, overflow:"visible", boxShadow:"0 2px 12px rgba(15,37,68,0.08)", border:"1px solid rgba(15,37,68,0.06)" },
  imgBox: { position:"relative", height:196, background:"#EDE8E3", overflow:"hidden", borderRadius:"14px 14px 0 0" },
  img: { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  imgFallback: { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#EDE8E3 0%,#DDD5CC 100%)" },
  imgGradient: { position:"absolute", bottom:0, left:0, right:0, height:60, background:"linear-gradient(transparent,rgba(15,37,68,0.2))", pointerEvents:"none" },
  pricePill: { position:"absolute", top:10, right:10, background:"rgba(15,37,68,0.7)", color:"#F7F3EF", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20, backdropFilter:"blur(4px)" },
  cardBody: { padding:"14px 16px 16px" },
  hotelName: { fontSize:16, fontWeight:700, color:"#0F2544", marginBottom:4, lineHeight:1.25, letterSpacing:"-0.2px" },
  address: { fontSize:12, color:"#9FB3C8", marginBottom:6, lineHeight:1.4 },
  desc: { fontSize:12, color:"#4A6A8A", lineHeight:1.6, marginBottom:10 },
  cardFooter: { paddingTop:10, borderTop:"1px solid #F0EBE5", marginBottom:8 },
  ratingText: { fontSize:11, color:"#9FB3C8", marginLeft:4 },
  websiteLink: { display:"inline-block", fontSize:12, color:"#E85D3D", fontWeight:600, textDecoration:"none", marginBottom:2 },
  igLink: { display:"inline-flex", alignItems:"center", gap:5, marginTop:4, fontSize:12, color:"#C13584", fontWeight:600, textDecoration:"none" },
  addToListBtn: { width:"100%", padding:"9px 12px", border:"1.5px solid #DDD5CC", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.2s", background:"#FAF7F4", color:"#1E3A5F" },
  addToListBtnSuccess: { background:"#E8F8F5", color:"#1A6B5A", borderColor:"#A8E6E0" },
  emptyState: { textAlign:"center", padding:"80px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 },
  emptyText: { color:"#9FB3C8", fontSize:15, maxWidth:300, lineHeight:1.6 },
  mapWrap: { position:"relative", height:580, borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(15,37,68,0.08)", border:"1px solid rgba(15,37,68,0.06)" },
  mapEl: { width:"100%", height:"100%" },
  mapPopup: { position:"absolute", bottom:16, left:16, width:260, background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(15,37,68,0.16)", overflow:"hidden", zIndex:20 },
  popupClose: { position:"absolute", top:8, right:8, background:"rgba(15,37,68,0.5)", border:"none", color:"#fff", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 },
  popupImg: { width:"100%", height:130, objectFit:"cover", display:"block" },
  popupBody: { padding:"12px 14px 14px" },
  popupName: { fontSize:15, fontWeight:700, color:"#0F2544", marginBottom:3, letterSpacing:"-0.2px" },
  popupAddr: { fontSize:11, color:"#9FB3C8", lineHeight:1.4, marginBottom:6 },
  popupLink: { display:"inline-block", fontSize:12, color:"#E85D3D", fontWeight:600, textDecoration:"none" },
};
