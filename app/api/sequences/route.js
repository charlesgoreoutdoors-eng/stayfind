import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";

// This route is called by Supabase pg_cron daily
// It processes due sequence jobs, checks for replies, and sends emails
export async function POST(request) {
  try {
    const { secret } = await request.json();

    // Basic auth to prevent unauthorized calls
    if (secret !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // needs service role for cron
    );

    const now = new Date();

    // Get all active jobs that are due to send
    const { data: dueJobs } = await supabase
      .from("sequence_jobs")
      .select("*, sequence_steps!inner(*)")
      .eq("status", "active")
      .lte("next_send_at", now.toISOString());

    if (!dueJobs || dueJobs.length === 0) {
      return Response.json({ processed: 0 });
    }

    let processed = 0;

    for (const job of dueJobs) {
      try {
        // 1. Check for replies first
        const hasReply = await checkForReply(job.hotel_email, job.gmail_token);
        if (hasReply) {
          await supabase.from("sequence_jobs").update({
            status: "replied",
            replied_at: now.toISOString(),
            completed_at: now.toISOString(),
          }).eq("id", job.id);
          processed++;
          continue;
        }

        // 2. Get the current step details
        const { data: step } = await supabase
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", job.sequence_id)
          .eq("step_number", job.current_step)
          .single();

        if (!step) continue;

        // 3. Send the email
        const body = (step.body || "").replace(/\{hotel_name\}/g, job.hotel_name);
        const subject = (step.subject || "Collaboration Opportunity").replace(/\{hotel_name\}/g, job.hotel_name);
        await sendEmail(job.gmail_token, job.hotel_email, subject, body);

        // 4. Check if there's a next step
        const { data: nextStep } = await supabase
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", job.sequence_id)
          .eq("step_number", job.current_step + 1)
          .single();

        if (nextStep) {
          // Schedule next step
          const nextSendAt = new Date(now.getTime() + nextStep.delay_days * 24 * 60 * 60 * 1000);
          await supabase.from("sequence_jobs").update({
            current_step: job.current_step + 1,
            next_send_at: nextSendAt.toISOString(),
          }).eq("id", job.id);
        } else {
          // Sequence complete
          await supabase.from("sequence_jobs").update({
            status: "completed",
            completed_at: now.toISOString(),
          }).eq("id", job.id);
        }

        processed++;
      } catch (e) {
        console.error(`Error processing job ${job.id}:`, e);
      }
    }

    return Response.json({ processed });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

async function checkForReply(hotelEmail, accessToken) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const res = await gmail.users.messages.list({
      userId: "me",
      q: `from:${hotelEmail} in:inbox`,
      maxResults: 1,
    });

    return (res.data.messages || []).length > 0;
  } catch {
    return false;
  }
}

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

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}
