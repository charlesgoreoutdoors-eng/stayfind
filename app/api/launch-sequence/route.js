import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { sequenceId, hotels, userId, skipAlreadyContacted } = await request.json();

    if (!sequenceId || !hotels?.length || !userId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify step 1 exists
    const { data: step1 } = await supabase
      .from("sequence_steps")
      .select("id")
      .eq("sequence_id", sequenceId)
      .eq("step_number", 1)
      .single();

    if (!step1) return Response.json({ error: "No step 1 found for this sequence" }, { status: 400 });

    // List launches skip hotels already targeted by this exact flow, so
    // growing a list and relaunching only reaches the new additions. Checked
    // here (not just client-side) so a stale request or a second launch
    // can't double-queue a hotel — any existing sequence_jobs row for this
    // sequence, regardless of status, counts as "already contacted".
    let targetHotels = hotels;
    let skipped = 0;
    if (skipAlreadyContacted) {
      const hotelIds = hotels.map(h => h.id).filter(Boolean);
      const { data: existingJobs } = await supabase
        .from("sequence_jobs")
        .select("hotel_id")
        .eq("sequence_id", sequenceId)
        .in("hotel_id", hotelIds);
      const alreadyContacted = new Set((existingJobs || []).map(j => j.hotel_id));
      targetHotels = hotels.filter(h => !alreadyContacted.has(h.id));
      skipped = hotels.length - targetHotels.length;
    }

    if (targetHotels.length === 0) {
      return Response.json({ error: "All selected hotels have already been sent this flow." }, { status: 400 });
    }

    // Insert all hotels as step-1 jobs due now.
    // If a hotel has selected Hunter contacts, create one job per selected contact.
    // Otherwise fall back to the hotel's primary email.
    // The cron will pick these up and space them out randomly (30–90 min gaps,
    // 8am–6pm window, daily limit enforced) before sending.
    const now = new Date().toISOString();
    const jobs = targetHotels.flatMap(hotel => {
      const selectedContacts = (hotel.hunter_contacts || []).filter(c => c.selected);
      const targets = selectedContacts.length > 0
        ? selectedContacts.map(c => ({ email: c.value, name: hotel.name }))
        : hotel.email ? [{ email: hotel.email, name: hotel.name }] : [];
      return targets.map(t => ({
        user_id: userId,
        sequence_id: sequenceId,
        hotel_id: hotel.id || null,
        hotel_email: t.email,
        hotel_name: t.name,
        current_step: 1,
        status: "active",
        next_send_at: now,
        started_at: now,
      }));
    });

    if (jobs.length === 0) return Response.json({ error: "No valid email targets found" }, { status: 400 });

    const { error } = await supabase.from("sequence_jobs").insert(jobs);
    if (error) throw error;

    return Response.json({ queued: jobs.length, skipped });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
