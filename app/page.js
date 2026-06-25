"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const PRICE_RANGES = [
  { label: "Budget",    sub: "Under $100", value: "budget",   keyword: "budget affordable" },
  { label: "Mid-range", sub: "$100-$250",  value: "midrange", keyword: "" },
  { label: "Upscale",   sub: "$250-$500",  value: "upscale",  keyword: "upscale boutique" },
  { label: "Luxury",    sub: "$500+",       value: "luxury",   keyword: "luxury 5 star" },
];

const PROPERTY_TABS = [
  { id: "hotels",    label: "Hotels",           icon: "🏨", keywords: ["hotel"] },
  { id: "vacation",  label: "Vacation Rentals", icon: "🏡", keywords: ["vacation rental", "luxury villa", "boutique guesthouse", "glamping"] },
  { id: "apartments",label: "Apartments",       icon: "🏢", keywords: ["serviced apartment", "aparthotel", "extended stay", "furnished apartment"] },
];

const PRICE_LEVELS = [
  { label: "$",    value: "budget",   keyword: "budget affordable" },
  { label: "$$",   value: "midrange", keyword: "" },
  { label: "$$$",  value: "upscale",  keyword: "upscale boutique" },
  { label: "$$$$", value: "luxury",   keyword: "luxury 5 star" },
];

const AMENITIES = [
  { label: "Pool",         value: "pool" },
  { label: "Spa",          value: "spa" },
  { label: "Beachfront",   value: "beachfront" },
  { label: "Eco Friendly", value: "eco" },
  { label: "Restaurant",   value: "restaurant" },
  { label: "Pet",          value: "pet" },
];

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.email";

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
  const [error, setError] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleAdd = async (listId) => {
    setError(null);
    const err = await onAdd(hotel, listId);
    if (err) { setError(err); setTimeout(() => setError(null), 4000); }
  };

  const handleCreate = async (name) => {
    setError(null);
    const err = await onCreateAndAdd(hotel, name);
    if (err) { setError(err); setTimeout(() => setError(null), 4000); }
  };

  return (
    <div ref={ref} style={dd.wrap}>
      <div style={dd.header}>
        <span style={dd.title}>Your Lists</span>
        <button style={dd.close} onClick={onClose} aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      {error && <p style={dd.error}>{error}</p>}
      {lists.length === 0 && !showNew && <p style={dd.empty}>No lists yet</p>}
      <div style={{ maxHeight:130, overflowY:"auto" }}>
        {lists.map(l => (
          <button key={l.id} style={dd.item} onClick={() => handleAdd(l.id)}>{l.name}</button>
        ))}
      </div>
      {!showNew
        ? <button style={dd.newBtn} onClick={() => setShowNew(true)}>+ Create new list</button>
        : (
          <div style={dd.newForm}>
            <input style={dd.newInput} placeholder="List name" autoFocus value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && newListName.trim() && handleCreate(newListName.trim())} />
            <button style={dd.createBtn} onClick={() => newListName.trim() && handleCreate(newListName.trim())}>Create</button>
          </div>
        )}
    </div>
  );
}

const dd = {
  wrap: { position:"absolute", bottom:"calc(100% + 6px)", left:0, right:0, background:"#fff", borderRadius:12, border:"1px solid #DDD5CC", boxShadow:"0 8px 28px rgba(15,37,68,0.14)", padding:"12px", zIndex:200 },
  header: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 },
  title: { fontSize:12, fontWeight:600, color:"#1E3A5F" },
  close: { background:"none", border:"none", cursor:"pointer", color:"#9FB3C8", display:"flex", alignItems:"center", padding:2 },
  error: { fontSize:12, color:"#B83A22", background:"#FEF0EC", borderRadius:6, padding:"6px 8px", marginBottom:8 },
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
        <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 12px", marginBottom:2 }}>
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
        </div>
        {hotel.email
          ? <a href={`mailto:${hotel.email}`} style={s.emailLink}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              {hotel.email}
            </a>
          : hotel.emailStatus === "finding"
            ? <p style={s.igNotFound}>Scanning for contact info...</p>
            : null
        }

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

