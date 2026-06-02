import { google } from "googleapis";

export async function POST(request) {
  try {
    const { accessToken, hotelEmails } = await request.json();

    if (!accessToken) return Response.json({ error: "No access token" }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Build a query to find emails from any of the hotel email addresses
    if (!hotelEmails || hotelEmails.length === 0) {
      return Response.json({ threads: [] });
    }

    const fromQuery = hotelEmails.map(e => `from:${e}`).join(" OR ");
    const query = `(${fromQuery})`;

    const listRes = await gmail.users.threads.list({
      userId: "me",
      q: query,
      maxResults: 50,
    });

    const threadItems = listRes.data.threads || [];

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

            // Extract body
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

            // Strip quoted reply chains (lines starting with >)
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
            };
          });

          // Determine hotel email from the thread
          const hotelMsg = messages.find(m => hotelEmails.some(e => m.from.includes(e)));
          const hotelEmail = hotelEmails.find(e => messages.some(m => m.from.includes(e)));

          return {
            id: t.id,
            hotelEmail,
            subject: messages[0]?.subject || "(no subject)",
            messages: messages.sort((a, b) => a.timestamp - b.timestamp),
            lastReply: messages.filter(m => hotelEmail && m.from.includes(hotelEmail)).pop(),
            messageCount: messages.length,
            lastTimestamp: Math.max(...messages.map(m => m.timestamp)),
          };
        } catch (e) {
          return null;
        }
      })
    );

    return Response.json({
      threads: threads
        .filter(Boolean)
        .filter(t => t.hotelEmail && t.lastReply)
        .sort((a, b) => b.lastTimestamp - a.lastTimestamp),
    });
  } catch (err) {
    console.error("Messages error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
