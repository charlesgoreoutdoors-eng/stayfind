"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";
import Link from "next/link";
import { useAuth } from "../../lib/auth";

let mapsPromise = null;
function loadMaps(apiKey) {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve) => {
    if (window.google?.maps) { resolve(); return; }
    window.__mapsResolve = resolve;
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=__mapsResolve`;
    s.async = true;
    document.head.appendChild(s);
  });
  return mapsPromise;
}

export default function ListsPage() {
  const [lists, setLists]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showNew, setShowNew]         = useState(false);
  const [newName, setNewName]         = useState("");
  const [newDesc, setNewDesc]         = useState("");
  const [saving, setSaving]           = useState(false);
  const [activeList, setActiveList]   = useState(null);
  const [listHotels, setListHotels]   = useState([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [igModal, setIgModal] = useState(null);
  const [igTemplates, setIgTemplates] = useState([]);
  const [igMessage, setIgMessage] = useState("");
  const [igTemplateId, setIgTemplateId] = useState("");
  const [dbError, setDbError]         = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText]       = useState("");
  const [igContacted, setIgContacted] = useState([]);
  const [igReplied, setIgReplied]     = useState([]);
  const [bulkIgMode, setBulkIgMode]   = useState(false);
  const [bulkIgSelected, setBulkIgSelected] = useState([]);
  const [bulkIgIndex, setBulkIgIndex] = useState(0);
  const [showMap, setShowMap]         = useState(false);
  const [mapEmpty, setMapEmpty]       = useState(false);
  const mapRef                        = useRef(null);
  const editingIgRef                  = useRef(null);
  const [editingIg, setEditingIg]     = useState(null);
  const [igInputText, setIgInputText] = useState("");
  const [igScraping, setIgScraping]   = useState(false);
  const [igScrapeProgress, setIgScrapeProgress] = useState({ done: 0, total: 0, found: 0 });
  const [emailScraping, setEmailScraping] = useState(false);
  const [emailScrapeProgress, setEmailScrapeProgress] = useState({ done: 0, total: 0, found: 0 });
  const [hunterScraping, setHunterScraping] = useState(false);
  const [hunterProgress, setHunterProgress] = useState({ done: 0, total: 0, found: 0 });
  const [contactsModal, setContactsModal] = useState(null);
  const [userPlan, setUserPlan] = useState("spark");
  const [showListDropdown, setShowListDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => { fetchLists(); fetchIgTemplates(); }, []);

  // Close list dropdown on outside click
  useEffect(() => {
    if (!showListDropdown) return;
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowListDropdown(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showListDropdown]);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("plan").eq("id", user.id).single()
      .then(({ data }) => { if (data?.plan) setUserPlan(data.plan); });
  }, [user]);

  // Restore active list from localStorage after lists load
  useEffect(() => {
    if (lists.length === 0) return;
    const savedId = localStorage.getItem("activeListId");
    if (savedId && !activeList) {
      const found = lists.find(l => l.id === savedId);
      if (found) openList(found);
    }
  }, [lists]);

  const fetchIgTemplates = async () => {
    const { data } = await supabase.from("templates").select("*").eq("user_id", user.id).eq("type", "instagram").order("created_at", { ascending: false });
    setIgTemplates(data || []);
  };

  const fetchLists = async () => {
    setLoading(true);
    setDbError("");
    if (!user) return;
    const { data, error } = await supabase
      .from("lists")
      .select("id, name, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setDbError("Could not load lists. Make sure your Supabase keys are set correctly.");
    } else {
      setLists(data || []);
    }
    setLoading(false);
  };

  const createList = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("lists")
      .insert({ name: newName.trim(), description: newDesc.trim() || null, user_id: user.id })
      .select()
      .single();
    if (error) {
      alert("Could not create list: " + error.message);
    } else if (data) {
      setLists(prev => [data, ...prev]);
      setNewName("");
      setNewDesc("");
      setShowNew(false);
    }
    setSaving(false);
  };

  const deleteList = async (id) => {
    await supabase.from("lists").delete().eq("id", id);
    setLists(prev => prev.filter(l => l.id !== id));
    if (activeList?.id === id) { setActiveList(null); setListHotels([]); localStorage.removeItem("activeListId"); }
    setDeleteConfirm(null);
  };

  const openIgDm = (hotel) => {
    const msg = igTemplates[0]?.body?.replace(/\{hotel_name\}/g, hotel.name) || "";
    setIgMessage(msg);
    setIgTemplateId(igTemplates[0]?.id || "");
    setIgModal(hotel);
  };

  const sendIgDm = (hotel, message) => {
    const handle = hotel.instagram?.replace("@", "");
    if (!handle) { alert("No Instagram handle found for this hotel."); return; }
    window.open(`https://www.instagram.com/${handle}/`, "_blank");
    navigator.clipboard.writeText(message).catch(() => {});
    const now = new Date().toISOString();
    setIgContacted(prev => prev.includes(hotel.id) ? prev : [...prev, hotel.id]);
    setListHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, ig_contacted: true, ig_contacted_at: now, contacted: true, contacted_at: now } : h));
    supabase.from("list_hotels").update({ ig_contacted: true, ig_contacted_at: now, contacted: true, contacted_at: now }).eq("id", hotel.id).then(() => {});
    setIgModal(null);
  };

  const bulkIgNext = (message) => {
    if (bulkIgIndex >= bulkIgSelected.length) {
      setBulkIgMode(false);
      setBulkIgSelected([]);
      setBulkIgIndex(0);
      return;
    }
    const hotel = bulkIgSelected[bulkIgIndex];
    sendIgDm(hotel, message);
    setBulkIgIndex(prev => prev + 1);
  };

  const startBulkIg = () => {
    const hotelsWithIg = listHotels.filter(h => h.instagram);
    if (hotelsWithIg.length === 0) { alert("No hotels in this list have Instagram handles."); return; }
    setBulkIgSelected(hotelsWithIg);
    setBulkIgIndex(0);
    setBulkIgMode(true);
    const msg = igTemplates[0]?.body?.replace(/\{hotel_name\}/g, hotelsWithIg[0].name) || "";
    setIgMessage(msg);
    setIgTemplateId(igTemplates[0]?.id || "");
    setIgModal(hotelsWithIg[0]);
  };

  const findIgHandles = async () => {
    const hotelsToScrape = listHotels.filter(h => h.website && !h.instagram);
    if (hotelsToScrape.length === 0) {
      alert("All hotels in this list already have Instagram handles, or none have websites to scrape.");
      return;
    }
    setIgScraping(true);
    setIgScrapeProgress({ done: 0, total: hotelsToScrape.length, found: 0 });

    let found = 0;
    for (let i = 0; i < hotelsToScrape.length; i += 3) {
      const batch = hotelsToScrape.slice(i, i + 3);
      const results = await Promise.all(batch.map(async hotel => {
        try {
          const res = await fetch(`/api/find-contact?website=${encodeURIComponent(hotel.website)}&name=${encodeURIComponent(hotel.name)}`);
          const data = await res.json();
          return { id: hotel.id, instagram: data.instagram || null };
        } catch {
          return { id: hotel.id, instagram: null };
        }
      }));

      for (const result of results) {
        if (result.instagram) {
          found++;
          await supabase.from("list_hotels").update({ instagram: result.instagram }).eq("id", result.id);
          setListHotels(prev => prev.map(h => h.id === result.id ? { ...h, instagram: result.instagram } : h));
        }
      }
      setIgScrapeProgress({ done: Math.min(i + 3, hotelsToScrape.length), total: hotelsToScrape.length, found });
    }

    setIgScraping(false);
    setIgScrapeProgress({ done: 0, total: 0, found: 0 });
    alert(`Done! Found ${found} Instagram handle${found !== 1 ? "s" : ""} out of ${hotelsToScrape.length} hotels scraped.`);
  };

  const saveIgManual = async (hotelId, raw) => {
    const handle = raw.trim().replace(/^@/, "");
    if (!handle) return;
    const formatted = "@" + handle;
    await supabase.from("list_hotels").update({ instagram: formatted }).eq("id", hotelId);
    setListHotels(prev => prev.map(h => h.id === hotelId ? { ...h, instagram: formatted } : h));
    setEditingIg(null);
    setIgInputText("");
  };

  const findEmails = async () => {
    const hotelsToScrape = listHotels.filter(h => h.website && !h.email);
    if (hotelsToScrape.length === 0) {
      alert("All hotels in this list already have emails, or none have websites to scrape.");
      return;
    }
    setEmailScraping(true);
    setEmailScrapeProgress({ done: 0, total: hotelsToScrape.length, found: 0 });

    let found = 0;
    for (let i = 0; i < hotelsToScrape.length; i += 3) {
      const batch = hotelsToScrape.slice(i, i + 3);
      const results = await Promise.all(batch.map(async hotel => {
        try {
          const res = await fetch(`/api/find-contact?website=${encodeURIComponent(hotel.website)}&place_id=${encodeURIComponent(hotel.place_id || "")}&name=${encodeURIComponent(hotel.name)}`);
          const data = await res.json();
          return { id: hotel.id, email: data.email || null };
        } catch {
          return { id: hotel.id, email: null };
        }
      }));

      for (const result of results) {
        if (result.email) {
          found++;
          await supabase.from("list_hotels").update({ email: result.email }).eq("id", result.id);
          setListHotels(prev => prev.map(h => h.id === result.id ? { ...h, email: result.email } : h));
        }
      }
      setEmailScrapeProgress({ done: Math.min(i + 3, hotelsToScrape.length), total: hotelsToScrape.length, found });
    }

    setEmailScraping(false);
    setEmailScrapeProgress({ done: 0, total: 0, found: 0 });
    alert(`Found ${found} email${found !== 1 ? "s" : ""} out of ${hotelsToScrape.length} hotels scraped.`);
  };

  const findHunterEmails = async () => {
    const hotelsToSearch = listHotels.filter(h => h.website && !h.hunter_contacts);
    if (hotelsToSearch.length === 0) {
      alert("All hotels in this list already have contacts searched, or none have websites.");
      return;
    }
    setHunterScraping(true);
    setHunterProgress({ done: 0, total: hotelsToSearch.length, found: 0 });

    let found = 0;
    for (let i = 0; i < hotelsToSearch.length; i += 3) {
      const batch = hotelsToSearch.slice(i, i + 3);
      const results = await Promise.all(batch.map(async hotel => {
        try {
          const url = hotel.website.startsWith("http") ? hotel.website : "https://" + hotel.website;
          const domain = new URL(url).hostname.replace(/^www\./, "");
          const res = await fetch("/api/hunter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain, hotelId: hotel.id, userId: user.id }),
          });
          const data = await res.json();
          return { id: hotel.id, contacts: data.contacts || [] };
        } catch {
          return { id: hotel.id, contacts: [] };
        }
      }));

      for (const result of results) {
        const hunter_contacts = result.contacts.map(c => ({ ...c, selected: false }));
        if (hunter_contacts.length > 0) found++;
        await supabase.from("list_hotels").update({ hunter_contacts }).eq("id", result.id);
        setListHotels(prev => prev.map(h => h.id === result.id ? { ...h, hunter_contacts } : h));
      }
      setHunterProgress({ done: Math.min(i + 3, hotelsToSearch.length), total: hotelsToSearch.length, found });
    }

    setHunterScraping(false);
    setHunterProgress({ done: 0, total: 0, found: 0 });
    alert(`Found contacts for ${found} out of ${hotelsToSearch.length} hotels.`);
  };

  const toggleContactSelection = async (hotel, idx) => {
    const updated = (hotel.hunter_contacts || []).map((c, i) =>
      i === idx ? { ...c, selected: !c.selected } : c
    );
    await supabase.from("list_hotels").update({ hunter_contacts: updated }).eq("id", hotel.id);
    setListHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, hunter_contacts: updated } : h));
    setContactsModal(prev => prev?.id === hotel.id ? { ...prev, hunter_contacts: updated } : prev);
  };

  const openList = async (list) => {
    setActiveList(list);
    localStorage.setItem("activeListId", list.id);
    setHotelsLoading(true);
    const { data } = await supabase
      .from("list_hotels")
      .select("*")
      .eq("list_id", list.id)
      .order("created_at", { ascending: false });
    setListHotels(data || []);
    setHotelsLoading(false);
  };

  const toggleContacted = async (hotel) => {
    const updated = !hotel.ig_contacted;
    await supabase.from("list_hotels").update({
      ig_contacted: updated,
      ig_contacted_at: updated ? new Date().toISOString() : null,
    }).eq("id", hotel.id);
    setListHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, ig_contacted: updated, ig_contacted_at: updated ? new Date().toISOString() : null } : h));
  };

  const saveNote = async (hotelId, note) => {
    await supabase.from("list_hotels").update({ notes: note }).eq("id", hotelId);
    setListHotels(prev => prev.map(h => h.id === hotelId ? { ...h, notes: note } : h));
    setEditingNote(null);
  };

  const isFollowUpNeeded = (hotel) => {
    const replied = igReplied.includes(hotel.id) || hotel.ig_replied;
    if (replied) return false;
    const contacted = igContacted.includes(hotel.id) || hotel.ig_contacted;
    if (!contacted || !hotel.ig_contacted_at) return false;
    const daysSince = (Date.now() - new Date(hotel.ig_contacted_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 3;
  };

  const markIgReplied = async (hotel, replied) => {
    setIgReplied(prev => replied ? [...prev, hotel.id] : prev.filter(id => id !== hotel.id));
    await supabase.from("list_hotels").update({ ig_replied: replied }).eq("id", hotel.id);
    setListHotels(prev => prev.map(h => h.id === hotel.id ? { ...h, ig_replied: replied } : h));
  };

  const removeHotel = async (hotelId) => {
    await supabase.from("list_hotels").delete().eq("id", hotelId);
    setListHotels(prev => prev.filter(h => h.id !== hotelId));
  };

  // Load Google Maps and render pins whenever the map modal opens
  useEffect(() => {
    if (!showMap) return;
    let cancelled = false;

    const init = async () => {
      await loadMaps(process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY);
      if (cancelled || !mapRef.current) return;

      const coordMap = {};
      listHotels.forEach(h => { if (h.lat && h.lng) coordMap[h.id] = { lat: h.lat, lng: h.lng }; });

      const missing = listHotels.filter(h => !coordMap[h.id] && (h.place_id || h.address));
      if (missing.length > 0) {
        const geocoder = new window.google.maps.Geocoder();
        await Promise.all(missing.map(h => new Promise(resolve => {
          const query = h.place_id ? { placeId: h.place_id } : { address: h.address };
          geocoder.geocode(query, (results, status) => {
            if (status === "OK" && results[0]) {
              const loc = results[0].geometry.location;
              const lat = loc.lat(), lng = loc.lng();
              coordMap[h.id] = { lat, lng };
              supabase.from("list_hotels").update({ lat, lng }).eq("id", h.id).then(() => {});
              setListHotels(prev => prev.map(p => p.id === h.id ? { ...p, lat, lng } : p));
            }
            resolve();
          });
        })));
      }

      if (cancelled || !mapRef.current) return;
      const hotels = listHotels.map(h => ({ ...h, ...(coordMap[h.id] || {}) })).filter(h => h.lat && h.lng);
      if (hotels.length === 0) { setMapEmpty(true); return; }

      const bounds = new window.google.maps.LatLngBounds();
      hotels.forEach(h => bounds.extend({ lat: h.lat, lng: h.lng }));
      const map = new window.google.maps.Map(mapRef.current, {
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        scrollwheel: true,
        gestureHandling: "greedy",
      });
      map.fitBounds(bounds);
      const infoWindow = new window.google.maps.InfoWindow();
      hotels.forEach(h => {
        const marker = new window.google.maps.Marker({
          position: { lat: h.lat, lng: h.lng },
          map,
          title: h.name,
          // Literal hex: the Maps API can't resolve CSS vars. Mirrors the tokens.
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#C96E3C", fillOpacity: 1, strokeColor: "#FFFCF4", strokeWeight: 2 },
        });
        marker.addListener("click", () => {
          infoWindow.setContent(`<div style="font-family:sans-serif;font-size:13px;font-weight:600;color:var(--color-ink-primary);max-width:180px">${h.name}${h.address ? `<div style="font-weight:400;color:var(--color-ink-muted);font-size:11px;margin-top:3px">${h.address}</div>` : ""}</div>`);
          infoWindow.open(map, marker);
        });
      });
    };

    init();
    return () => { cancelled = true; };
  }, [showMap, listHotels]);

  const [hotelCounts, setHotelCounts] = useState({});
  useEffect(() => {
    if (lists.length === 0) return;
    const fetchCounts = async () => {
      const { data } = await supabase.from("list_hotels").select("list_id").eq("user_id", user.id);
      if (data) {
        const counts = {};
        data.forEach(row => { counts[row.list_id] = (counts[row.list_id] || 0) + 1; });
        setHotelCounts(counts);
      }
    };
    fetchCounts();
  }, [lists]);

  return (
    <div style={s.root}>
      <style>{`
        @media (max-width: 900px) { .dp-list-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", flex:1, minWidth:0 }}>
          <h1 style={s.title}>My Lists</h1>
          {!loading && lists.length > 0 && (
            <div style={{ position:"relative" }} ref={dropdownRef}>
              <button style={s.listSelector} onClick={() => setShowListDropdown(v => !v)}>
                <span style={{ fontWeight:600, color: activeList ? "var(--color-ink-primary)" : "var(--color-ink-muted)", fontSize:14, flex:1, textAlign:"left", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {activeList ? activeList.name : "Select a list..."}
                </span>
                {activeList && (
                  <span style={{ fontSize:11, color:"var(--color-accent-amber)", fontWeight:500, flexShrink:0, marginLeft:6 }}>
                    {hotelCounts[activeList.id] || 0} hotels
                  </span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink-muted)" strokeWidth="2.5" style={{ flexShrink:0, marginLeft:6, transform: showListDropdown ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showListDropdown && (
                <div style={s.listDropdown}>
                  {lists.map(list => (
                    <div key={list.id}
                      style={{ ...s.listDropdownItem, ...(activeList?.id === list.id ? s.listDropdownItemActive : {}) }}
                      onClick={() => { openList(list); setShowListDropdown(false); }}
                    >
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color: activeList?.id === list.id ? "var(--color-accent-terracotta)" : "var(--color-ink-primary)", marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{list.name}</p>
                        <p style={{ fontSize:11, color:"var(--color-ink-muted)" }}>{hotelCounts[list.id] || 0} hotels</p>
                      </div>
                      <div style={{ display:"flex", gap:5, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                        <Link href={`/compose?list=${list.id}`}>
                          <button style={s.iconBtn} title="Compose outreach">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-terracotta)" strokeWidth="2.5">
                              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                          </button>
                        </Link>
                        <button style={{ ...s.iconBtn, borderColor:"var(--color-error)" }} onClick={() => { setDeleteConfirm(list.id); setShowListDropdown(false); }} title="Delete list">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {loading && <div style={s.loadingSpinner} />}
        </div>
        <button style={s.newBtn} onClick={() => setShowNew(v => !v)}>
          {showNew ? "Cancel" : "+ New List"}
        </button>
      </div>

      {dbError && <div style={s.errorBox}>{dbError}</div>}

      {/* New list form */}
      {showNew && (
        <div style={s.newForm}>
          <h3 style={s.newFormTitle}>Create New List</h3>
          <input
            style={s.input}
            placeholder="List name e.g. Malibu Summer 2025"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createList()}
            autoFocus
          />
          <input
            style={s.input}
            placeholder="Description (optional)"
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
          />
          <div style={{ display:"flex", gap:8 }}>
            <button style={s.saveBtn} onClick={createList} disabled={saving || !newName.trim()}>
              {saving ? "Creating..." : "Create List"}
            </button>
            <button style={s.cancelBtn} onClick={() => { setShowNew(false); setNewName(""); setNewDesc(""); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hotels detail panel */}
      <div style={s.detailPanel}>
          {!activeList ? (
            <div style={s.empty}>
              <span style={{ fontSize:36 }}>📋</span>
              <p style={{ fontWeight:600, color:"var(--color-ink-primary)" }}>{lists.length === 0 ? "No lists yet" : "Select a list above"}</p>
              <p style={{ fontSize:13 }}>{lists.length === 0 ? "Create a list to start organising hotels from your searches." : "Use the dropdown in the header to pick a list."}</p>
              {lists.length === 0 && <button style={s.saveBtn} onClick={() => setShowNew(true)}>+ Create your first list</button>}
            </div>
          ) : (
            <>
              <div style={s.toolbar}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                  {igScraping ? (
                    <div style={s.igScrapeProgress}>
                      <div style={s.igScrapeSpinner} />
                      <span>{igScrapeProgress.done}/{igScrapeProgress.total} scraped — {igScrapeProgress.found} found</span>
                    </div>
                  ) : (
                    <button style={{ ...s.igScrapeBtn, ...(emailScraping ? s.igScrapeBtnDisabled : {}) }} onClick={findIgHandles} disabled={emailScraping} title="Find Instagram handles for hotels missing them">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <circle cx="12" cy="12" r="4"/>
                        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                      </svg>
                      Find IG Handles
                    </button>
                  )}
                  {emailScraping ? (
                    <div style={s.igScrapeProgress}>
                      <div style={s.igScrapeSpinner} />
                      <span>{emailScrapeProgress.done}/{emailScrapeProgress.total} scraped — {emailScrapeProgress.found} found</span>
                    </div>
                  ) : (
                    <button style={{ ...s.igScrapeBtn, ...s.emailScrapeBtn, ...(igScraping ? s.igScrapeBtnDisabled : {}) }} onClick={findEmails} disabled={igScraping} title="Find emails for hotels missing them">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      Find Emails
                    </button>
                  )}
                  {hunterScraping ? (
                    <div style={s.hunterProgress}>
                      <div style={s.hunterSpinner} />
                      <span>Finding contacts... {hunterProgress.done}/{hunterProgress.total} — {hunterProgress.found} found</span>
                    </div>
                  ) : ["glow","radiant","founding"].includes(userPlan) ? (
                    <button
                      style={{ ...s.hunterBtn, ...((igScraping || emailScraping) ? s.igScrapeBtnDisabled : {}) }}
                      onClick={findHunterEmails}
                      disabled={igScraping || emailScraping}
                      title="Find direct contacts using Hunter.io"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                      </svg>
                      Find Specific Emails
                    </button>
                  ) : (
                    <div style={{ position:"relative" }} title="Upgrade to Glow plan to find direct contacts">
                      <button style={{ ...s.hunterBtn, opacity:0.4, cursor:"not-allowed" }} disabled>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                        </svg>
                        Find Specific Emails
                      </button>
                    </div>
                  )}
                  <button style={s.mapBtn} onClick={() => { setShowMap(true); setMapEmpty(false); }} title="View hotels on a map">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
                      <line x1="8" y1="2" x2="8" y2="18"/>
                      <line x1="16" y1="6" x2="16" y2="22"/>
                    </svg>
                    View Map
                  </button>
                </div>
                {/* Compose is right-aligned per the design. Points at Flows —
                    the standalone /compose page was removed with the rebrand. */}
                <Link href={`/sequences/builder?list=${activeList.id}`} style={{ marginLeft:"auto" }}>
                  <button style={s.composeBtn}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Compose Emails
                  </button>
                </Link>
              </div>

              {hotelsLoading ? (
                <div style={s.empty}><div style={s.loadingSpinner} /><p>Loading hotels...</p></div>
              ) : listHotels.length === 0 ? (
                <div style={s.empty}>
                  <span style={{ fontSize:36 }}>🏨</span>
                  <p style={{ fontWeight:600, color:"var(--color-ink-primary)" }}>No hotels yet</p>
                  <p style={{ fontSize:13 }}>Search for hotels and use the "+ Add to List" button to add them here.</p>
                  <Link href="/" style={{ color:"var(--color-accent-amber-deep)", fontWeight:600, fontSize:13 }}>Go to Search</Link>
                </div>
              ) : (
                <div className="dp-list-grid" style={s.cardGrid}>
                  {listHotels.map(hotel => {
                    const replied   = igReplied.includes(hotel.id) || hotel.ig_replied;
                    const contacted = igContacted.includes(hotel.id) || hotel.ig_contacted;
                    const status = replied
                      ? { label: "\u2713 IG REPLIED", ...s.pillReplied }
                      : contacted
                        ? { label: "IG SENT", ...s.pillDm }
                        : { label: "NOT SENT", ...s.pillNone };
                    const { label: statusLabel, ...statusStyle } = status;
                    return (
                      <div key={hotel.id} style={s.hotelCard}>
                        {/* Photo */}
                        <div style={s.cardThumbWrap}>
                          {hotel.photo_url
                            ? <img src={hotel.photo_url} alt={hotel.name} style={s.cardThumb} onError={e => { e.target.style.display = "none"; }} />
                            : <div style={s.cardThumbFallback}>🏨</div>}
                        </div>

                        {/* Body */}
                        <div style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column", gap:5 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                            <p style={s.cardName}>{hotel.name}</p>
                            <span style={{ ...s.pillBase, ...statusStyle }}>{statusLabel}</span>
                          </div>

                          <p style={s.cardMeta}>
                            {hotel.address}
                            {hotel.rating ? ` \u00b7 \u2605 ${hotel.rating}` : ""}
                          </p>

                          {/* Email — Hunter contacts take priority, then direct, then scraped */}
                          {hotel.hunter_contacts?.length > 0 ? (
                            <button style={s.contactCountBadge} onClick={() => setContactsModal(hotel)}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              {hotel.hunter_contacts.length} contact{hotel.hunter_contacts.length !== 1 ? "s" : ""} found
                              {hotel.hunter_contacts.some(c => c.selected) && (
                                <span style={s.selectedCount}>{hotel.hunter_contacts.filter(c => c.selected).length} selected</span>
                              )}
                            </button>
                          ) : hotel.contact_email ? (
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <p style={s.cardEmail}>{hotel.contact_email}</p>
                              <span style={s.directTag}>Direct</span>
                            </div>
                          ) : hotel.email ? (
                            <p style={s.cardEmail}>{hotel.email}</p>
                          ) : (
                            <p style={s.cardNoEmail}>No email yet</p>
                          )}

                          {/* Instagram */}
                          {hotel.instagram ? (
                            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                              <a href={`https://www.instagram.com/${hotel.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={s.cardHandle}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                  <circle cx="12" cy="12" r="4"/>
                                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                                </svg>
                                {hotel.instagram}
                              </a>
                              {isFollowUpNeeded(hotel) && (
                                <span style={s.followUpBadge} title="No reply after 3+ days">Need to follow up</span>
                              )}
                            </div>
                          ) : editingIg === hotel.id ? (
                            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                              <input
                                style={s.igManualInput}
                                value={igInputText}
                                onChange={e => setIgInputText(e.target.value)}
                                placeholder="@handle"
                                autoFocus
                                onKeyDown={e => {
                                  if (e.key === "Enter") saveIgManual(hotel.id, igInputText);
                                  if (e.key === "Escape") { setEditingIg(null); setIgInputText(""); }
                                }}
                              />
                              <button style={s.noteSaveBtn} onClick={() => saveIgManual(hotel.id, igInputText)}>Save</button>
                              <button style={s.noteCancelBtn} onClick={() => { setEditingIg(null); setIgInputText(""); }}>Cancel</button>
                            </div>
                          ) : (
                            <button style={s.igAddBtn} onClick={() => { setEditingIg(hotel.id); setIgInputText(""); }}>
                              + Add handle
                            </button>
                          )}

                          {/* Note preview */}
                          {hotel.notes && (
                            <p style={s.cardNote}>&ldquo;{hotel.notes}&rdquo;</p>
                          )}

                          {/* Actions */}
                          <div style={s.cardActions}>
                            {hotel.website && (
                              <a
                                href={hotel.website}
                                target="_blank"
                                rel="noreferrer"
                                style={s.cardWebsiteBtn}
                                title={hotel.website}
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <circle cx="12" cy="12" r="10"/>
                                  <line x1="2" y1="12" x2="22" y2="12"/>
                                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                                Visit website
                              </a>
                            )}
                            {hotel.instagram && (
                              <button style={s.cardActionBtn} onClick={() => openIgDm(hotel)}>Send DM</button>
                            )}
                            {contacted && (
                              <button
                                style={{ ...s.cardActionBtn, ...(replied ? s.cardActionActive : {}) }}
                                onClick={() => markIgReplied(hotel, !replied)}
                                title={replied ? "Mark as not replied" : "Mark as replied"}
                              >
                                {replied ? "\u2713 Replied" : "Replied?"}
                              </button>
                            )}
                            <button
                              style={s.cardActionBtn}
                              onClick={() => toggleContacted(hotel)}
                              title={hotel.ig_contacted ? "Mark as not sent" : "Mark as DM sent"}
                            >
                              {hotel.ig_contacted ? "Undo sent" : "Mark sent"}
                            </button>
                            <button
                              style={s.cardActionBtn}
                              onClick={() => { setEditingNote(hotel.id); setNoteText(hotel.notes || ""); }}
                            >
                              {hotel.notes ? "Edit note" : "+ Note"}
                            </button>
                            <button style={s.cardRemoveBtn} onClick={() => removeHotel(hotel.id)} title="Remove from list">
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
      </div>

      {/* Notes Modal */}
      {editingNote && (() => {
        const hotel = listHotels.find(h => h.id === editingNote);
        return (
          <div style={s.overlay} onClick={() => setEditingNote(null)}>
            <div style={s.notesModal} onClick={e => e.stopPropagation()}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
                <div>
                  <h3 style={{ fontSize:17, fontWeight:700, color:"var(--color-ink-primary)", margin:0 }}>Notes</h3>
                  {hotel && <p style={{ fontSize:12, color:"var(--color-ink-muted)", marginTop:4 }}>{hotel.name}</p>}
                </div>
                <button style={s.mapCloseBtn} onClick={() => setEditingNote(null)}>✕</button>
              </div>
              <textarea
                style={s.notesModalTextarea}
                rows={8}
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Write a note about this hotel..."
                autoFocus
              />
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:14 }}>
                <button style={s.cancelBtn} onClick={() => setEditingNote(null)}>Cancel</button>
                <button style={s.saveBtn} onClick={() => saveNote(editingNote, noteText)}>Save Note</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Map Modal */}
      {showMap && (
        <div style={s.overlay} onClick={() => setShowMap(false)}>
          <div style={s.mapModal} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div>
                <h3 style={{ fontSize:17, fontWeight:700, color:"var(--color-ink-primary)", margin:0 }}>{activeList?.name}</h3>
                <p style={{ fontSize:12, color:"var(--color-ink-muted)", marginTop:3 }}>
                  {listHotels.filter(h => h.lat && h.lng).length} of {listHotels.length} hotels mapped
                </p>
              </div>
              <button style={s.mapCloseBtn} onClick={() => setShowMap(false)}>✕</button>
            </div>
            {mapEmpty
              ? <div style={{ ...s.empty, padding:"40px 0" }}>
                  <span style={{ fontSize:32 }}>📍</span>
                  <p>No location data for hotels in this list.</p>
                </div>
              : <div ref={mapRef} style={s.mapContainer} />
            }
          </div>
        </div>
      )}

      {/* Instagram DM Modal */}
      {igModal && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontSize:18, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:4 }}>
              Send Instagram DM
            </h3>
            <p style={{ fontSize:13, color:"var(--color-ink-muted)", marginBottom:16 }}>
              to {igModal.instagram} — {igModal.name}
            </p>

            <div style={s.igWarning}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-amber-deeper)" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>Use sparingly — Instagram may restrict accounts that send too many DMs. We recommend max 20-30 per day.</span>
            </div>

            {igTemplates.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <label style={s.igLabel}>Load Template</label>
                <select style={s.igSelect} value={igTemplateId} onChange={e => {
                  setIgTemplateId(e.target.value);
                  const t = igTemplates.find(t => t.id === e.target.value);
                  if (t) setIgMessage(t.body.replace(/\{hotel_name\}/g, igModal.name));
                }}>
                  <option value="">Select a template...</option>
                  {igTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}

            <div style={{ marginBottom:16 }}>
              <label style={s.igLabel}>Message</label>
              <textarea
                style={s.igTextarea}
                rows={5}
                value={igMessage}
                onChange={e => setIgMessage(e.target.value)}
                placeholder="Write your Instagram DM here..."
              />
              <p style={{ fontSize:11, color: igMessage.length > 1000 ? "var(--color-error)" : "var(--color-ink-muted)", textAlign:"right", marginTop:4 }}>
                {igMessage.length}/1000 characters
              </p>
            </div>

            <p style={s.igNote}>
              Clicking "Open & Copy" will open their Instagram profile in a new tab and copy your message to clipboard — just paste it into the DM box.
            </p>

            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setIgModal(null)}>Cancel</button>
              <button style={s.igSendBtn} onClick={() => sendIgDm(igModal, igMessage)} disabled={!igMessage.trim()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                </svg>
                Open & Copy Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, marginBottom:8, color:"var(--color-ink-primary)" }}>Delete this list?</h3>
            <p style={{ fontSize:14, color:"var(--color-ink-mid)", marginBottom:20 }}>All hotels in this list will also be removed. This cannot be undone.</p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button style={s.cancelBtn} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button style={s.deleteBtn} onClick={() => deleteList(deleteConfirm)}>Delete List</button>
            </div>
          </div>
        </div>
      )}

      {/* Hunter contacts modal */}
      {contactsModal && (
        <div style={s.overlay} onClick={() => setContactsModal(null)}>
          <div style={{ ...s.modal, maxWidth:480, width:"90%" }} onClick={e => e.stopPropagation()}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
              <div>
                <h3 style={{ fontSize:16, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:2 }}>{contactsModal.name}</h3>
                <p style={{ fontSize:12, color:"var(--color-ink-muted)" }}>Select contacts to include in sequences</p>
              </div>
              <button onClick={() => setContactsModal(null)} style={{ background:"var(--color-ground-sand)", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--color-ink-mid)", flexShrink:0 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {(contactsModal.hunter_contacts || []).map((contact, idx) => (
                <label key={idx} style={{ ...s.contactRow, ...(contact.selected ? s.contactRowSelected : {}) }}>
                  <input
                    type="checkbox"
                    checked={contact.selected || false}
                    onChange={() => toggleContactSelection(contactsModal, idx)}
                    style={{ accentColor:"var(--color-accent-terracotta)", width:16, height:16, flexShrink:0, cursor:"pointer" }}
                  />
                  <div style={{ minWidth:0 }}>
                    {contact.name && <p style={{ fontSize:13, fontWeight:600, color:"var(--color-ink-primary)", marginBottom:1 }}>{contact.name}</p>}
                    {contact.position && <p style={{ fontSize:11, color:"var(--color-ink-mid)", marginBottom:3 }}>{contact.position}</p>}
                    <p style={{ fontSize:12, color:"var(--color-accent-amber-deep)", wordBreak:"break-all" }}>✉ {contact.value}</p>
                    {contact.confidence && <p style={{ fontSize:10, color:"var(--color-ink-muted)", marginTop:2 }}>{contact.confidence}% confidence</p>}
                  </div>
                </label>
              ))}
            </div>
            <button style={{ ...s.newBtn, width:"100%", marginTop:16, textAlign:"center", justifyContent:"center", display:"flex" }} onClick={() => setContactsModal(null)}>
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

