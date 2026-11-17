const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["maps.googleapis.com"],
  },
  experimental: {
    instrumentationHook: true,
  },
};

// Sentry error monitoring. Source-map upload only happens if SENTRY_AUTH_TOKEN
// (plus SENTRY_ORG / SENTRY_PROJECT) are set in Vercel; otherwise it's skipped.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  telemetry: false,
  disableLogger: true,
});
