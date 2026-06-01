"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const PRICE_RANGES = [
  { label: "Budget",    sub: "Under $100", value: "budget",   keyword: "budget affordable hotel" },
  { label: "Mid-range", sub: "$100-$250",  value: "midrange", keyword: "hotel" },
  { label: "Upscale",   sub: "$250-$500",  value: "upscale",  keyword: "upscale boutique hotel" },
  { label: "Luxury",    sub: "$500+",       value: "luxury",   keyword: "luxury resort 5 star hotel" },
];

const GMAIL_CLIENT_ID = process.env.NEXT_PUBLIC_GMAIL_CLIENT_ID || "";
const GMAIL_SCOPES = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email";

// ---- Utility ----
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

// ---- Hotel Card ----
function HotelCard({ hotel, selected, contacted, onToggleSelect, onSelect }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div
      className="hotel-card fade-up"
      style={{
        ...s.card,
        outline: selected ? "2.5px solid #6366f1" : contacted ? "2.5px solid #22c55e" : "none",
        position: "relative",
      }}
    >
      {/* Select checkbox */}
      <div
        style={{
          ...s.selectBox,
          background: selected ? "#6366f1" : contacted ? "#22c55e" : "rgba(255,255,255,0.9)",
          border: selected || contacted ? "none" : "2px solid #cbd5e1",
        }}
        onClick={e => { e.stopPropagation(); onToggleSelect(hotel); }}
      >
        {(selected || contacted) && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </div>

      {contacted && (
        <div style={s.contactedBadge}>Contacted</div>
      )}

      <div style={s.imgBox} onClick={() => onSelect(hotel)}>
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

        {/* Email status */}
        <div style={s.emailRow}>
          {hotel.emailStatus === "finding" && (
            <span style={s.emailFinding}><span style={s.dotSpinner} /> Finding contact...</span>
          )}
          {hotel.emailStatus === "found" && hotel.email && (
            <span style={s.emailFound}>✉ {hotel.email}</span>
          )}
          {hotel.emailStatus === "notfound" && (
            <span style={s.emailNotFound}>No email found</span>
          )}
        </div>

        <div style={s.cardFooter}>
          {hotel.rating && (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <Stars rating={hotel.rating} />
              <span style={s.ratingText}>{hotel.rating}{hotel.ratingCount ? ` (${hotel.ratingCount.toLocaleString()})` : ""}</span>
            </div>
          )}
          {hotel.phone && <a href={`tel:${hotel.phone}`} style={s.phone}>{hotel.phone}</a>}
        </div>
        {hotel.website && (
          <a href={hotel.website} target="_blank" rel="noreferrer" style={s.websiteLink}>Visit website</a>
        )}
      </div>
    </div>
  );
}

