import * as Sentry from "@sentry/nextjs";

// Error monitoring. Does nothing unless NEXT_PUBLIC_SENTRY_DSN is set.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0,          // errors only, no performance tracing
    sendDefaultPii: false,        // don't attach IPs / user details
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
    ],
  });
}
