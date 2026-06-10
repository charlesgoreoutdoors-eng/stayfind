import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { name, userId, steps, sequenceId } = await request.json();

    if (!userId || !name || !steps?.length) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use service role to bypass any RLS issues on sequence_steps
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let seqId = sequenceId;

    if (!seqId) {
      // Create new sequence
      const { data, error } = await supabase
        .from("sequences")
        .insert({ name: name.trim(), user_id: userId })
        .select()
        .single();
      if (error) throw new Error("Failed to create sequence: " + error.message);
      seqId = data.id;
    } else {
      // Update existing
      const { error } = await supabase
        .from("sequences")
        .update({ name: name.trim() })
        .eq("id", seqId)
        .eq("user_id", userId); // security check
      if (error) throw new Error("Failed to update sequence: " + error.message);

      // Delete old steps
      const { error: delError } = await supabase
        .from("sequence_steps")
        .delete()
        .eq("sequence_id", seqId);
      if (delError) throw new Error("Failed to delete steps: " + delError.message);
    }

    // Insert steps
    for (const st of steps) {
      const { error } = await supabase.from("sequence_steps").insert({
        sequence_id: seqId,
        step_number: st.stepNumber,
        template_id: st.templateId || null,
        delay_days: st.delayDays || 0,
        subject: st.subject || "",
        body: st.body,
        user_id: userId,
      });
      if (error) throw new Error(`Step ${st.stepNumber} failed: ${error.message}`);
    }

    return Response.json({ success: true, sequenceId: seqId });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
