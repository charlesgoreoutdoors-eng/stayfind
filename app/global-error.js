"use client";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

// Catches crashes in the root layout / any page and reports them.
export default function GlobalError({ error, reset }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif", background: "#FBF5EA", color: "#2B2722" }}>
        <div style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, marginBottom: 10 }}>Something went wrong</h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#5b544b", marginBottom: 20 }}>
            We&rsquo;ve been notified and will look into it. Try again, or email hello@dapples.io if it keeps happening.
          </p>
          <button onClick={() => reset()} style={{ background: "#44503A", color: "#FBF5EA", border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
