import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const CACHE_DAYS = 90;

const TITLE_PRIORITY = [
  ["marketing manager", "marketing director", "marketing coordinator"],
  ["social media manager", "social media director"],
  ["pr manager", "communications manager"],
  ["general manager"],
];

function rankContact(contact) {
  const title = (contact.position || "").toLowerCase();
  for (let i = 0; i < TITLE_PRIORITY.length; i++) {
    if (TITLE_PRIORITY[i].some(t => title.includes(t))) return i;
  }
  return TITLE_PRIORITY.length;
}

function bestContact(contacts) {
  if (!contacts || contacts.length === 0) return null;
  const withEmails = contacts.filter(c => c.value);
  if (withEmails.length === 0) return null;
  return [...withEmails].sort((a, b) => rankContact(a) - rankContact(b))[0];
}

export async function POST(request) {
  try {
    const { domain, hotelId, userId } = await request.json();
    if (!domain || !userId) return Response.json({ error: "Missing domain or userId" }, { status: 400 });

    const cutoff = new Date(Date.now() - CACHE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Check cache first
    const { data: cached } = await supabase
      .from("hunter_cache")
      .select("contacts")
      .eq("domain", domain)
      .gte("cached_at", cutoff)
      .maybeSingle();

    if (cached) {
      const contacts = (cached.contacts || []).filter(c => c.value);
      await supabase.from("hunter_usage_log").insert({
        user_id: userId,
        hotel_id: hotelId || null,
        domain,
        cache_hit: true,
        contacts_found: contacts.length,
      });
      return Response.json({ contacts, cached: true });
    }

    // Call Hunter.io Domain Search API
    const hunterRes = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${process.env.HUNTER_API_KEY}`
    );
    const hunterData = await hunterRes.json();
    const emails = hunterData?.data?.emails || [];

    const contacts = emails.map(e => ({
      name: [e.first_name, e.last_name].filter(Boolean).join(" "),
      position: e.position || "",
      value: e.value || "",
      confidence: e.confidence || 0,
    }));

    // Save to cache
    await supabase.from("hunter_cache").upsert(
      { domain, contacts, cached_at: new Date().toISOString() },
      { onConflict: "domain" }
    );

    // Log usage
    await supabase.from("hunter_usage_log").insert({
      user_id: userId,
      hotel_id: hotelId || null,
      domain,
      cache_hit: false,
      contacts_found: contacts.length,
    });

    const withEmails = contacts.filter(c => c.value);
    return Response.json({ contacts: withEmails, cached: false });
  } catch (err) {
    console.error("[hunter]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