// ---- Map View ----
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
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: validHotels[0].lat, lng: validHotels[0].lng },
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
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 18, fillColor: "#6366f1", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
      });
      marker.addListener("click", () => { setSelectedHotel(hotel); setImgErr(false); map.panTo({ lat: hotel.lat, lng: hotel.lng }); });
      markersRef.current.push(marker);
    });
    map.fitBounds(bounds);
  }, [hotels]);

  useEffect(() => {
    if (window.google) { initMap(); }
    else {
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
          <div key={hotel.placeId || i}
            style={{ ...s.sidebarItem, background: selectedHotel?.placeId === hotel.placeId ? "#eef2ff" : "#fff", borderColor: selectedHotel?.placeId === hotel.placeId ? "#6366f1" : "#e2e8f0" }}
            onClick={() => { setSelectedHotel(hotel); setImgErr(false); if (mapInstanceRef.current) { mapInstanceRef.current.panTo({ lat: hotel.lat, lng: hotel.lng }); mapInstanceRef.current.setZoom(15); } }}
          >
            <div style={s.sidebarNum}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={s.sidebarName}>{hotel.name}</p>
              {hotel.rating && <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}><Stars rating={hotel.rating} /><span style={{ fontSize:10, color:"#94a3b8" }}>{hotel.rating}</span></div>}
            </div>
            {hotel.priceLevel && <span style={s.sidebarPrice}>{hotel.priceLevel}</span>}
          </div>
        ))}
      </div>
      {selectedHotel && (
        <div style={s.mapPopup}>
          <button style={s.popupClose} onClick={() => setSelectedHotel(null)}>X</button>
          {selectedHotel.photoUrl && !imgErr && <img src={selectedHotel.photoUrl} alt={selectedHotel.name} style={s.popupImg} onError={() => setImgErr(true)} />}
          <div style={s.popupBody}>
            <h3 style={s.popupName}>{selectedHotel.name}</h3>
            <p style={s.popupAddr}>📍 {selectedHotel.address}</p>
            {selectedHotel.email && <p style={{ fontSize:12, color:"#6366f1", marginTop:6 }}>✉ {selectedHotel.email}</p>}
            {selectedHotel.website && <a href={selectedHotel.website} target="_blank" rel="noreferrer" style={s.popupLink}>Visit website</a>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Template Editor ----
function TemplateEditor({ template, onChange }) {
  const textareaRef = useRef(null);

  const insertFormat = (prefix, suffix = "") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = template.substring(start, end);
    const newText = template.substring(0, start) + prefix + selected + suffix + template.substring(end);
    onChange(newText);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  return (
    <div style={s.templateBox}>
      <div style={s.templateToolbar}>
        <button style={s.toolBtn} onClick={() => insertFormat("**", "**")} title="Bold">
          <strong>B</strong>
        </button>
        <button style={s.toolBtn} onClick={() => insertFormat("- ")} title="Bullet">
          &bull; List
        </button>
        <button style={s.toolBtn} onClick={() => insertFormat("\n\n")} title="Paragraph">
          &para;
        </button>
        <span style={s.templateHint}>Use <code style={{ background:"#f1f5f9", padding:"1px 5px", borderRadius:4, fontSize:11 }}>{"{hotel_name}"}</code> to auto-fill the hotel name</span>
      </div>
      <textarea
        ref={textareaRef}
        style={s.templateTextarea}
        value={template}
        onChange={e => onChange(e.target.value)}
        placeholder="Write your outreach message here... Use {hotel_name} where you want the hotel's name to appear automatically.

Example:
Hi {hotel_name} team,

My name is [Your Name] and I'm a content creator specialising in travel and lifestyle...

Looking forward to hearing from you!"
        rows={14}
      />
      <p style={s.templateCount}>{template.length} characters</p>
    </div>
  );
}

// ---- Bulk Preview Modal ----
function BulkPreviewModal({ hotels, template, subject, onClose, onSend, sending, sentIds }) {
  const hotelsWithEmail = hotels.filter(h => h.email);
  const hotelsNoEmail = hotels.filter(h => !h.email);
  const [previewHotel, setPreviewHotel] = useState(hotelsWithEmail[0] || null);

  const buildBody = (hotel) => template.replace(/\{hotel_name\}/g, hotel.name);

  return (
    <div style={s.modalOverlay}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Review Outreach Emails</h2>
          <button style={s.modalClose} onClick={onClose}>X</button>
        </div>

        <div style={s.modalBody}>
          {/* Left: hotel list */}
          <div style={s.modalLeft}>
            <p style={s.modalSectionLabel}>SENDING TO ({hotelsWithEmail.length})</p>
            {hotelsWithEmail.map(h => (
              <div key={h.placeId}
                style={{ ...s.modalHotelItem, background: previewHotel?.placeId === h.placeId ? "#eef2ff" : "#fff", borderColor: previewHotel?.placeId === h.placeId ? "#6366f1" : "#e2e8f0" }}
                onClick={() => setPreviewHotel(h)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={s.modalHotelName}>{h.name}</p>
                  <p style={s.modalHotelEmail}>{h.email}</p>
                </div>
                {sentIds.includes(h.placeId) && (
                  <span style={s.sentTick}>Sent</span>
                )}
              </div>
            ))}
            {hotelsNoEmail.length > 0 && (
              <>
                <p style={{ ...s.modalSectionLabel, marginTop: 16, color:"#f59e0b" }}>NO EMAIL FOUND ({hotelsNoEmail.length})</p>
                {hotelsNoEmail.map(h => (
                  <div key={h.placeId} style={{ ...s.modalHotelItem, opacity: 0.5, cursor:"default" }}>
                    <div style={{ flex: 1 }}>
                      <p style={s.modalHotelName}>{h.name}</p>
                      <p style={s.modalHotelEmail}>Will be skipped</p>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Right: email preview */}
          <div style={s.modalRight}>
            {previewHotel ? (
              <>
                <p style={s.modalSectionLabel}>EMAIL PREVIEW</p>
                <div style={s.emailPreviewBox}>
                  <div style={s.emailPreviewField}>
                    <span style={s.emailPreviewLabel}>To:</span>
                    <span>{previewHotel.email}</span>
                  </div>
                  <div style={s.emailPreviewField}>
                    <span style={s.emailPreviewLabel}>Subject:</span>
                    <span>{subject}</span>
                  </div>
                  <div style={s.emailPreviewDivider} />
                  <pre style={s.emailPreviewBody}>{buildBody(previewHotel)}</pre>
                </div>
              </>
            ) : (
              <div style={{ textAlign:"center", padding:"40px 0", color:"#94a3b8" }}>
                Select a hotel to preview the email
              </div>
            )}
          </div>
        </div>

        <div style={s.modalFooter}>
          <button style={s.cancelBtn} onClick={onClose} disabled={sending}>Cancel</button>
          <button
            style={{ ...s.sendAllBtn, opacity: sending || hotelsWithEmail.length === 0 ? 0.6 : 1 }}
            onClick={() => onSend(hotelsWithEmail)}
            disabled={sending || hotelsWithEmail.length === 0}
          >
            {sending
              ? <span style={{ display:"flex", alignItems:"center", gap:8 }}><span style={{ ...s.spinner, borderTopColor:"#fff" }} />Sending...</span>
              : `Send to ${hotelsWithEmail.length - sentIds.length} Hotels`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main App ----
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

  // Selection
  const [selectedIds, setSelectedIds]     = useState([]);
  const [contactedIds, setContactedIds]   = useState([]);

  // Gmail
  const [gmailToken, setGmailToken]       = useState(null);
  const [gmailEmail, setGmailEmail]       = useState(null);
  const [gmailLoading, setGmailLoading]   = useState(false);

  // Outreach
  const [template, setTemplate]           = useState("");
  const [subject, setSubject]             = useState("Content Collaboration Opportunity");
  const [showOutreach, setShowOutreach]   = useState(false);
  const [showPreview, setShowPreview]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [sentIds, setSentIds]             = useState([]);

  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;

  // Load Google Maps script
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

  // Gmail OAuth
  const connectGmail = () => {
    setGmailLoading(true);
    const clientId = GMAIL_CLIENT_ID;
    if (!clientId) {
      alert("Gmail Client ID not configured. Add NEXT_PUBLIC_GMAIL_CLIENT_ID to your environment variables.");
      setGmailLoading(false);
      return;
    }

    const handleMessage = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data && event.data.type === "gmail_token" && event.data.token) {
        setGmailToken(event.data.token);
        fetchGmailProfile(event.data.token);
        setGmailLoading(false);
        window.removeEventListener("message", handleMessage);
      }
    };
    window.addEventListener("message", handleMessage);

    const redirectUri = window.location.origin + "/api/auth/gmail";
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "token",
      scope: GMAIL_SCOPES,
      prompt: "select_account",
    });
    const popup = window.open("https://accounts.google.com/o/oauth2/v2/auth?" + params.toString(), "gmail-auth", "width=500,height=600,left=200,top=100");

    const checkClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        setGmailLoading(false);
      }
    }, 1000);
  };

  const fetchGmailProfile = async (token) => {
    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.email) setGmailEmail(data.email);
    } catch {}
  };

  const disconnectGmail = () => { setGmailToken(null); setGmailEmail(null); };

  // Hotel search
  const search = async () => {
    if (!location.trim()) return;
    setLoading(true);
    setError("");
    setHotels([]);
    setSearched(true);
    setSelectedIds([]);
    setNextPageToken(null);
    const priceObj = PRICE_RANGES.find(p => p.value === price);
    const query = `${priceObj.keyword} in ${location}`;
    setSearchLabel(`${priceObj.label} hotels in ${location}`);
    try {
      const res = await fetch(`/api/hotels?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const hotelList = (data.hotels || []).map(h => ({ ...h, emailStatus: null, email: null }));
      setHotels(hotelList);
      setNextPageToken(data.nextPageToken || null);
      // Auto find contacts
      findContactsForHotels(hotelList);
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
      const newHotels = (data.hotels || []).map(h => ({ ...h, emailStatus: null, email: null }));
      setHotels(prev => [...prev, ...newHotels]);
      setNextPageToken(data.nextPageToken || null);
      findContactsForHotels(newHotels);
    } catch {
      setError("Could not load more hotels. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  // Find contacts in background
  const findContactsForHotels = async (hotelList) => {
    const withWebsite = hotelList.filter(h => h.website);

    // Mark all as finding
    setHotels(prev => prev.map(h =>
      withWebsite.find(w => w.placeId === h.placeId)
        ? { ...h, emailStatus: "finding" }
        : h.emailStatus ? h : { ...h, emailStatus: "notfound" }
    ));

    // Find in parallel (batches of 5)
    for (let i = 0; i < withWebsite.length; i += 5) {
      const batch = withWebsite.slice(i, i + 5);
      await Promise.all(batch.map(async (hotel) => {
        try {
          const res = await fetch(`/api/find-contact?website=${encodeURIComponent(hotel.website)}&name=${encodeURIComponent(hotel.name)}`);
          const data = await res.json();
          setHotels(prev => prev.map(h =>
            h.placeId === hotel.placeId
              ? { ...h, email: data.email || null, emailStatus: data.email ? "found" : "notfound" }
              : h
          ));
        } catch {
          setHotels(prev => prev.map(h =>
            h.placeId === hotel.placeId ? { ...h, emailStatus: "notfound" } : h
          ));
        }
      }));
    }
  };

  // Selection
  const toggleSelect = (hotel) => {
    setSelectedIds(prev =>
      prev.includes(hotel.placeId)
        ? prev.filter(id => id !== hotel.placeId)
        : [...prev, hotel.placeId]
    );
  };

  const selectAll = () => setSelectedIds(hotels.map(h => h.placeId));
  const selectNone = () => setSelectedIds([]);
  const selectWithEmail = () => setSelectedIds(hotels.filter(h => h.email).map(h => h.placeId));

  const selectedHotels = hotels.filter(h => selectedIds.includes(h.placeId));

  // Send emails
  const sendEmails = async (hotelsToSend) => {
    if (!gmailToken) { alert("Please connect your Gmail account first."); return; }
    setSending(true);
    for (const hotel of hotelsToSend) {
      if (sentIds.includes(hotel.placeId)) continue;
      try {
        await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken: gmailToken,
            to: hotel.email,
            subject: subject,
            body: template.replace(/\{hotel_name\}/g, hotel.name),
            fromName: gmailEmail || "Me",
          }),
        });
        setSentIds(prev => [...prev, hotel.placeId]);
        setContactedIds(prev => [...prev, hotel.placeId]);
      } catch {}
      await new Promise(r => setTimeout(r, 300));
    }
    setSending(false);
    setShowPreview(false);
    setSelectedIds([]);
  };

  return (
    <main>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logoRow}>
            <span style={s.logoMark}>SF</span>
            <span style={s.logoText}>StayFind</span>
          </div>
          {/* Gmail connect */}
          <div>
            {!gmailToken ? (
              <button style={s.gmailBtn} onClick={connectGmail} disabled={gmailLoading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                {gmailLoading ? "Connecting..." : "Connect Gmail"}
              </button>
            ) : (
              <div style={s.gmailConnected}>
                <div style={s.gmailDot} />
                <span style={s.gmailEmailText}>{gmailEmail || "Gmail connected"}</span>
                <button style={s.gmailDisconnect} onClick={disconnectGmail}>Disconnect</button>
              </div>
            )}
          </div>
        </div>

        <h1 style={s.headline}>Find Your Perfect<br /><em style={s.headlineAccent}>Hotel Partner</em></h1>
        <p style={s.tagline}>Search hotels by location and budget to kickstart your content outreach</p>
      </div>

      {/* Search card */}
      <div style={s.searchCard}>
        <label style={s.fieldLabel}>Location</label>
        <div style={s.inputRow}>
          <input ref={inputRef} style={s.input} placeholder="e.g. Malibu, Miami Beach, Santorini"
            value={location} onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()} />
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
        <button style={{ ...s.searchBtn, opacity: location.trim() && !loading ? 1 : 0.45 }}
          onClick={search} disabled={!location.trim() || loading}>
          {loading
            ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={s.spinner} />Searching...</span>
            : "Search Hotels"}
        </button>
        {error && <div style={s.errorBox}>{error}</div>}
      </div>

      {/* Outreach Panel */}
      {searched && (
        <div style={s.outreachWrap}>
          <button style={s.outreachToggle} onClick={() => setShowOutreach(v => !v)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            {showOutreach ? "Hide" : "Edit"} Outreach Template
            {template && <span style={s.templateReadyBadge}>Ready</span>}
          </button>

          {showOutreach && (
            <div style={s.outreachPanel}>
              <div style={s.subjectRow}>
                <label style={s.fieldLabel}>Email Subject</label>
                <input style={s.subjectInput} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Content Collaboration Opportunity" />
              </div>
              <label style={{ ...s.fieldLabel, marginTop:16 }}>Message</label>
              <TemplateEditor template={template} onChange={setTemplate} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <div style={s.resultsWrap}>
        {loading && <div style={s.grid}>{[...Array(12)].map((_,i) => <SkeletonCard key={i} />)}</div>}

        {!loading && searched && hotels.length > 0 && (
          <>
            {/* Results bar */}
            <div style={s.resultsBar}>
              <div>
                <h2 style={s.resultsTitle}>{hotels.length} Hotels Found</h2>
                <p style={s.resultsSub}>{searchLabel}</p>
              </div>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                {/* Selection controls */}
                <div style={s.selectControls}>
                  <button style={s.selectCtrlBtn} onClick={selectWithEmail}>Select with email</button>
                  <button style={s.selectCtrlBtn} onClick={selectAll}>All</button>
                  <button style={s.selectCtrlBtn} onClick={selectNone}>None</button>
                </div>
                {/* View toggle */}
                <div style={s.viewToggle}>
                  <button style={{ ...s.toggleBtn, ...(view==="list" ? s.toggleBtnActive : {}) }} onClick={() => setView("list")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    List
                  </button>
                  <button style={{ ...s.toggleBtn, ...(view==="map" ? s.toggleBtnActive : {}) }} onClick={() => setView("map")}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
                    Map
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk action bar */}
            {selectedIds.length > 0 && (
              <div style={s.bulkBar}>
                <span style={s.bulkCount}>{selectedIds.length} hotel{selectedIds.length > 1 ? "s" : ""} selected</span>
                <button
                  style={{ ...s.bulkSendBtn, opacity: !gmailToken ? 0.5 : 1 }}
                  onClick={() => { if (!gmailToken) { alert("Connect Gmail first to send emails."); return; } if (!template.trim()) { alert("Add an outreach message first — click Edit Outreach Template above."); return; } setShowPreview(true); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Send Outreach to {selectedIds.length} Hotels
                </button>
              </div>
            )}

            {view === "list" && (
              <div style={s.grid}>
                {hotels.map((hotel, i) => (
                  <HotelCard
                    key={hotel.placeId || i}
                    hotel={hotel}
                    selected={selectedIds.includes(hotel.placeId)}
                    contacted={contactedIds.includes(hotel.placeId)}
                    onToggleSelect={toggleSelect}
                    onSelect={() => {}}
                  />
                ))}
              </div>
            )}

            {view === "list" && nextPageToken && (
              <div style={{ textAlign:"center", marginTop:36 }}>
                <button style={{ ...s.loadMoreBtn, opacity: loadingMore ? 0.6 : 1 }} onClick={loadMore} disabled={loadingMore}>
                  {loadingMore
                    ? <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}><span style={s.spinner} />Loading more...</span>
                    : "Load More Hotels"}
                </button>
                <p style={{ fontSize:12, color:"#94a3b8", marginTop:10 }}>Showing {hotels.length} hotels so far</p>
              </div>
            )}

            {view === "map" && <MapView hotels={hotels} apiKey={apiKey} />}
          </>
        )}

        {!loading && searched && hotels.length === 0 && !error && (
          <div style={s.emptyState}><span style={{ fontSize:40 }}>🔍</span><p style={s.emptyText}>No hotels found. Try a different location or price range.</p></div>
        )}
        {!searched && !loading && (
          <div style={s.emptyState}><span style={{ fontSize:40 }}>🏨</span><p style={s.emptyText}>Enter a location above to discover hotels</p></div>
        )}
      </div>

      {/* Bulk Preview Modal */}
      {showPreview && (
        <BulkPreviewModal
          hotels={selectedHotels}
          template={template}
          subject={subject}
          onClose={() => setShowPreview(false)}
          onSend={sendEmails}
          sending={sending}
          sentIds={sentIds}
        />
      )}
    </main>
  );
}

const s = {
  header: { background:"#0f0e17", padding:"24px 24px 68px" },
  headerInner: { display:"flex", alignItems:"center", justifyContent:"space-between", maxWidth:980, margin:"0 auto", marginBottom:32 },
  logoRow: { display:"flex", alignItems:"center", gap:8 },
  logoMark: { fontSize:13, fontWeight:700, color:"#a78bfa", background:"rgba(167,139,250,0.15)", padding:"4px 8px", borderRadius:6 },
  logoText: { fontFamily:"Georgia,serif", fontSize:17, color:"#e2e8f0", letterSpacing:"0.5px" },
  headline: { fontFamily:"Georgia,serif", fontSize:"clamp(30px,6vw,50px)", color:"#f1f5f9", fontWeight:700, lineHeight:1.18, marginBottom:14, textAlign:"center" },
  headlineAccent: { color:"#a78bfa", fontStyle:"italic" },
  tagline: { color:"#94a3b8", fontSize:14, fontWeight:300, maxWidth:360, margin:"0 auto", lineHeight:1.65, textAlign:"center" },
  gmailBtn: { display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"#fff", border:"none", borderRadius:10, fontSize:13, fontWeight:600, cursor:"pointer", color:"#1e293b", boxShadow:"0 2px 8px rgba(0,0,0,0.15)" },
  gmailConnected: { display:"flex", alignItems:"center", gap:8, background:"rgba(34,197,94,0.15)", border:"1px solid rgba(34,197,94,0.3)", borderRadius:10, padding:"8px 14px" },
  gmailDot: { width:8, height:8, borderRadius:"50%", background:"#22c55e", flexShrink:0 },
  gmailEmailText: { fontSize:12, color:"#dcfce7", fontWeight:500 },
  gmailDisconnect: { fontSize:11, color:"#86efac", background:"none", border:"none", cursor:"pointer", marginLeft:4, textDecoration:"underline" },
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
  loadMoreBtn: { padding:"14px 40px", background:"#0f0e17", color:"#fff", border:"none", borderRadius:12, fontSize:15, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  spinner: { display:"inline-block", width:15, height:15, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" },
  errorBox: { marginTop:14, padding:"13px 16px", background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, color:"#dc2626", fontSize:13 },
  outreachWrap: { maxWidth:980, margin:"32px auto 0", padding:"0 16px" },
  outreachToggle: { display:"flex", alignItems:"center", gap:8, background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:12, padding:"12px 18px", fontSize:14, fontWeight:500, color:"#1e293b", cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  templateReadyBadge: { marginLeft:6, background:"#dcfce7", color:"#166534", fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:20 },
  outreachPanel: { background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:16, padding:"20px 20px 16px", marginTop:12 },
  subjectRow: {},
  subjectInput: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none", marginBottom:4 },
  templateBox: { marginTop:4 },
  templateToolbar: { display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" },
  toolBtn: { padding:"5px 12px", border:"1.5px solid #e2e8f0", borderRadius:7, background:"#fff", fontSize:13, cursor:"pointer", fontFamily:"system-ui,sans-serif", color:"#374151" },
  templateHint: { fontSize:11, color:"#94a3b8", marginLeft:"auto" },
  templateTextarea: { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 14px", fontSize:13, fontFamily:"system-ui,sans-serif", color:"#1e293b", outline:"none", resize:"vertical", lineHeight:1.7 },
  templateCount: { fontSize:11, color:"#cbd5e1", marginTop:4, textAlign:"right" },
  resultsWrap: { maxWidth:980, margin:"32px auto 80px", padding:"0 16px" },
  resultsBar: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:12 },
  resultsTitle: { fontFamily:"Georgia,serif", fontSize:24, fontWeight:700, color:"#0f0e17" },
  resultsSub: { fontSize:13, color:"#94a3b8", marginTop:3 },
  selectControls: { display:"flex", gap:6 },
  selectCtrlBtn: { padding:"7px 12px", border:"1.5px solid #e2e8f0", borderRadius:8, background:"#fff", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"system-ui,sans-serif", color:"#64748b" },
  viewToggle: { display:"flex", background:"#f1f5f9", borderRadius:10, padding:3, gap:3 },
  toggleBtn: { display:"flex", alignItems:"center", gap:5, padding:"7px 12px", border:"none", borderRadius:8, fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"system-ui,sans-serif", color:"#64748b", background:"transparent" },
  toggleBtnActive: { background:"#fff", color:"#0f0e17", boxShadow:"0 1px 4px rgba(0,0,0,0.1)" },
  bulkBar: { display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0f0e17", borderRadius:12, padding:"12px 18px", marginBottom:20 },
  bulkCount: { fontSize:14, color:"#e2e8f0", fontWeight:500 },
  bulkSendBtn: { display:"flex", alignItems:"center", gap:8, background:"#6366f1", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif" },
  grid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))", gap:20 },
  card: { background:"#fff", borderRadius:16, overflow:"hidden", boxShadow:"0 2px 14px rgba(0,0,0,0.07)", cursor:"pointer" },
  selectBox: { position:"absolute", top:10, left:10, zIndex:5, width:24, height:24, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", transition:"all 0.15s" },
  contactedBadge: { position:"absolute", top:10, left:42, zIndex:5, background:"#22c55e", color:"#fff", fontSize:10, fontWeight:700, padding:"3px 8px", borderRadius:20 },
  imgBox: { position:"relative", height:190, background:"#e2e8f0", overflow:"hidden" },
  img: { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  imgFallback: { position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#e0e7ff 0%,#f0fdf4 100%)" },
  imgGradient: { position:"absolute", bottom:0, left:0, right:0, height:60, background:"linear-gradient(transparent,rgba(0,0,0,0.25))", pointerEvents:"none" },
  pricePill: { position:"absolute", top:10, right:10, background:"rgba(0,0,0,0.58)", color:"#fff", fontSize:11, fontWeight:700, padding:"4px 10px", borderRadius:20 },
  cardBody: { padding:"16px 18px 18px" },
  hotelName: { fontFamily:"Georgia,serif", fontSize:17, fontWeight:700, color:"#0f0e17", marginBottom:5, lineHeight:1.25 },
  address: { fontSize:12, color:"#94a3b8", marginBottom:6, lineHeight:1.4 },
  desc: { fontSize:12, color:"#64748b", lineHeight:1.6, marginBottom:8 },
  emailRow: { marginBottom:10, minHeight:20 },
  emailFinding: { fontSize:11, color:"#94a3b8", display:"flex", alignItems:"center", gap:6 },
  dotSpinner: { display:"inline-block", width:8, height:8, borderRadius:"50%", border:"1.5px solid #94a3b8", borderTopColor:"#6366f1", animation:"spin 0.7s linear infinite" },
  emailFound: { fontSize:11, color:"#6366f1", fontWeight:500, wordBreak:"break-all" },
  emailNotFound: { fontSize:11, color:"#cbd5e1" },
  cardFooter: { display:"flex", flexDirection:"column", gap:5, paddingTop:10, borderTop:"1px solid #f1f5f9" },
  ratingText: { fontSize:11, color:"#94a3b8", marginLeft:2 },
  phone: { fontSize:12, color:"#6366f1", fontWeight:500, textDecoration:"none" },
  websiteLink: { display:"inline-block", marginTop:8, fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" },
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
  popupName: { fontFamily:"Georgia,serif", fontSize:15, fontWeight:700, color:"#0f0e17", marginBottom:4 },
  popupAddr: { fontSize:11, color:"#94a3b8", lineHeight:1.4 },
  popupLink: { display:"inline-block", marginTop:8, fontSize:12, color:"#6366f1", fontWeight:600, textDecoration:"none" },
  modalOverlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"#fff", borderRadius:20, width:"100%", maxWidth:820, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" },
  modalHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px 16px", borderBottom:"1px solid #f1f5f9" },
  modalTitle: { fontFamily:"Georgia,serif", fontSize:20, fontWeight:700, color:"#0f0e17" },
  modalClose: { background:"none", border:"none", fontSize:16, fontWeight:700, cursor:"pointer", color:"#94a3b8", padding:"4px 8px" },
  modalBody: { display:"flex", flex:1, overflow:"hidden" },
  modalLeft: { width:260, borderRight:"1px solid #f1f5f9", padding:"16px 12px", overflowY:"auto", flexShrink:0 },
  modalRight: { flex:1, padding:"16px 20px", overflowY:"auto" },
  modalSectionLabel: { fontSize:10, fontWeight:700, color:"#94a3b8", letterSpacing:"1px", marginBottom:8 },
  modalHotelItem: { display:"flex", alignItems:"center", gap:8, padding:"10px", borderRadius:10, border:"1.5px solid #e2e8f0", marginBottom:6, cursor:"pointer", transition:"all 0.15s" },
  modalHotelName: { fontSize:13, fontWeight:600, color:"#1e293b", lineHeight:1.3 },
  modalHotelEmail: { fontSize:11, color:"#94a3b8", marginTop:2 },
  sentTick: { background:"#dcfce7", color:"#166534", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0 },
  emailPreviewBox: { background:"#f8fafc", borderRadius:12, padding:"16px", border:"1px solid #e2e8f0" },
  emailPreviewField: { fontSize:13, color:"#64748b", marginBottom:8, display:"flex", gap:8 },
  emailPreviewLabel: { fontWeight:600, color:"#374151", minWidth:55 },
  emailPreviewDivider: { borderTop:"1px solid #e2e8f0", margin:"12px 0" },
  emailPreviewBody: { fontSize:13, color:"#374151", lineHeight:1.7, whiteSpace:"pre-wrap", fontFamily:"system-ui,sans-serif", margin:0 },
  modalFooter: { padding:"16px 24px", borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"flex-end", gap:12 },
  cancelBtn: { padding:"11px 24px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", fontSize:14, fontWeight:500, cursor:"pointer", color:"#64748b", fontFamily:"system-ui,sans-serif" },
  sendAllBtn: { padding:"11px 28px", background:"#6366f1", color:"#fff", border:"none", borderRadius:10, fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"system-ui,sans-serif", display:"flex", alignItems:"center", gap:8 },
};
