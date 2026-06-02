import { google } from "googleapis";

export async function POST(request) {
  try {
    const { accessToken, to, subject, body, threadId, messageId } = await request.json();
    if (!accessToken) return Response.json({ error: "No access token" }, { status: 401 });

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const replySubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;
    const raw = Buffer.from([
      `To: ${to}`,
      `Subject: ${replySubject}`,
      `In-Reply-To: ${messageId}`,
      `References: ${messageId}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ].join("\n"))
      .toString("base64")
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw, threadId },
    });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