const MapView = memo(function MapView({ hotels, apiKey, lists, onAddToList, onCreateAndAdd, onSearchArea, activeTabKeywords }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const hotelsRef = useRef(hotels);
  const onSearchAreaRef = useRef(onSearchArea);
  const activeTabKeywordsRef = useRef(activeTabKeywords);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [imgErr, setImgErr] = useState(false);
  const [mapDropdown, setMapDropdown] = useState(false);
  const [mapAddSuccess, setMapAddSuccess] = useState(false);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [searchingArea, setSearchingArea] = useState(false);
  const baseZoomRef = useRef(null);
  const baseCenterRef = useRef(null);
  const idleListenerRef = useRef(null);

  useEffect(() => { onSearchAreaRef.current = onSearchArea; }, [onSearchArea]);
  useEffect(() => { activeTabKeywordsRef.current = activeTabKeywords; }, [activeTabKeywords]);

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

    // Track pan/zoom to show "Search this area"
    idleListenerRef.current = map.addListener("idle", () => {
      const zoom = map.getZoom();
      const center = map.getCenter();
      if (baseZoomRef.current === null) {
        baseZoomRef.current = zoom;
        baseCenterRef.current = center;
        return;
      }
      const zoomDelta = Math.abs(zoom - baseZoomRef.current);
      const latDelta = Math.abs(center.lat() - baseCenterRef.current.lat());
      const lngDelta = Math.abs(center.lng() - baseCenterRef.current.lng());
      const hasMoved = latDelta > 0.005 || lngDelta > 0.005;
      const hasZoomed = zoomDelta > 1;
      if (hasMoved || hasZoomed) setShowSearchArea(true);
    });
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

  const handleSearchArea = async () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setSearchingArea(true);
    setShowSearchArea(false);
    const bounds = map.getBounds();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    // Reset base position so button doesn't immediately reappear
    baseZoomRef.current = map.getZoom();
    baseCenterRef.current = map.getCenter();
    await onSearchAreaRef.current({
      lat_ne: ne.lat(), lng_ne: ne.lng(),
      lat_sw: sw.lat(), lng_sw: sw.lng(),
      keywords: activeTabKeywordsRef.current,
    });
    setSearchingArea(false);
  };

  return (
    <div style={s.mapWrap}>
      <div ref={mapRef} style={s.mapEl} />
      {(showSearchArea || searchingArea) && (
        <button style={s.searchAreaBtn} onClick={handleSearchArea} disabled={searchingArea}>
          {searchingArea
            ? <><span style={s.searchAreaSpinner} /> Searching...</>
            : "Search this area"}
        </button>
      )}
      {selectedHotel && (
        <div style={s.mapPopup}>
          <button style={s.popupClose} onClick={() => setSelectedHotel(null)} aria-label="Close">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
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
  const prevIds = prevProps.hotels.map(h => h.placeId).join(",");
  const nextIds = nextProps.hotels.map(h => h.placeId).join(",");
  return prevIds === nextIds && prevProps.apiKey === nextProps.apiKey && prevProps.activeTabKeywords === nextProps.activeTabKeywords;
});

const EMPTY_TAB_STATE = { hotels: [], loading: false, searched: false };

export default function Home() {
  const _ss = (() => { try { const r = sessionStorage.getItem("sf_search"); return r ? JSON.parse(r) : {}; } catch { return {}; } })();

  const [location, setLocation] = useState(_ss.location || "");
  const [price, setPrice]       = useState(_ss.price !== undefined ? _ss.price : null);
  const [amenities, setAmenities] = useState(_ss.amenities || []);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(_ss.activeTab || "hotels");
  const [view, setView]         = useState(_ss.view || "list");
  const [error, setError]       = useState("");
  const [lists, setLists]       = useState([]);
  const [addListDropdown, setAddListDropdown] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);
  const [scanStatus, setScanStatus] = useState(null);

  // Per-tab state
  const [tabState, setTabState] = useState(() => {
    const saved = _ss.tabState || {};
    const init = {};
    PROPERTY_TABS.forEach(t => {
      init[t.id] = { hotels: saved[t.id]?.hotels || [], loading: false, searched: saved[t.id]?.searched || false };
    });
    return init;
  });

  const inputRef = useRef(null);
  const filterRef = useRef(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
  const { user } = useAuth();

  const activeHotels  = tabState[activeTab]?.hotels || [];
  const activeLoading = tabState[activeTab]?.loading || false;
  const activeSearched = tabState[activeTab]?.searched || false;

  const setTab = (tabId, patch) => setTabState(prev => ({ ...prev, [tabId]: { ...prev[tabId], ...patch } }));

  // Close filter dropdown on outside click
  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  // Persist search state
  useEffect(() => {
    try {
      const saveable = {};
      PROPERTY_TABS.forEach(t => { saveable[t.id] = { hotels: tabState[t.id].hotels, searched: tabState[t.id].searched }; });
      sessionStorage.setItem("sf_search", JSON.stringify({ location, price, amenities, activeTab, view, tabState: saveable }));
    } catch {}
  }, [location, price, amenities, activeTab, view, tabState]);

  useEffect(() => { if (user) fetchLists(); }, [user]);

  const fetchLists = async () => {
    if (!user) return;
    const { data } = await supabase.from("lists").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setLists(data || []);
  };

  const addToList = useCallback(async (hotel, listId) => {
    if (hotel.placeId) {
      const { data: existing } = await supabase
        .from("list_hotels")
        .select("id")
        .eq("list_id", listId)
        .eq("place_id", hotel.placeId)
        .maybeSingle();
      if (existing) return "Already in this list.";
    }
    const { error } = await supabase.from("list_hotels").insert({
      user_id: user?.id,
      list_id: listId, name: hotel.name, address: hotel.address || null,
      email: hotel.email || null, phone: hotel.phone || null, website: hotel.website || null,
      photo_url: hotel.photoUrl || null, rating: hotel.rating || null,
      price_level: hotel.priceLevel || null, place_id: hotel.placeId || null,
      instagram: hotel.instagram || null,
      lat: hotel.lat || null, lng: hotel.lng || null,
    });
    if (error) return "Couldn't add this property. Please try again.";
    setAddListDropdown(null);
    setAddSuccess(hotel.placeId);
    setTimeout(() => setAddSuccess(null), 2500);
    return null;
  }, [user]);

  const createListAndAdd = useCallback(async (hotel, name) => {
    const { data, error } = await supabase.from("lists").insert({ name, user_id: user?.id }).select().single();
    if (error || !data) return "Couldn't create the list. Please try again.";
    setLists(prev => [data, ...prev]);
    return addToList(hotel, data.id);
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

  const searchTab = async (tabId) => {
    if (!location.trim()) return;
    const tab = PROPERTY_TABS.find(t => t.id === tabId);
    setError("");
    setTab(tabId, { loading: true, hotels: [], searched: true });

    try {
      // Build keyword list: combine price modifier and amenities with each property keyword
      const priceLevel = PRICE_LEVELS.find(p => p.value === price);
      const pricePrefix = priceLevel?.keyword ? priceLevel.keyword + " " : "";
      const amenityStr = amenities.length > 0 ? " " + amenities.join(" ") : "";
      const keywords = tab.keywords.map(k => pricePrefix + k + amenityStr);

      // Run all keyword searches in parallel
      const allResults = await Promise.all(keywords.map(async kw => {
        const res = await fetch(`/api/hotels?query=${encodeURIComponent(location)}&keyword=${encodeURIComponent(kw)}`);
        const data = await res.json();
        return data.hotels || [];
      }));

      // Collect placeIds already shown in other tabs so we can exclude them
      const otherTabIds = new Set(
        PROPERTY_TABS.filter(t => t.id !== tabId)
          .flatMap(t => (tabState[t.id]?.hotels || []).map(h => h.placeId).filter(Boolean))
      );

      // Flatten and deduplicate by placeId + normalised name, excluding cross-tab dupes
      const seenIds = new Set();
      const seenNames = new Set();
      const hotelList = allResults.flat()
        .filter(h => {
          if (otherTabIds.has(h.placeId)) return false;
          if (seenIds.has(h.placeId)) return false;
          const normName = (h.name || "").toLowerCase().trim();
          if (seenNames.has(normName)) return false;
          seenIds.add(h.placeId);
          seenNames.add(normName);
          return true;
        })
        .map(h => ({ ...h, emailStatus: null, email: null }));

      setTab(tabId, { hotels: hotelList, loading: false, searched: true });
      findContacts(tabId, hotelList);
    } catch {
      setError("Could not find results. Please try again.");
      setTab(tabId, { loading: false });
    }
  };

  const search = () => searchTab(activeTab);

  const handleSearchArea = useCallback(async ({ lat_ne, lng_ne, lat_sw, lng_sw, keywords }) => {
    const priceLevel = PRICE_LEVELS.find(p => p.value === price);
    const pricePrefix = priceLevel?.keyword ? priceLevel.keyword + " " : "";
    const amenityStr = amenities.length > 0 ? " " + amenities.join(" ") : "";
    const kws = (keywords || ["hotel"]).map(k => pricePrefix + k + amenityStr);
    setError("");
    try {
      const allResults = await Promise.all(kws.map(async kw => {
        const params = new URLSearchParams({ lat_ne, lng_ne, lat_sw, lng_sw, keyword: kw });
        const res = await fetch(`/api/hotels?${params}`);
        const data = await res.json();
        return data.hotels || [];
      }));
      const seen = new Set();
      const seenNames = new Set();
      const hotelList = allResults.flat()
        .filter(h => {
          if (seen.has(h.placeId)) return false;
          const n = (h.name || "").toLowerCase().trim();
          if (seenNames.has(n)) return false;
          seen.add(h.placeId); seenNames.add(n); return true;
        })
        .map(h => ({ ...h, emailStatus: null, email: null }));
      setTab(activeTab, { hotels: hotelList, searched: true });
      findContacts(activeTab, hotelList);
    } catch {
      setError("Could not search this area. Please try again.");
    }
  }, [activeTab, price, amenities]);

  // When switching tabs, auto-fetch if location set but tab not yet searched
  const handleTabSwitch = (tabId) => {
    setActiveTab(tabId);
    if (location.trim() && tabState[activeTab]?.searched && !tabState[tabId]?.searched) {
      searchTab(tabId);
    }
  };

  const findContacts = async (tabId, hotelList) => {
    const withSite = hotelList.filter(h => h.website);
    if (!withSite.length) return;
    setScanStatus({ done: 0, total: withSite.length });
    let done = 0;

    setTabState(prev => ({
      ...prev,
      [tabId]: {
        ...prev[tabId],
        hotels: prev[tabId].hotels.map(h =>
          withSite.find(w => w.placeId === h.placeId)
            ? { ...h, emailStatus: "finding" }
            : h.emailStatus ? h : { ...h, emailStatus: "notfound" }
        ),
      },
    }));

    for (let i = 0; i < withSite.length; i += 3) {
      const batch = withSite.slice(i, i + 3);
      const batchResults = await Promise.all(batch.map(async hotel => {
        try {
          const res = await fetch(`/api/find-contact?website=${encodeURIComponent(hotel.website)}&name=${encodeURIComponent(hotel.name)}`);
          const data = await res.json();
          return { placeId: hotel.placeId, email: data.email || null, instagram: data.instagram || null, emailStatus: data.email ? "found" : data.instagram ? "found" : "notfound" };
        } catch {
          return { placeId: hotel.placeId, emailStatus: "notfound" };
        }
      }));
      done += batch.length;
      setScanStatus({ done, total: withSite.length });

      setTabState(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          hotels: prev[tabId].hotels.map(h => {
            const found = batchResults.find(r => r.placeId === h.placeId);
            return found ? { ...h, ...found } : h;
          }),
        },
      }));
    }
    setScanStatus(null);
  };

  return (
    <main>
      <div style={s.header}>
        <div style={s.headerInner}>
          <h1 style={s.headline}>Find Hotels to Partner With</h1>
          <div style={s.searchBar}>
            <div style={s.searchInputWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9FB3C8" strokeWidth="2" style={{ flexShrink:0 }}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input ref={inputRef} style={s.searchInput} placeholder="Search hotels by city or location..."
                value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} />
            </div>
            <div style={s.searchDivider} />
            <div style={{ position:"relative", flexShrink:0 }} ref={filterRef}>
              <button style={s.filterBtn} onClick={() => setFilterOpen(v => !v)}>
                <span>Filters</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink:0, transition:"transform 0.2s", transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)" }}><path d="M6 9l6 6 6-6"/></svg>
                {(price !== null || amenities.length > 0) && <span style={s.filterDot} />}
              </button>
              {filterOpen && (
                <div style={s.filterDropdown}>
                  <div style={s.filterSection}>
                    <p style={s.filterSectionLabel}>PRICE</p>
                    <div style={s.priceLevelRow}>
                      {PRICE_LEVELS.map(pl => (
                        <button
                          key={pl.value}
                          style={{ ...s.priceLevelBtn, ...(price === pl.value ? s.priceLevelBtnActive : {}) }}
                          onClick={() => setPrice(prev => prev === pl.value ? null : pl.value)}
                        >
                          {pl.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p style={s.filterSectionLabel}>AMENITIES</p>
                    <div style={s.amenitiesGrid}>
                      {AMENITIES.map(am => (
                        <label key={am.value} style={s.amenityLabel}>
                          <input
                            type="checkbox"
                            checked={amenities.includes(am.value)}
                            onChange={() => setAmenities(prev =>
                              prev.includes(am.value) ? prev.filter(v => v !== am.value) : [...prev, am.value]
                            )}
                            style={{ accentColor:"#E85D3D", width:14, height:14, cursor:"pointer", flexShrink:0 }}
                          />
                          <span style={{ userSelect:"none" }}>{am.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button style={{ ...s.searchBtn, opacity: location.trim() && !activeLoading ? 1 : 0.6 }} onClick={search} disabled={!location.trim() || activeLoading}>
              {activeLoading ? <><span style={s.spinner} />Searching</> : "Search"}
            </button>
          </div>
        </div>
        {error && <div style={s.errorBox}>{error}</div>}
      </div>

      {/* Property type tabs */}
      <div style={s.tabsWrap}>
        <div style={s.tabs}>
          {PROPERTY_TABS.map(tab => {
            const count = tabState[tab.id]?.hotels?.length;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                style={{ ...s.tabBtn, ...(isActive ? s.tabBtnActive : {}) }}
                onClick={() => handleTabSwitch(tab.id)}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {count > 0 && <span style={{ ...s.tabCount, ...(isActive ? s.tabCountActive : {}) }}>{count}</span>}
                {tabState[tab.id]?.loading && <span style={s.tabSpinner} />}
              </button>
            );
          })}
        </div>
      </div>

      <div style={s.resultsWrap}>
        {activeLoading && (
          <div style={{ textAlign:"center", padding:"60px 24px" }}>
            <div style={{ width:40, height:40, border:"3px solid #DDD5CC", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite", margin:"0 auto 20px" }} />
            <p style={{ fontSize:15, fontWeight:600, color:"#0F2544", marginBottom:6 }}>Searching across the area...</p>
            <p style={{ fontSize:13, color:"#9FB3C8" }}>This may take a few seconds — we search multiple zones to find every property</p>
          </div>
        )}

        {!activeLoading && activeSearched && activeHotels.length > 0 && (
          <>
            {scanStatus && (
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:16, padding:"8px 14px", background:"#F0EBE5", borderRadius:20, fontSize:12, color:"#4A6A8A", fontWeight:500 }}>
                <span style={{ width:7, height:7, borderRadius:"50%", background:"#E85D3D", flexShrink:0 }} />
                {scanStatus.done < scanStatus.total
                  ? `Scanning ${scanStatus.total} properties for contact details...`
                  : `Found contacts across ${scanStatus.total} properties`}
              </div>
            )}
            <div style={s.resultsBar}>
              <div>
                <h2 style={s.resultsTitle}>{activeHotels.length} {PROPERTY_TABS.find(t => t.id === activeTab)?.label} Found</h2>
                <p style={s.resultsSub}>{[price ? PRICE_LEVELS.find(p => p.value === price)?.label : null, amenities.length > 0 ? amenities.join(", ") : null, location].filter(Boolean).join(" · ")}</p>
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
                {activeHotels.map((hotel, i) => (
                  <HotelCard key={hotel.placeId || i} hotel={hotel}
                    lists={lists} onAddToList={addToList} onCreateAndAdd={createListAndAdd}
                    showDropdown={addListDropdown === hotel.placeId}
                    onToggleDropdown={(id) => setAddListDropdown(prev => prev === id ? null : id)}
                    addSuccess={addSuccess === hotel.placeId} />
                ))}
              </div>
            )}

            {view === "map" && <MapView key={activeTab} hotels={activeHotels} apiKey={apiKey} lists={lists} onAddToList={addToList} onCreateAndAdd={createListAndAdd} onSearchArea={handleSearchArea} activeTabKeywords={PROPERTY_TABS.find(t => t.id === activeTab)?.keywords} />}
          </>
        )}

        {!activeLoading && activeSearched && activeHotels.length === 0 && !error && (
          <div style={s.emptyState}><span style={{ fontSize:40 }}>🔍</span><p style={s.emptyText}>No results found. Try a different location or price range.</p></div>
        )}
        {!activeSearched && !activeLoading && (
          <div style={s.emptyState}><span style={{ fontSize:40 }}>{PROPERTY_TABS.find(t => t.id === activeTab)?.icon}</span><p style={s.emptyText}>Enter a location above to discover {PROPERTY_TABS.find(t => t.id === activeTab)?.label.toLowerCase()}</p></div>
        )}
      </div>
    </main>
  );
}

const s = {
  header: { background:"#0F2544", padding:"20px 24px 20px" },
  headerInner: { display:"flex", alignItems:"center", justifyContent:"space-between", maxWidth:980, margin:"0 auto", gap:16, flexWrap:"wrap" },
  headline: { fontSize:18, fontWeight:700, color:"#F7F3EF", letterSpacing:"-0.3px", flexShrink:0 },
  searchBar: { display:"flex", alignItems:"center", gap:0, background:"#fff", borderRadius:12, border:"1px solid rgba(15,37,68,0.06)", flex:1, boxShadow:"0 2px 12px rgba(15,37,68,0.15)" },
  searchInputWrap: { display:"flex", alignItems:"center", gap:8, flex:1, padding:"0 14px", minWidth:0 },
  searchInput: { flex:1, border:"none", outline:"none", fontSize:14, color:"#1E3A5F", background:"transparent", padding:"12px 0", minWidth:0 },
  searchDivider: { width:1, height:24, background:"#DDD5CC", flexShrink:0 },
  priceSelect: { border:"none", outline:"none", fontSize:13, color:"#4A6A8A", fontWeight:500, padding:"12px 14px", background:"transparent", cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  gmailBtn: { display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"rgba(247,243,239,0.1)", border:"1px solid rgba(247,243,239,0.2)", borderRadius:10, fontSize:13, fontWeight:500, cursor:"pointer", color:"#F7F3EF", flexShrink:0 },
  gmailConnected: { display:"flex", alignItems:"center", gap:8, background:"rgba(42,157,143,0.2)", border:"1px solid rgba(42,157,143,0.4)", borderRadius:10, padding:"8px 14px" },
  gmailDot: { width:8, height:8, borderRadius:"50%", background:"#2A9D8F", flexShrink:0 },
  gmailText: { fontSize:12, color:"#A8E6E0", fontWeight:500 },
  gmailDisconnect: { fontSize:11, color:"#A8E6E0", background:"none", border:"none", cursor:"pointer", textDecoration:"underline" },
  filterBtn: { display:"flex", alignItems:"center", gap:6, position:"relative", padding:"12px 16px", background:"none", border:"none", cursor:"pointer", fontSize:13, fontWeight:600, color:"#4A6A8A", fontFamily:"inherit", flexShrink:0, whiteSpace:"nowrap" },
  filterDot: { position:"absolute", top:8, right:8, width:7, height:7, borderRadius:"50%", background:"#E85D3D", flexShrink:0 },
  filterDropdown: { position:"absolute", top:"calc(100% + 8px)", right:0, background:"#fff", borderRadius:14, boxShadow:"0 4px 24px rgba(15,37,68,0.14)", border:"1px solid rgba(15,37,68,0.07)", padding:20, zIndex:100, minWidth:280 },
  filterSection: { marginBottom:18 },
  filterSectionLabel: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.07em", marginBottom:10 },
  priceLevelRow: { display:"flex", gap:8 },
  priceLevelBtn: { flex:1, padding:"9px 0", border:"1.5px solid #DDD5CC", borderRadius:8, background:"none", cursor:"pointer", fontSize:14, fontWeight:700, color:"#4A6A8A", fontFamily:"inherit", transition:"all 0.15s" },
  priceLevelBtnActive: { background:"#E85D3D", color:"#fff", borderColor:"#E85D3D" },
  amenitiesGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px 20px" },
  amenityLabel: { display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13, color:"#1E3A5F", fontWeight:500 },
  searchBtn: { padding:"12px 20px", background:"#E85D3D", color:"#fff", border:"none", fontSize:14, fontWeight:600, cursor:"pointer", transition:"opacity 0.2s", display:"flex", alignItems:"center", gap:8, flexShrink:0, fontFamily:"inherit", borderRadius:"0 12px 12px 0" },
  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(247,243,239,0.3)", borderTopColor:"#F7F3EF", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  errorBox: { marginTop:10, padding:"10px 16px", background:"#FEF0EC", border:"1px solid #B83A22", borderRadius:8, color:"#B83A22", fontSize:13, maxWidth:980, margin:"10px auto 0" },
  tabsWrap: { maxWidth:980, margin:"16px auto 0", padding:"0 16px" },
  tabs: { display:"flex", gap:8, flexWrap:"wrap" },
  tabBtn: { display:"flex", alignItems:"center", gap:7, padding:"9px 18px", borderRadius:24, border:"1.5px solid #DDD5CC", background:"#fff", color:"#0F2544", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" },
  tabBtnActive: { background:"#E85D3D", color:"#fff", border:"1.5px solid #E85D3D" },
  tabCount: { background:"#F0EBE5", color:"#0F2544", fontSize:11, fontWeight:700, padding:"2px 7px", borderRadius:12, minWidth:20, textAlign:"center" },
  tabCountActive: { background:"rgba(255,255,255,0.25)", color:"#fff" },
  tabSpinner: { display:"inline-block", width:11, height:11, border:"2px solid rgba(232,93,61,0.3)", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 },
  resultsWrap: { maxWidth:980, margin:"20px auto 80px", padding:"0 16px" },
  resultsBar: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 },
  resultsTitle: { fontSize:22, fontWeight:700, color:"#0F2544", letterSpacing:"-0.3px" },
  resultsSub: { fontSize:13, color:"#4A6A8A", marginTop:3 },
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
  address: { fontSize:12, color:"#4A6A8A", marginBottom:6, lineHeight:1.4 },
  desc: { fontSize:12, color:"#4A6A8A", lineHeight:1.6, marginBottom:10 },
  cardFooter: { paddingTop:10, borderTop:"1px solid #F0EBE5", marginBottom:8 },
  ratingText: { fontSize:11, color:"#4A6A8A", marginLeft:4 },
  websiteLink: { display:"inline-block", fontSize:12, color:"#E85D3D", fontWeight:600, textDecoration:"none", marginBottom:2 },
  igLink: { display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"#1E3A5F", fontWeight:600, textDecoration:"none" },
  emailLink: { display:"inline-flex", alignItems:"center", gap:5, marginTop:4, fontSize:12, color:"#0F2544", fontWeight:600, textDecoration:"none" },
  igNotFound: { fontSize:11, color:"#9FB3C8", marginTop:4 },
  addToListBtn: { width:"100%", padding:"9px 12px", border:"1.5px solid #E85D3D", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", transition:"all 0.2s", background:"transparent", color:"#E85D3D" },
  addToListBtnSuccess: { background:"#E8F8F5", color:"#1A6B5A", borderColor:"#A8E6E0", fontWeight:600 },
  emptyState: { textAlign:"center", padding:"80px 24px", display:"flex", flexDirection:"column", alignItems:"center", gap:16 },
  emptyText: { color:"#4A6A8A", fontSize:15, maxWidth:300, lineHeight:1.6 },
  searchAreaBtn: { position:"absolute", top:12, left:"50%", transform:"translateX(-50%)", zIndex:10, display:"flex", alignItems:"center", gap:7, padding:"9px 20px", background:"#0F2544", color:"#fff", border:"none", borderRadius:24, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 2px 12px rgba(15,37,68,0.25)", whiteSpace:"nowrap" },
  searchAreaSpinner: { display:"inline-block", width:12, height:12, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  mapWrap: { position:"relative", height:580, borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(15,37,68,0.08)", border:"1px solid rgba(15,37,68,0.06)" },
  mapEl: { width:"100%", height:"100%" },
  mapPopup: { position:"absolute", bottom:16, left:16, width:260, background:"#fff", borderRadius:14, boxShadow:"0 8px 32px rgba(15,37,68,0.16)", overflow:"hidden", zIndex:20 },
  popupClose: { position:"absolute", top:8, right:8, background:"rgba(15,37,68,0.5)", border:"none", color:"#fff", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:12, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", zIndex:1 },
  popupImg: { width:"100%", height:130, objectFit:"cover", display:"block" },
  popupBody: { padding:"12px 14px 14px" },
  popupName: { fontSize:15, fontWeight:700, color:"#0F2544", marginBottom:3, letterSpacing:"-0.2px" },
  popupAddr: { fontSize:11, color:"#4A6A8A", lineHeight:1.4, marginBottom:6 },
  popupLink: { display:"inline-block", fontSize:12, color:"#E85D3D", fontWeight:600, textDecoration:"none" },
};
