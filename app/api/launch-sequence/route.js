import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function sendEmail(accessToken, to, subject, body) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const raw = Buffer.from([
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body,
  ].join("\n"))
    .toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw } });
}

export async function POST(request) {
  try {
    const { sequenceId, hotels, gmailToken, userId } = await request.json();

    if (!sequenceId || !hotels?.length || !gmailToken || !userId) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Fetch step 1
    const { data: step1 } = await supabase
      .from("sequence_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .eq("step_number", 1)
      .single();

    if (!step1) return Response.json({ error: "No step 1 found for this sequence" }, { status: 400 });

    // Fetch step 2 (if exists) to know when to schedule the next send
    const { data: step2 } = await supabase
      .from("sequence_steps")
      .select("*")
      .eq("sequence_id", sequenceId)
      .eq("step_number", 2)
      .maybeSingle();

    const now = new Date();
    let sent = 0;
    let failed = 0;
    const jobs = [];

    // Send step 1 immediately to each hotel
    for (const hotel of hotels) {
      try {
        const subject = (step1.subject || "Collaboration Opportunity").replace(/\{hotel_name\}/g, hotel.name);
        const body = (step1.body || "").replace(/\{hotel_name\}/g, hotel.name);
        await sendEmail(gmailToken, hotel.email, subject, body);
        sent++;

        if (step2) {
          // Schedule from step 2 onwards via cron
          const nextSendAt = new Date(now.getTime() + step2.delay_days * 24 * 60 * 60 * 1000);
          jobs.push({
            user_id: userId,
            sequence_id: sequenceId,
            hotel_id: hotel.id,
            hotel_email: hotel.email,
            hotel_name: hotel.name,
            current_step: 2,
            status: "active",
            gmail_token: gmailToken,
            next_send_at: nextSendAt.toISOString(),
          });
        } else {
          // Only 1 step — mark completed immediately
          jobs.push({
            user_id: userId,
            sequence_id: sequenceId,
            hotel_id: hotel.id,
            hotel_email: hotel.email,
            hotel_name: hotel.name,
            current_step: 1,
            status: "completed",
            gmail_token: gmailToken,
            next_send_at: now.toISOString(),
            completed_at: now.toISOString(),
          });
        }
      } catch (e) {
        failed++;
        // Still insert a job so it retries via cron
        jobs.push({
          user_id: userId,
          sequence_id: sequenceId,
          hotel_id: hotel.id,
          hotel_email: hotel.email,
          hotel_name: hotel.name,
          current_step: 1,
          status: "active",
          gmail_token: gmailToken,
          next_send_at: now.toISOString(),
        });
      }
    }

    if (jobs.length > 0) {
      const { error } = await supabase.from("sequence_jobs").insert(jobs);
      if (error) throw error;
    }

    return Response.json({ sent, failed, total: hotels.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
