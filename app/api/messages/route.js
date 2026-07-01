import { google } from "googleapis";
import { requireUser, gmailAdmin } from "../../../lib/gmailServer";

const LABEL_NAME = "StayFind";

async function getOrCreateLabel(gmail) {
  const listRes = await gmail.users.labels.list({ userId: "me" });
  const existing = (listRes.data.labels || []).find(l => l.name === LABEL_NAME);
  if (existing) return existing.id;
  const createRes = await gmail.users.labels.create({
    userId: "me",
    requestBody: { name: LABEL_NAME, labelListVisibility: "labelShow", messageListVisibility: "show" },
  });
  return createRes.data.id;
}

export async function POST(request) {
  try {
    const user = await requireUser(request);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const accessToken = body.accessToken;
    if (!accessToken) return Response.json({ error: "No access token" }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Ensure StayFind label exists
    let labelId = null;
    try {
      const { data: gmailRow } = await gmailAdmin
        .from("gmail_accounts").select("label_id").eq("user_id", user.id).maybeSingle();
      labelId = gmailRow?.label_id || null;

      if (!labelId) {
        labelId = await getOrCreateLabel(gmail);
        if (labelId) {
          await gmailAdmin.from("gmail_accounts")
            .update({ label_id: labelId }).eq("user_id", user.id);
        }
      }
    } catch (e) {
      console.error("[messages] label lookup failed:", e.message);
    }

    // Fetch my Gmail address once (to distinguish sent vs received)
    let myEmail = "";
    try {
      const meRes = await gmail.users.getProfile({ userId: "me" });
      myEmail = meRes.data.emailAddress || "";
    } catch {}

    // Query threads in the StayFind label
    const listRes = await gmail.users.threads.list({
      userId: "me",
      q: `label:${LABEL_NAME}`,
      maxResults: 50,
    });

    const threadItems = listRes.data.threads || [];
    if (threadItems.length === 0) return Response.json({ threads: [] });

    // Fetch full thread details
    const threads = await Promise.all(
      threadItems.map(async (t) => {
        try {
          const threadRes = await gmail.users.threads.get({
            userId: "me",
            id: t.id,
            format: "full",
          });

          const messages = (threadRes.data.messages || []).map(msg => {
            const headers = msg.payload?.headers || [];
            const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

            const from = get("From");
            const to = get("To");
            const subject = get("Subject");
            const date = get("Date");

            let body = "";
            const extractBody = (part) => {
              if (!part) return;
              if (part.mimeType === "text/plain" && part.body?.data) {
                body = Buffer.from(part.body.data, "base64").toString("utf-8");
              } else if (part.mimeType === "text/html" && part.body?.data && !body) {
                const html = Buffer.from(part.body.data, "base64").toString("utf-8");
                body = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
              } else if (part.parts) {
                part.parts.forEach(extractBody);
              }
            };
            extractBody(msg.payload);

            const cleanBody = body
              .split("\n")
              .filter(line => !line.trim().startsWith(">"))
              .join("\n")
              .replace(/On .+wrote:/gs, "")
              .trim();

            return {
              id: msg.id,
              threadId: msg.threadId,
              from,
              to,
              subject,
              date,
              timestamp: new Date(date).getTime(),
              body: cleanBody,
              snippet: msg.snippet || "",
              labelIds: msg.labelIds || [],
            };
          });

          // Auto-label incoming (non-sent) messages in this thread missing the StayFind label
          if (labelId) {
            const unlabeled = messages.filter(m => !m.labelIds.includes(labelId) && !m.labelIds.includes("SENT"));
            if (unlabeled.length > 0) {
              await Promise.allSettled(unlabeled.map(m =>
                gmail.users.messages.modify({
                  userId: "me",
                  id: m.id,
                  requestBody: { addLabelIds: [labelId] },
                })
              ));
            }
          }

          // Find hotel email (any sender that isn't me)
          const hotelEmail = messages
            .map(m => {
              const match = m.from.match(/<(.+?)>/) || [null, m.from];
              return match[1];
            })
            .find(e => e && myEmail && !e.toLowerCase().includes(myEmail.toLowerCase())) || "";

          const lastReply = messages
            .filter(m => hotelEmail && m.from.toLowerCase().includes(hotelEmail.toLowerCase()))
            .pop();

          return {
            id: t.id,
            hotelEmail,
            subject: messages[0]?.subject || "(no subject)",
            messages: messages.sort((a, b) => a.timestamp - b.timestamp),
            lastReply,
            messageCount: messages.length,
            lastTimestamp: Math.max(...messages.map(m => m.timestamp || 0)),
          };
        } catch (e) {
          console.error("[messages] thread fetch failed:", e.message);
          return null;
        }
      })
    );

    return Response.json({
      threads: threads
        .filter(Boolean)
        .filter(t => t.lastReply)
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp),
    });
  } catch (err) {
    console.error("Messages error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
