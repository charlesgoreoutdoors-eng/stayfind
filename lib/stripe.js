// Server-only Stripe helpers. Everything here is dormant until the Stripe
// environment variables are set (see docs/STRIPE_SETUP.md).
import Stripe from "stripe";

export function stripeConfigured() {
  return !!process.env.STRIPE_SECRET_KEY;
}

let client;
export function getStripe() {
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

// Price IDs come from env so test and live modes can differ.
export function priceForPlan(plan) {
  return { glow: process.env.STRIPE_PRICE_GLOW, radiant: process.env.STRIPE_PRICE_RADIANT }[plan] || null;
}

export function planForPrice(priceId) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_GLOW) return "glow";
  if (priceId === process.env.STRIPE_PRICE_RADIANT) return "radiant";
  return null;
}

export const TRIAL_DAYS = 14;

export function siteUrl(request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}
