import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { sequenceId, hotels, userId } = await request.json();

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

    // Insert all hotels as step-1 jobs due now.
    // The cron will pick these up and space them out randomly (30–90 min gaps,
    // 8am–6pm window, daily limit enforced) before sending.
    const now = new Date().toISOString();
    const jobs = hotels.map(hotel => ({
      user_id: userId,
      sequence_id: sequenceId,
      hotel_id: hotel.id || null,
      hotel_email: hotel.email,
      hotel_name: hotel.name,
      current_step: 1,
      status: "active",
      next_send_at: now,
      started_at: now,
    }));

    const { error } = await supabase.from("sequence_jobs").insert(jobs);
    if (error) throw error;

    return Response.json({ queued: hotels.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