const s = {
  root: { padding:"24px 16px 80px" },
  header: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap", padding:"0 0 4px" },
  title: { fontFamily:"var(--font-display)", fontSize:26, fontWeight:700, color:"var(--color-ink-primary)", marginBottom:4 },
  subtitle: { fontSize:14, color:"var(--color-ink-muted)" },
  newBtn: { background:"var(--color-ink-primary)", color:"var(--color-ground-page)", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-display)", flexShrink:0 },
  listSelector: { display:"flex", alignItems:"center", gap:4, padding:"9px 14px", background:"var(--color-ground-card)", border:"1.5px solid var(--color-border)", borderRadius:10, cursor:"pointer", fontFamily:"inherit", minWidth:200, maxWidth:340 },
  listDropdown: { position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:200, background:"var(--color-ground-card)", border:"1.5px solid var(--color-border)", borderRadius:12, boxShadow:"0 8px 24px rgba(43,39,34,0.12)", minWidth:280, maxHeight:320, overflowY:"auto" },
  listDropdownItem: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer", borderBottom:"1px solid var(--color-ground-sand)", transition:"background 0.12s" },
  listDropdownItemActive: { background:"var(--color-amber-tint)" },
  errorBox: { background:"var(--status-error-bg)", border:"1px solid rgba(180,67,46,0.3)", borderRadius:10, padding:"12px 16px", color:"var(--color-error)", fontSize:13, marginBottom:16 },
  newForm: { background:"var(--color-ground-card)", border:"1.5px solid var(--color-border)", borderRadius:14, padding:"20px", marginBottom:20, display:"flex", flexDirection:"column", gap:10, maxWidth:500 },
  newFormTitle: { fontFamily:"var(--font-display)", fontSize:16, fontWeight:700, color:"var(--color-ink-primary)" },
  input: { border:"1.5px solid var(--color-border)", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none" },
  saveBtn: { background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-display)" },
  cancelBtn: { background:"var(--color-ground-card)", color:"var(--color-ink-mid)", border:"1.5px solid var(--color-border)", borderRadius:9, padding:"10px 20px", fontSize:14, cursor:"pointer", fontFamily:"var(--font-display)" },
  iconBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid var(--color-border)", background:"var(--color-ground-card)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  // Layout is a plain grid on the page ground — the old bordered detail panel
  // wrapper is gone, per the design.
  detailPanel: { minHeight:300 },
  toolbar: { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:18 },

  cardGrid: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"start" },
  hotelCard: { display:"flex", gap:14, padding:16, background:"var(--color-ground-card)", border:"1px solid var(--color-border)", borderRadius:"var(--radius-card)", boxShadow:"var(--shadow-low)" },
  cardThumbWrap: { width:76, height:76, flex:"none", borderRadius:12, overflow:"hidden", background:"var(--color-ground-sand)", display:"flex", alignItems:"center", justifyContent:"center" },
  cardThumb: { width:"100%", height:"100%", objectFit:"cover", display:"block" },
  cardThumbFallback: { fontSize:26 },
  cardName: { fontSize:15, fontWeight:700, color:"var(--color-ink-primary)", lineHeight:1.25, minWidth:0, overflow:"hidden", textOverflow:"ellipsis" },
  cardMeta: { fontSize:11.5, color:"var(--color-ink-muted)" },
  cardEmail: { fontSize:12, color:"var(--color-ink-primary)", wordBreak:"break-all", margin:0 },
  cardNoEmail: { fontSize:12, color:"var(--color-ink-muted)" },
  cardHandle: { display:"inline-flex", alignItems:"center", gap:5, fontSize:12, color:"var(--brand-instagram)", fontWeight:700, textDecoration:"none" },
  cardNote: { fontSize:11.5, color:"var(--color-ink-mid)", fontStyle:"italic", lineHeight:1.45, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" },
  directTag: { fontSize:10, fontWeight:700, background:"var(--status-sent-bg)", color:"var(--status-sent-ink)", padding:"2px 7px", borderRadius:"var(--radius-pill)", flexShrink:0 },

  // Status pill — top-right of each card
  pillBase: { fontSize:10, fontWeight:700, letterSpacing:"0.04em", padding:"3px 9px", borderRadius:"var(--radius-pill)", whiteSpace:"nowrap", flexShrink:0 },
  pillDm: { background:"rgba(193,53,132,0.12)", color:"var(--brand-instagram)" },
  pillReplied: { background:"var(--status-success-bg)", color:"var(--status-success-ink)" },
  pillNone: { background:"var(--color-ground-sand)", color:"var(--color-ink-muted)" },

  cardActions: { display:"flex", gap:6, flexWrap:"wrap", marginTop:2 },
  cardActionBtn: { fontSize:11, fontWeight:600, color:"var(--color-ink-mid)", background:"none", border:"1px solid var(--color-border)", borderRadius:"var(--radius-sm)", padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" },
  cardWebsiteBtn: { display:"inline-flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"var(--color-accent-amber-deep)", background:"var(--color-amber-tint)", border:"1px solid rgba(224,149,74,0.35)", borderRadius:"var(--radius-sm)", padding:"4px 9px", cursor:"pointer", fontFamily:"inherit", textDecoration:"none" },
  cardActionActive: { background:"var(--status-success-bg)", color:"var(--status-success-ink)", borderColor:"transparent" },
  cardRemoveBtn: { fontSize:11, fontWeight:600, color:"var(--color-ink-muted)", background:"none", border:"none", borderRadius:"var(--radius-sm)", padding:"4px 6px", cursor:"pointer", fontFamily:"inherit", marginLeft:"auto" },
  composeBtn: { display:"flex", alignItems:"center", gap:8, background:"var(--color-action-forest)", color:"var(--color-ground-page)", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-display)" },
  emailText: { fontSize:12, color:"var(--color-ink-primary)", fontWeight:500, marginBottom:2, wordBreak:"break-all" },
  noEmailText: { fontSize:12, color:"var(--color-border)", marginBottom:2 },
  contactCountBadge: { display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px", background:"var(--status-sent-bg)", border:"1.5px solid rgba(67,56,202,0.3)", borderRadius:20, fontSize:11, fontWeight:700, color:"var(--status-sent-ink)", cursor:"pointer", marginBottom:4, fontFamily:"inherit" },
  selectedCount: { background:"var(--color-accent-terracotta)", color:"var(--color-ground-page)", fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:10 },
  contactRow: { display:"flex", alignItems:"flex-start", gap:12, padding:"12px", borderRadius:10, border:"1.5px solid var(--color-ground-sand)", cursor:"pointer", transition:"all 0.15s" },
  contactRowSelected: { border:"1.5px solid var(--color-accent-terracotta)", background:"var(--color-amber-tint)" },
  phoneText: { fontSize:11, color:"var(--color-ink-mid)", marginBottom:2 },
  statusBtn: { fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"var(--font-display)" },
  contacted: { background:"var(--status-success-bg)", color:"var(--status-success-ink)" },
  pending: { background:"var(--color-ground-sand)", color:"var(--color-ink-mid)" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:"48px 24px", color:"var(--color-ink-muted)", fontSize:14, textAlign:"center" },
  loadingSpinner: { width:24, height:24, border:"2.5px solid var(--color-border)", borderTopColor:"var(--color-accent-amber)", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  overlay: { position:"fixed", inset:0, background:"rgba(43,39,34,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"var(--color-ground-card)", borderRadius:16, padding:"28px", maxWidth:400, width:"100%" },
  modalActions: { display:"flex", gap:10, justifyContent:"flex-end" },
  igHandle: { fontSize:12, color:"#C13584", fontWeight:600, textDecoration:"none" },
  igWarning: { display:"flex", alignItems:"flex-start", gap:8, background:"var(--color-amber-tint)", border:"1px solid var(--color-glow-1)", borderRadius:10, padding:"10px 12px", marginBottom:16, fontSize:12, color:"var(--color-accent-amber-deeper)", lineHeight:1.5 },
  igLabel: { display:"block", fontSize:11, fontWeight:700, color:"var(--color-ink-muted)", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  igSelect: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", background:"var(--color-ground-card)", cursor:"pointer", marginBottom:0 },
  igTextarea: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", resize:"vertical", lineHeight:1.7 },
  igNote: { fontSize:12, color:"var(--color-ink-muted)", lineHeight:1.6, marginBottom:16, fontStyle:"italic" },
  igScrapeBtn: { display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"rgba(193,53,132,0.08)", border:"1px solid rgba(193,53,132,0.3)", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", color:"#C13584", fontFamily:"inherit" },
  emailScrapeBtn: { background:"rgba(139,154,106,0.16)", border:"1px solid rgba(139,154,106,0.3)", color:"var(--color-cool-olive-deep)" },
  igScrapeBtnDisabled: { opacity:0.45, cursor:"not-allowed" },
  igScrapeProgress: { display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"rgba(193,53,132,0.08)", border:"1px solid rgba(193,53,132,0.3)", borderRadius:9, fontSize:12, color:"#C13584", fontWeight:500 },
  igScrapeSpinner: { width:12, height:12, border:"2px solid rgba(193,53,132,0.3)", borderTopColor:"#C13584", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 },
  hunterBtn: { display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"var(--color-ink-primary)", border:"none", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", color:"var(--color-ground-page)", fontFamily:"inherit" },
  hunterProgress: { display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"var(--status-sent-bg)", border:"1px solid rgba(67,56,202,0.3)", borderRadius:9, fontSize:12, color:"var(--status-sent-ink)", fontWeight:500 },
  hunterSpinner: { width:12, height:12, border:"2px solid rgba(67,56,202,0.3)", borderTopColor:"var(--status-sent-ink)", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 },
  igBulkBtn: { display:"flex", alignItems:"center", gap:7, background:"linear-gradient(135deg, var(--brand-instagram), var(--color-accent-amber))", color:"var(--color-ground-page)", border:"none", borderRadius:9, padding:"9px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  igSentBadge: { fontSize:10, fontWeight:700, background:"rgba(193,53,132,0.08)", color:"#C13584", padding:"2px 7px", borderRadius:20, border:"1px solid rgba(193,53,132,0.3)" },
  igSendBtn: { display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg, var(--brand-instagram), var(--color-accent-amber))", color:"var(--color-ground-page)", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  noteBtn: { display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:600, color:"var(--color-ink-muted)", background:"var(--color-ground-sand)", border:"1px dashed var(--color-border)", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  noteBtnFilled: { color:"var(--color-ink-primary)", background:"var(--color-ground-sand)", border:"1px solid var(--color-border)" },
  notesModal: { background:"var(--color-ground-card)", borderRadius:16, padding:"24px", width:"90vw", maxWidth:480 },
  notesModalTextarea: { width:"100%", border:"1.5px solid var(--color-border)", borderRadius:10, padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none", resize:"vertical", lineHeight:1.7, boxSizing:"border-box" },
  mapBtn: { display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"var(--status-sent-bg)", border:"1px solid rgba(67,56,202,0.3)", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", color:"var(--status-sent-ink)", fontFamily:"inherit" },
  mapModal: { background:"var(--color-ground-card)", borderRadius:16, padding:"24px", width:"90vw", maxWidth:780, maxHeight:"90vh", display:"flex", flexDirection:"column" },
  mapContainer: { width:"100%", height:480, borderRadius:12, overflow:"hidden", border:"1.5px solid var(--color-border)" },
  mapCloseBtn: { background:"none", border:"none", fontSize:16, color:"var(--color-ink-muted)", cursor:"pointer", padding:4, lineHeight:1 },
  deleteBtn: { background:"var(--color-error)", color:"var(--color-ground-page)", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"var(--font-display)" },
  followUpBadge: { display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:"var(--color-accent-amber-deeper)", background:"var(--color-amber-tint)", border:"1px solid var(--color-glow-1)", borderRadius:20, padding:"2px 8px" },
  igAddBtn: { fontSize:12, color:"#C13584", background:"none", border:"1px dashed rgba(193,53,132,0.3)", borderRadius:6, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
  igManualInput: { width:"100%", border:"1.5px solid rgba(193,53,132,0.3)", borderRadius:7, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:"var(--color-ink-primary)", outline:"none" },
};
