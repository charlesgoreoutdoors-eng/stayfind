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
  const [userPlan, setUserPlan] = useState("free");
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
          icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 9, fillColor: "#1E3A5F", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        });
        marker.addListener("click", () => {
          infoWindow.setContent(`<div style="font-family:sans-serif;font-size:13px;font-weight:600;color:#0F2544;max-width:180px">${h.name}${h.address ? `<div style="font-weight:400;color:#9FB3C8;font-size:11px;margin-top:3px">${h.address}</div>` : ""}</div>`);
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
      {/* Header */}
      <div style={s.header}>
        <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap", flex:1, minWidth:0 }}>
          <h1 style={s.title}>My Lists</h1>
          {!loading && lists.length > 0 && (
            <div style={{ position:"relative" }} ref={dropdownRef}>
              <button style={s.listSelector} onClick={() => setShowListDropdown(v => !v)}>
                <span style={{ fontWeight:600, color: activeList ? "#0F2544" : "#9FB3C8", fontSize:14, flex:1, textAlign:"left", minWidth:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {activeList ? activeList.name : "Select a list..."}
                </span>
                {activeList && (
                  <span style={{ fontSize:11, color:"#F5A882", fontWeight:500, flexShrink:0, marginLeft:6 }}>
                    {hotelCounts[activeList.id] || 0} hotels
                  </span>
                )}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9FB3C8" strokeWidth="2.5" style={{ flexShrink:0, marginLeft:6, transform: showListDropdown ? "rotate(180deg)" : "none", transition:"transform 0.2s" }}>
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
                        <p style={{ fontSize:13, fontWeight:600, color: activeList?.id === list.id ? "#E85D3D" : "#0F2544", marginBottom:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{list.name}</p>
                        <p style={{ fontSize:11, color:"#9FB3C8" }}>{hotelCounts[list.id] || 0} hotels</p>
                      </div>
                      <div style={{ display:"flex", gap:5, flexShrink:0 }} onClick={e => e.stopPropagation()}>
                        <Link href={`/compose?list=${list.id}`}>
                          <button style={s.iconBtn} title="Compose outreach">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#E85D3D" strokeWidth="2.5">
                              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                            </svg>
                          </button>
                        </Link>
                        <button style={{ ...s.iconBtn, borderColor:"#fee2e2" }} onClick={() => { setDeleteConfirm(list.id); setShowListDropdown(false); }} title="Delete list">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
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
              <p style={{ fontWeight:600, color:"#1E3A5F" }}>{lists.length === 0 ? "No lists yet" : "Select a list above"}</p>
              <p style={{ fontSize:13 }}>{lists.length === 0 ? "Create a list to start organising hotels from your searches." : "Use the dropdown in the header to pick a list."}</p>
              {lists.length === 0 && <button style={s.saveBtn} onClick={() => setShowNew(true)}>+ Create your first list</button>}
            </div>
          ) : (
            <>
              <div style={s.detailHeader}>
                <div>
                  <h2 style={s.detailTitle}>{activeList.name}</h2>
                  <p style={s.detailSub}>{listHotels.length} hotel{listHotels.length !== 1 ? "s" : ""}</p>
                </div>
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
                  ) : ["pro","agency","founding"].includes(userPlan) ? (
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
                    <div style={{ position:"relative" }} title="Upgrade to Agency plan to find direct contacts">
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
                  <Link href={`/compose?list=${activeList.id}`}>
                    <button style={s.composeBtn}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Compose Emails
                    </button>
                  </Link>
                </div>
              </div>

              {hotelsLoading ? (
                <div style={s.empty}><div style={s.loadingSpinner} /><p>Loading hotels...</p></div>
              ) : listHotels.length === 0 ? (
                <div style={s.empty}>
                  <span style={{ fontSize:36 }}>🏨</span>
                  <p style={{ fontWeight:600, color:"#1E3A5F" }}>No hotels yet</p>
                  <p style={{ fontSize:13 }}>Search for hotels and use the "+ Add to List" button to add them here.</p>
                  <Link href="/" style={{ color:"#E85D3D", fontWeight:600, fontSize:13 }}>Go to Search</Link>
                </div>
              ) : (
                <div style={s.tableWrap}>
                  <div style={{ ...s.tableHead, ...s.tableGrid }}>
                    <div style={s.colHd}>Hotel</div>
                    <div style={s.colHd}>Email</div>
                    <div style={s.colHd}>Instagram</div>
                    <div style={s.colHd}>Instagram Contacted</div>
                    <div style={s.colHd}>Notes</div>
                    <div style={{ width:40 }} />
                  </div>
                  {listHotels.map(hotel => (
                    <div key={hotel.id} style={{ ...s.tableRow, ...s.tableGrid }}>
                      {/* Hotel info */}
                      <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
                        {hotel.photo_url ? (
                          <img src={hotel.photo_url} alt={hotel.name} style={s.thumb} onError={e => { e.target.style.display="none"; }} />
                        ) : (
                          <div style={s.thumbFallback}>🏨</div>
                        )}
                        <div style={{ minWidth:0 }}>
                          <p style={s.hotelName}>{hotel.name}</p>
                          <p style={s.hotelAddr}>{hotel.address}</p>
                          {hotel.rating && <p style={s.hotelRating}>{"★".repeat(Math.round(hotel.rating))} {hotel.rating}</p>}
                        </div>
                      </div>
                      {/* Email */}
                      <div style={{ minWidth:0 }}>
                        {hotel.hunter_contacts?.length > 0 ? (
                          <button style={s.contactCountBadge} onClick={() => setContactsModal(hotel)}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            {hotel.hunter_contacts.length} contact{hotel.hunter_contacts.length !== 1 ? "s" : ""} found
                            {hotel.hunter_contacts.some(c => c.selected) && (
                              <span style={s.selectedCount}>{hotel.hunter_contacts.filter(c => c.selected).length} selected</span>
                            )}
                          </button>
                        ) : hotel.contact_email ? (
                          <div style={{ marginBottom: hotel.email ? 6 : 0 }}>
                            {(hotel.contact_name || hotel.contact_title) && (
                              <p style={{ fontSize:11, color:"#6B7280", marginBottom:2 }}>
                                {[hotel.contact_name, hotel.contact_title].filter(Boolean).join(" — ")}
                              </p>
                            )}
                            <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                              <p style={{ ...s.emailText, wordBreak:"break-all", margin:0 }}>✉ {hotel.contact_email}</p>
                              <span style={{ fontSize:10, fontWeight:700, background:"#EEF2FF", color:"#4338ca", padding:"2px 7px", borderRadius:20, flexShrink:0 }}>Direct</span>
                            </div>
                          </div>
                        ) : null}
                        {hotel.email
                          ? <p style={{ ...s.emailText, wordBreak:"break-all", ...((hotel.hunter_contacts?.length > 0 || hotel.contact_email) ? { fontSize:11, color:"#9FB3C8" } : {}) }}>✉ {hotel.email}</p>
                          : !hotel.hunter_contacts?.length && !hotel.contact_email ? <p style={s.noEmailText}>No email</p> : null}
                        {hotel.phone && <p style={s.phoneText}>{hotel.phone}</p>}
                        {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer" style={s.websiteLink}>Visit website</a>}
                      </div>
                      {/* Instagram */}
                      <div style={{ minWidth:0 }}>
                        {hotel.instagram ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                            <a href={`https://www.instagram.com/${hotel.instagram.replace("@","")}`} target="_blank" rel="noreferrer" style={s.igHandle}>
                              {hotel.instagram}
                            </a>
                            {isFollowUpNeeded(hotel) && (
                              <div style={s.followUpBadge} title="No reply after 3+ days">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                Follow up
                              </div>
                            )}
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              <button style={s.igDmBtn} onClick={() => openIgDm(hotel)}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                                  <circle cx="12" cy="12" r="4"/>
                                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/>
                                </svg>
                                Send DM
                              </button>
                              {(igContacted.includes(hotel.id) || hotel.ig_contacted) && (
                                <button
                                  title={igReplied.includes(hotel.id) || hotel.ig_replied ? "Mark as not replied" : "Mark as replied"}
                                  style={{ ...s.igReplyBtn, ...(igReplied.includes(hotel.id) || hotel.ig_replied ? s.igReplyBtnActive : {}) }}
                                  onClick={() => markIgReplied(hotel, !(igReplied.includes(hotel.id) || hotel.ig_replied))}
                                >
                                  {igReplied.includes(hotel.id) || hotel.ig_replied ? "✓ Replied" : "Replied?"}
                                </button>
                              )}
                            </div>
                          </div>
                        ) : editingIg === hotel.id ? (
                          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
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
                            <div style={{ display:"flex", gap:5 }}>
                              <button style={s.noteSaveBtn} onClick={() => saveIgManual(hotel.id, igInputText)}>Save</button>
                              <button style={s.noteCancelBtn} onClick={() => { setEditingIg(null); setIgInputText(""); }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            style={s.igAddBtn}
                            onClick={() => { setEditingIg(hotel.id); setIgInputText(""); }}
                          >
                            + Add handle
                          </button>
                        )}
                      </div>
                      {/* Instagram Contacted */}
                      <div style={{ minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <span style={{ fontSize:12, fontWeight:500, color: hotel.ig_contacted ? "#C13584" : "#9FB3C8" }}>
                            {hotel.ig_contacted ? "DM Sent" : "Not Sent"}
                          </span>
                          <button
                            style={{ ...s.igCheckbox, ...(hotel.ig_contacted ? s.igCheckboxChecked : {}) }}
                            onClick={() => toggleContacted(hotel)}
                            title={hotel.ig_contacted ? "Mark as not sent" : "Mark as DM sent"}
                          >
                            {hotel.ig_contacted && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </button>
                        </div>
                        {hotel.ig_contacted_at && (
                          <p style={s.contactedDate}>{new Date(hotel.ig_contacted_at).toLocaleDateString()}</p>
                        )}
                      </div>
                      {/* Notes */}
                      <div style={{ minWidth:0 }}>
                        {hotel.notes ? (
                          <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                            <p style={{ fontSize:12, color:"#1E3A5F", lineHeight:1.45, flex:1, overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", margin:0 }}>
                              {hotel.notes}
                            </p>
                            <button
                              style={s.noteEditIcon}
                              onClick={() => { setEditingNote(hotel.id); setNoteText(hotel.notes || ""); }}
                              title="Edit note"
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                          </div>
                        ) : (
                          <button
                            style={s.noteAddBtn}
                            onClick={() => { setEditingNote(hotel.id); setNoteText(""); }}
                          >
                            + Add note
                          </button>
                        )}
                      </div>

                      {/* Remove */}
                      <div style={{ width:40, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        <button style={s.removeBtn} onClick={() => removeHotel(hotel.id)} title="Remove from list">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
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
                  <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", margin:0 }}>Notes</h3>
                  {hotel && <p style={{ fontSize:12, color:"#9FB3C8", marginTop:4 }}>{hotel.name}</p>}
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
                <h3 style={{ fontSize:17, fontWeight:700, color:"#0F2544", margin:0 }}>{activeList?.name}</h3>
                <p style={{ fontSize:12, color:"#9FB3C8", marginTop:3 }}>
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
            <h3 style={{ fontSize:18, fontWeight:700, color:"#0F2544", marginBottom:4 }}>
              Send Instagram DM
            </h3>
            <p style={{ fontSize:13, color:"#9FB3C8", marginBottom:16 }}>
              to {igModal.instagram} — {igModal.name}
            </p>

            <div style={s.igWarning}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#92400e" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
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
              <p style={{ fontSize:11, color: igMessage.length > 1000 ? "#ef4444" : "#9FB3C8", textAlign:"right", marginTop:4 }}>
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
            <h3 style={{ fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:18, marginBottom:8, color:"#0F2544" }}>Delete this list?</h3>
            <p style={{ fontSize:14, color:"#4A6A8A", marginBottom:20 }}>All hotels in this list will also be removed. This cannot be undone.</p>
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
                <h3 style={{ fontSize:16, fontWeight:700, color:"#0F2544", marginBottom:2 }}>{contactsModal.name}</h3>
                <p style={{ fontSize:12, color:"#9FB3C8" }}>Select contacts to include in sequences</p>
              </div>
              <button onClick={() => setContactsModal(null)} style={{ background:"#F0EBE5", border:"none", borderRadius:"50%", width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#4A6A8A", flexShrink:0 }}>
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
                    style={{ accentColor:"#E85D3D", width:16, height:16, flexShrink:0, cursor:"pointer" }}
                  />
                  <div style={{ minWidth:0 }}>
                    {contact.name && <p style={{ fontSize:13, fontWeight:600, color:"#0F2544", marginBottom:1 }}>{contact.name}</p>}
                    {contact.position && <p style={{ fontSize:11, color:"#4A6A8A", marginBottom:3 }}>{contact.position}</p>}
                    <p style={{ fontSize:12, color:"#E85D3D", wordBreak:"break-all" }}>✉ {contact.value}</p>
                    {contact.confidence && <p style={{ fontSize:10, color:"#9FB3C8", marginTop:2 }}>{contact.confidence}% confidence</p>}
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
  title: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:26, fontWeight:700, color:"#0F2544", marginBottom:4 },
  subtitle: { fontSize:14, color:"#9FB3C8" },
  newBtn: { background:"#0F2544", color:"#fff", border:"none", borderRadius:10, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", flexShrink:0 },
  listSelector: { display:"flex", alignItems:"center", gap:4, padding:"9px 14px", background:"#fff", border:"1.5px solid #DDD5CC", borderRadius:10, cursor:"pointer", fontFamily:"inherit", minWidth:200, maxWidth:340 },
  listDropdown: { position:"absolute", top:"calc(100% + 6px)", left:0, zIndex:200, background:"#fff", border:"1.5px solid #DDD5CC", borderRadius:12, boxShadow:"0 8px 24px rgba(15,37,68,0.12)", minWidth:280, maxHeight:320, overflowY:"auto" },
  listDropdownItem: { display:"flex", alignItems:"center", gap:10, padding:"12px 14px", cursor:"pointer", borderBottom:"1px solid #F8F6F4", transition:"background 0.12s" },
  listDropdownItemActive: { background:"#FEF0EC" },
  errorBox: { background:"#fef2f2", border:"1px solid #fca5a5", borderRadius:10, padding:"12px 16px", color:"#dc2626", fontSize:13, marginBottom:16 },
  newForm: { background:"#fff", border:"1.5px solid #e2e8f0", borderRadius:14, padding:"20px", marginBottom:20, display:"flex", flexDirection:"column", gap:10, maxWidth:500 },
  newFormTitle: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:16, fontWeight:700, color:"#0F2544" },
  input: { border:"1.5px solid #e2e8f0", borderRadius:10, padding:"11px 14px", fontSize:14, fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", color:"#0F2544", outline:"none" },
  saveBtn: { background:"#E85D3D", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  cancelBtn: { background:"#fff", color:"#4A6A8A", border:"1.5px solid #e2e8f0", borderRadius:9, padding:"10px 20px", fontSize:14, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  iconBtn: { width:28, height:28, borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" },
  detailPanel: { background:"#fff", borderRadius:16, border:"1.5px solid #e2e8f0", overflow:"hidden", minHeight:300 },
  detailHeader: { display:"flex", alignItems:"flex-start", justifyContent:"space-between", padding:"18px 20px", borderBottom:"1px solid #f1f5f9", gap:12, flexWrap:"wrap" },
  detailTitle: { fontFamily:"Plus Jakarta Sans, system-ui, sans-serif", fontSize:20, fontWeight:700, color:"#0F2544" },
  detailSub: { fontSize:13, color:"#9FB3C8", marginTop:2 },
  composeBtn: { display:"flex", alignItems:"center", gap:8, background:"#E85D3D", color:"#fff", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  tableWrap: { overflowX:"auto" },
  tableGrid: { display:"grid", gridTemplateColumns:"2.5fr 1.5fr 1.4fr 120px 1.6fr 40px", alignItems:"center", gap:"0 16px" },
  tableHead: { padding:"10px 20px", background:"#FAF8F5", borderBottom:"1px solid #f1f5f9" },
  tableRow: { padding:"14px 20px", borderBottom:"1px solid #f8fafc" },
  colHd: { fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"0.5px", textTransform:"uppercase" },
  thumb: { width:44, height:44, borderRadius:8, objectFit:"cover", flexShrink:0 },
  thumbFallback: { width:44, height:44, borderRadius:8, background:"#F0EBE5", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 },
  hotelName: { fontSize:14, fontWeight:600, color:"#0F2544", marginBottom:2 },
  hotelAddr: { fontSize:11, color:"#9FB3C8", lineHeight:1.3 },
  hotelRating: { fontSize:11, color:"#f59e0b", marginTop:2 },
  emailText: { fontSize:12, color:"#E85D3D", fontWeight:500, marginBottom:2, wordBreak:"break-all" },
  noEmailText: { fontSize:12, color:"#cbd5e1", marginBottom:2 },
  contactCountBadge: { display:"inline-flex", alignItems:"center", gap:6, padding:"5px 10px", background:"#EEF2FF", border:"1.5px solid #C7D2FE", borderRadius:20, fontSize:11, fontWeight:700, color:"#4338CA", cursor:"pointer", marginBottom:4, fontFamily:"inherit" },
  selectedCount: { background:"#E85D3D", color:"#fff", fontSize:10, fontWeight:700, padding:"1px 7px", borderRadius:10 },
  contactRow: { display:"flex", alignItems:"flex-start", gap:12, padding:"12px", borderRadius:10, border:"1.5px solid #F0EBE5", cursor:"pointer", transition:"all 0.15s" },
  contactRowSelected: { border:"1.5px solid #E85D3D", background:"#FEF0EC" },
  phoneText: { fontSize:11, color:"#4A6A8A", marginBottom:2 },
  websiteLink: { fontSize:11, color:"#E85D3D", textDecoration:"none" },
  statusBtn: { fontSize:11, fontWeight:700, padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  contacted: { background:"#dcfce7", color:"#166534" },
  pending: { background:"#F0EBE5", color:"#4A6A8A" },
  contactedDate: { fontSize:10, color:"#9FB3C8", marginTop:4 },
  removeBtn: { background:"none", border:"none", cursor:"pointer", padding:4, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center" },
  empty: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:10, padding:"48px 24px", color:"#9FB3C8", fontSize:14, textAlign:"center" },
  loadingSpinner: { width:24, height:24, border:"2.5px solid #e2e8f0", borderTopColor:"#E85D3D", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
  overlay: { position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 },
  modal: { background:"#fff", borderRadius:16, padding:"28px", maxWidth:400, width:"100%" },
  modalActions: { display:"flex", gap:10, justifyContent:"flex-end" },
  igHandle: { fontSize:12, color:"#C13584", fontWeight:600, textDecoration:"none" },
  igDmBtn: { display:"flex", alignItems:"center", gap:5, fontSize:11, fontWeight:600, color:"#C13584", background:"#FDF0F8", border:"1px solid #e8b4d8", borderRadius:6, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" },
  igWarning: { display:"flex", alignItems:"flex-start", gap:8, background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:10, padding:"10px 12px", marginBottom:16, fontSize:12, color:"#92400e", lineHeight:1.5 },
  igLabel: { display:"block", fontSize:11, fontWeight:700, color:"#9FB3C8", letterSpacing:"1px", textTransform:"uppercase", marginBottom:6 },
  igSelect: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"10px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", background:"#fff", cursor:"pointer", marginBottom:0 },
  igTextarea: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"11px 14px", fontSize:13, fontFamily:"inherit", color:"#1E3A5F", outline:"none", resize:"vertical", lineHeight:1.7 },
  igNote: { fontSize:12, color:"#9FB3C8", lineHeight:1.6, marginBottom:16, fontStyle:"italic" },
  igScrapeBtn: { display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"#FDF0F8", border:"1px solid #e8b4d8", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", color:"#C13584", fontFamily:"inherit" },
  emailScrapeBtn: { background:"#FEF0EC", border:"1px solid #f5c4b4", color:"#E85D3D" },
  igScrapeBtnDisabled: { opacity:0.45, cursor:"not-allowed" },
  igScrapeProgress: { display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#FDF0F8", border:"1px solid #e8b4d8", borderRadius:9, fontSize:12, color:"#C13584", fontWeight:500 },
  igScrapeSpinner: { width:12, height:12, border:"2px solid #e8b4d8", borderTopColor:"#C13584", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 },
  hunterBtn: { display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"#0F2544", border:"none", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", color:"#fff", fontFamily:"inherit" },
  hunterProgress: { display:"flex", alignItems:"center", gap:8, padding:"8px 14px", background:"#EEF2FF", border:"1px solid #c7d2fe", borderRadius:9, fontSize:12, color:"#4338ca", fontWeight:500 },
  hunterSpinner: { width:12, height:12, border:"2px solid #c7d2fe", borderTopColor:"#4338ca", borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 },
  igBulkBtn: { display:"flex", alignItems:"center", gap:7, background:"linear-gradient(135deg, #C13584, #E85D3D)", color:"#fff", border:"none", borderRadius:9, padding:"9px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  igSentBadge: { fontSize:10, fontWeight:700, background:"#FDF0F8", color:"#C13584", padding:"2px 7px", borderRadius:20, border:"1px solid #e8b4d8" },
  igCheckbox: { width:18, height:18, borderRadius:4, border:"1.5px solid #e8b4d8", background:"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all 0.15s" },
  igCheckboxChecked: { background:"#C13584", border:"1.5px solid #C13584" },
  igSendBtn: { display:"flex", alignItems:"center", gap:8, background:"linear-gradient(135deg, #C13584, #E85D3D)", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  noteBtn: { display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:600, color:"#9FB3C8", background:"#F8FAFC", border:"1px dashed #DDD5CC", borderRadius:7, padding:"5px 10px", cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
  noteBtnFilled: { color:"#0F2544", background:"#F0EBE5", border:"1px solid #DDD5CC" },
  noteAddBtn: { fontSize:11, fontWeight:600, color:"#9FB3C8", background:"none", border:"1px dashed #DDD5CC", borderRadius:6, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" },
  noteEditIcon: { background:"none", border:"none", cursor:"pointer", padding:2, color:"#9FB3C8", display:"flex", alignItems:"center", flexShrink:0 },
  notesModal: { background:"#fff", borderRadius:16, padding:"24px", width:"90vw", maxWidth:480 },
  notesModalTextarea: { width:"100%", border:"1.5px solid #DDD5CC", borderRadius:10, padding:"12px 14px", fontSize:14, fontFamily:"inherit", color:"#1E3A5F", outline:"none", resize:"vertical", lineHeight:1.7, boxSizing:"border-box" },
  mapBtn: { display:"flex", alignItems:"center", gap:7, padding:"8px 14px", background:"#EEF4FF", border:"1px solid #c3d4f5", borderRadius:9, fontSize:12, fontWeight:600, cursor:"pointer", color:"#3B6FD4", fontFamily:"inherit" },
  mapModal: { background:"#fff", borderRadius:16, padding:"24px", width:"90vw", maxWidth:780, maxHeight:"90vh", display:"flex", flexDirection:"column" },
  mapContainer: { width:"100%", height:480, borderRadius:12, overflow:"hidden", border:"1.5px solid #e2e8f0" },
  mapCloseBtn: { background:"none", border:"none", fontSize:16, color:"#9FB3C8", cursor:"pointer", padding:4, lineHeight:1 },
  deleteBtn: { background:"#ef4444", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"Plus Jakarta Sans, system-ui, sans-serif" },
  followUpBadge: { display:"inline-flex", alignItems:"center", gap:4, fontSize:10, fontWeight:700, color:"#92400e", background:"#fffbeb", border:"1px solid #fcd34d", borderRadius:20, padding:"2px 8px" },
  igReplyBtn: { fontSize:10, fontWeight:700, color:"#4A6A8A", background:"#f1f5f9", border:"1px solid #e2e8f0", borderRadius:6, padding:"3px 8px", cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" },
  igReplyBtnActive: { color:"#166534", background:"#dcfce7", border:"1px solid #86efac" },
  igAddBtn: { fontSize:12, color:"#C13584", background:"none", border:"1px dashed #e8b4d8", borderRadius:6, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit", fontWeight:600 },
  igManualInput: { width:"100%", border:"1.5px solid #e8b4d8", borderRadius:7, padding:"5px 8px", fontSize:12, fontFamily:"inherit", color:"#1E3A5F", outline:"none" },
};
