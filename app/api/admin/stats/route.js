import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "chgore618@gmail.com";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Verify the caller's JWT and confirm they are the admin.
async function requireAdmin(request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false };
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return { ok: false };
  if ((data.user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) return { ok: false };
  return { ok: true, user: data.user };
}

// Fetch every auth user (paginated) → id, email, created_at
async function fetchAllAuthUsers() {
  const all = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page++;
  }
  return all;
}

async function minMaxDate(table, col) {
  const [oldest, newest] = await Promise.all([
    admin.from(table).select(col).order(col, { ascending: true }).limit(1).maybeSingle(),
    admin.from(table).select(col).order(col, { ascending: false }).limit(1).maybeSingle(),
  ]);
  return {
    oldest: oldest.data?.[col] || null,
    newest: newest.data?.[col] || null,
  };
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const now = Date.now();
    const weekAgo  = now - 7  * 24 * 60 * 60 * 1000;
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const monthAgoIso = new Date(monthAgo).toISOString();

    const [
      authUsers,
      profilesRes,
      listsRes,
      hotelsRes,
      activeSeqRes,
      sentSeqRes,
      listsCountRes,
      hotelsCountRes,
      searchCacheCount,
      igCacheCount,
      emailCacheCount,
      searchDates,
      igDates,
      emailDates,
      hunterTotalRes,
      hunterCacheHitsRes,
      hunterApiCallsRes,
      hunterContactsRes,
      hunterMonthRes,
      hunterApiMonthRes,
      hunterRecentRes,
    ] = await Promise.all([
      fetchAllAuthUsers(),
      admin.from("profiles").select("id, full_name, plan"),
      admin.from("lists").select("id, user_id"),
      admin.from("list_hotels").select("user_id"),
      admin.from("sequence_jobs").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("sequence_jobs").select("id", { count: "exact", head: true }).in("status", ["active", "completed"]),
      admin.from("lists").select("id", { count: "exact", head: true }),
      admin.from("list_hotels").select("id", { count: "exact", head: true }),
      admin.from("search_cache").select("id", { count: "exact", head: true }),
      admin.from("instagram_cache").select("id", { count: "exact", head: true }),
      admin.from("email_cache").select("id", { count: "exact", head: true }),
      minMaxDate("search_cache", "created_at"),
      minMaxDate("instagram_cache", "scraped_at"),
      minMaxDate("email_cache", "scraped_at"),
      // Hunter stats
      admin.from("hunter_usage_log").select("id", { count: "exact", head: true }),
      admin.from("hunter_usage_log").select("id", { count: "exact", head: true }).eq("cache_hit", true),
      admin.from("hunter_usage_log").select("id", { count: "exact", head: true }).eq("cache_hit", false),
      admin.from("hunter_usage_log").select("contacts_found"),
      admin.from("hunter_usage_log").select("id", { count: "exact", head: true }).gte("searched_at", monthAgoIso),
      admin.from("hunter_usage_log").select("id", { count: "exact", head: true }).eq("cache_hit", false).gte("searched_at", monthAgoIso),
      admin.from("hunter_usage_log").select("domain, cache_hit, contacts_found, searched_at, user_id").order("searched_at", { ascending: false }).limit(20),
    ]);

    const profiles = profilesRes.data || [];
    const profileById = {};
    profiles.forEach(p => { profileById[p.id] = p; });

    // Per-user list + hotel counts
    const listsByUser = {};
    (listsRes.data || []).forEach(l => { listsByUser[l.user_id] = (listsByUser[l.user_id] || 0) + 1; });
    const hotelsByUser = {};
    (hotelsRes.data || []).forEach(h => { hotelsByUser[h.user_id] = (hotelsByUser[h.user_id] || 0) + 1; });

    const users = authUsers.map(u => {
      const prof = profileById[u.id] || {};
      return {
        id: u.id,
        email: u.email || "—",
        name: prof.full_name || "",
        plan: prof.plan || "free",
        joined: u.created_at,
        lists: listsByUser[u.id] || 0,
        hotels: hotelsByUser[u.id] || 0,
      };
    }).sort((a, b) => new Date(b.joined) - new Date(a.joined));

    const newThisWeek  = authUsers.filter(u => new Date(u.created_at).getTime() >= weekAgo).length;
    const newThisMonth = authUsers.filter(u => new Date(u.created_at).getTime() >= monthAgo).length;

    // Hunter stats
    const hunterTotal = hunterTotalRes.count || 0;
    const hunterCacheHits = hunterCacheHitsRes.count || 0;
    const hunterApiCalls = hunterApiCallsRes.count || 0;
    const hunterContactsFound = (hunterContactsRes.data || []).reduce((sum, r) => sum + (r.contacts_found || 0), 0);
    const hunterMonth = hunterMonthRes.count || 0;
    const hunterApiMonth = hunterApiMonthRes.count || 0;
    const hunterCacheHitRate = hunterTotal > 0 ? Math.round((hunterCacheHits / hunterTotal) * 100) : 0;

    // Enrich recent hunter logs with user email
    const hunterUserIds = [...new Set((hunterRecentRes.data || []).map(r => r.user_id).filter(Boolean))];
    const hunterUserEmails = {};
    if (hunterUserIds.length > 0) {
      const { data: { users: hunterUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
      (hunterUsers || []).filter(u => hunterUserIds.includes(u.id)).forEach(u => { hunterUserEmails[u.id] = u.email; });
    }
    const hunterRecent = (hunterRecentRes.data || []).map(r => ({
      ...r,
      user_email: hunterUserEmails[r.user_id] || "—",
    }));

    // Combine cache oldest/newest across all three tables
    const allOldest = [searchDates.oldest, igDates.oldest, emailDates.oldest].filter(Boolean).sort();
    const allNewest = [searchDates.newest, igDates.newest, emailDates.newest].filter(Boolean).sort();

    return Response.json({
      stats: {
        totalUsers: authUsers.length,
        newThisWeek,
        newThisMonth,
        totalLists: listsCountRes.count || 0,
        totalHotels: hotelsCountRes.count || 0,
        activeSequences: activeSeqRes.count || 0,
        emailsSent: sentSeqRes.count || 0,
      },
      users,
      cache: {
        searchCount: searchCacheCount.count || 0,
        instagramCount: igCacheCount.count || 0,
        emailCount: emailCacheCount.count || 0,
        oldest: allOldest[0] || null,
        newest: allNewest[allNewest.length - 1] || null,
      },
      hunter: {
        totalSearches: hunterTotal,
        cacheHits: hunterCacheHits,
        apiCalls: hunterApiCalls,
        contactsFound: hunterContactsFound,
        searchesThisMonth: hunterMonth,
        apiCallsThisMonth: hunterApiMonth,
        cacheHitRate: hunterCacheHitRate,
        creditsSavedByCache: hunterCacheHits,
        recentSearches: hunterRecent,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return Response.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const { action } = body;

    if (action === "updatePlan") {
      const { userId, plan } = body;
      const allowed = ["free", "starter", "pro", "agency"];
      if (!userId || !allowed.includes(plan)) {
        return Response.json({ error: "Invalid plan" }, { status: 400 });
      }
      const { error } = await admin.from("profiles").update({ plan }).eq("id", userId);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    if (action === "clearCaches") {
      await Promise.all([
        admin.from("search_cache").delete().neq("cache_key", "__none__"),
        admin.from("instagram_cache").delete().neq("domain", "__none__"),
        admin.from("email_cache").delete().neq("domain", "__none__"),
      ]);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
