import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getAccessTokenForUser } from "../../../lib/gmailServer";

// Called by Supabase pg_cron hourly (0 * * * *)
// Assigns random send times to newly-due jobs, then sends whatever is due right now
export async function POST(request) {
  try {
    const { secret } = await request.json();
    if (secret !== process.env.CRON_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10); // "YYYY-MM-DD"

    // SEND WINDOW: 8am–6pm UTC (adjust to match your user timezone if needed)
    const windowStart = new Date(`${todayStr}T08:00:00.000Z`);
    const windowEnd   = new Date(`${todayStr}T18:00:00.000Z`);

    // ── Step 1: Find all unscheduled active jobs that are overdue ──────────
    // "Unscheduled" = next_send_at is in the past but has no random time
    // assigned yet for today. We identify these as jobs where next_send_at
    // is before now and scheduled_for_date != today.
    const { data: overdueJobs } = await supabase
      .from("sequence_jobs")
      .select("*, sequence_steps!inner(*)")
      .eq("status", "active")
      .lte("next_send_at", now.toISOString())
      .or(`scheduled_for_date.is.null,scheduled_for_date.neq.${todayStr}`);

    // ── Step 2: For each user, assign random send times ───────────────────
    if (overdueJobs && overdueJobs.length > 0) {
      // Group jobs by user
      const byUser = {};
      for (const job of overdueJobs) {
        if (!byUser[job.user_id]) byUser[job.user_id] = [];
        byUser[job.user_id].push(job);
      }

      for (const [userId, jobs] of Object.entries(byUser)) {
        // Get this user's daily limit from profiles
        const { data: profileData } = await supabase
          .from("profiles").select("daily_email_limit").eq("id", userId).single();
        const MAX_PER_DAY = profileData?.daily_email_limit ?? 30;

        // How many emails already sent today via email_send_log?
        const { count: sentToday } = await supabase
          .from("email_send_log")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("sent_at", `${todayStr}T00:00:00.000Z`)
          .lte("sent_at", `${todayStr}T23:59:59.999Z`);

        // How many are already scheduled for today (not yet sent)?
        const { count: scheduledToday } = await supabase
          .from("sequence_jobs")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("scheduled_for_date", todayStr)
          .eq("status", "active");

        const alreadyScheduled = (sentToday || 0) + (scheduledToday || 0);
        const remaining = MAX_PER_DAY - alreadyScheduled;

        // Start assigning from the later of: now or window start
        let cursor = new Date(Math.max(now.getTime(), windowStart.getTime()));

        for (let i = 0; i < jobs.length; i++) {
          const job = jobs[i];

          if (i >= remaining) {
            // Over daily limit — push to tomorrow 8am
            const tomorrow = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
            await supabase.from("sequence_jobs").update({
              next_send_at: tomorrow.toISOString(),
              scheduled_for_date: null, // will be assigned tomorrow
            }).eq("id", job.id);
            continue;
          }

          // If cursor has gone past window end, push to tomorrow
          if (cursor >= windowEnd) {
            const tomorrow = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000);
            await supabase.from("sequence_jobs").update({
              next_send_at: tomorrow.toISOString(),
              scheduled_for_date: null,
            }).eq("id", job.id);
            continue;
          }

          // Assign this slot
          await supabase.from("sequence_jobs").update({
            next_send_at: cursor.toISOString(),
            scheduled_for_date: todayStr,
          }).eq("id", job.id);

          // Advance cursor by 30–90 random minutes
          const gapMinutes = 30 + Math.floor(Math.random() * 61);
          cursor = new Date(cursor.getTime() + gapMinutes * 60 * 1000);
        }
      }
    }

    // ── Step 3: Send everything due right now ─────────────────────────────
    const { data: dueJobs } = await supabase
      .from("sequence_jobs")
      .select("*, sequence_steps!inner(*)")
      .eq("status", "active")
      .lte("next_send_at", now.toISOString());

    if (!dueJobs || dueJobs.length === 0) {
      return Response.json({ scheduled: overdueJobs?.length || 0, sent: 0 });
    }

    let sent = 0;
    const tokenCache = {}; // user_id -> access token (minted from refresh token)
    const labelCache = {}; // user_id -> StayFind label_id

    for (const job of dueJobs) {
      try {
        // 0. Get a fresh access token + label id for this user
        if (!(job.user_id in tokenCache)) {
          const tok = await getAccessTokenForUser(job.user_id);
          tokenCache[job.user_id] = tok?.accessToken || null;
          const { data: gmailRow } = await supabase
            .from("gmail_accounts").select("label_id").eq("user_id", job.user_id).maybeSingle();
          labelCache[job.user_id] = gmailRow?.label_id || null;
        }
        const accessToken = tokenCache[job.user_id];
        if (!accessToken) {
          // User has no connected Gmail / refresh token is dead — skip; they can reconnect.
          continue;
        }

        // 1. Check for replies first
        const labelId = labelCache[job.user_id];
        const hasReply = await checkForReply(job.hotel_email, accessToken, labelId);
        if (hasReply) {
          await supabase.from("sequence_jobs").update({
            status: "replied",
            replied_at: now.toISOString(),
            completed_at: now.toISOString(),
          }).eq("id", job.id);
          sent++;
          continue;
        }

        // 2. Get the current step
        const { data: step } = await supabase
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", job.sequence_id)
          .eq("step_number", job.current_step)
          .single();

        if (!step) continue;

        // 3. Send the email
        const body    = (step.body    || "").replace(/\{hotel_name\}/g, job.hotel_name);
        const subject = (step.subject || "Collaboration Opportunity").replace(/\{hotel_name\}/g, job.hotel_name);
        const sentMessageId = await sendEmail(accessToken, job.hotel_email, subject, body);

        // 3a. Log to email_send_log
        await supabase.from("email_send_log").insert({
          user_id: job.user_id,
          sequence_job_id: job.id,
          hotel_email: job.hotel_email,
          hotel_name: job.hotel_name,
        });

        // 4. Schedule next step or mark complete
        const { data: nextStep } = await supabase
          .from("sequence_steps")
          .select("*")
          .eq("sequence_id", job.sequence_id)
          .eq("step_number", job.current_step + 1)
          .single();

        if (nextStep) {
          const nextSendAt = new Date(now.getTime() + nextStep.delay_days * 24 * 60 * 60 * 1000);
          await supabase.from("sequence_jobs").update({
            current_step: job.current_step + 1,
            next_send_at: nextSendAt.toISOString(),
            scheduled_for_date: null, // will be randomised when due
          }).eq("id", job.id);
        } else {
          await supabase.from("sequence_jobs").update({
            status: "completed",
            completed_at: now.toISOString(),
          }).eq("id", job.id);
        }

        sent++;
      } catch (e) {
        console.error(`Error processing job ${job.id}:`, e);
      }
    }

    return Response.json({ scheduled: overdueJobs?.length || 0, sent });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

const GENERIC_DOMAINS = new Set([
  "gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","hotmail.com",
  "hotmail.co.uk","outlook.com","live.com","icloud.com","me.com",
  "mac.com","aol.com","msn.com","protonmail.com","proton.me",
]);

async function checkForReply(hotelEmail, accessToken, labelId) {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Exact email match
    const res = await gmail.users.messages.list({
      userId: "me",
      q: `from:${hotelEmail} in:inbox`,
      maxResults: 5,
    });
    let messages = res.data.messages || [];

    // Domain fallback: catches replies from a different address at the same hotel
    if (messages.length === 0) {
      const domain = hotelEmail.split("@")[1]?.toLowerCase();
      if (domain && !GENERIC_DOMAINS.has(domain)) {
        const domainRes = await gmail.users.messages.list({
          userId: "me",
          q: `from:@${domain} in:inbox`,
          maxResults: 5,
        });
        messages = domainRes.data.messages || [];
      }
    }

    // Auto-label incoming replies with StayFind label
    if (messages.length > 0 && labelId) {
      await Promise.allSettled(messages.map(m => applyLabel(accessToken, m.id, labelId)));
    }
    return messages.length > 0;
  } catch {
    return false;
  }
}

async function applyLabel(accessToken, messageId, labelId) {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  await gmail.users.messages.modify({
    userId: "me",
    id: messageId,
    requestBody: { addLabelIds: [labelId] },
  });
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

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
  return res.data.id; // return message id so caller can apply label
}
