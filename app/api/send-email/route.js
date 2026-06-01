import { google } from "googleapis";

export async function POST(request) {
  try {
    const { accessToken, to, subject, body, fromName } = await request.json();

    if (!accessToken || !to || !subject || !body) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const message = [
      `From: ${fromName || "Me"} <me>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body,
    ].join("\n");

    const encoded = Buffer.from(message)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encoded },
    });

    return Response.json({ success: true });
  } catch (err) {
    console.error("Send email error:", err);
    return Response.json({ error: err.message || "Failed to send email" }, { status: 500 });
  }
}
