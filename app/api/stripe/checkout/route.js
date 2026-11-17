import { createClient } from "@supabase/supabase-js";
import { getStripe, stripeConfigured, priceForPlan, TRIAL_DAYS, siteUrl } from "../../../../lib/stripe";

export const runtime = "nodejs";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Starts a Stripe Checkout session for Glow or Radiant: 14-day trial, card required.
export async function POST(request) {
  if (!stripeConfigured()) return Response.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const { plan } = await request.json().catch(() => ({}));
  const price = priceForPlan(plan);
  if (!price) return Response.json({ error: "Unknown plan." }, { status: 400 });

  const { data: profile } = await admin.from("profiles")
    .select("plan, role, stripe_customer_id, stripe_subscription_id, subscription_status, trial_end")
    .eq("id", user.id).maybeSingle();
  if (profile?.role === "hotel") return Response.json({ error: "Plans are for creator accounts." }, { status: 400 });
  if (profile?.plan === "founding") return Response.json({ error: "You're a founding member — no payment needed." }, { status: 400 });
  if (profile?.stripe_subscription_id && ["trialing", "active", "past_due"].includes(profile.subscription_status)) {
    return Response.json({ error: "You already have a subscription. Use Manage billing to change it." }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = siteUrl(request);

  // Reuse the Stripe customer if we have one.
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  // Trial only the first time — people who've already had one pay straight away.
  const hadTrial = !!profile?.trial_end;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    payment_method_collection: "always",
    allow_promotion_codes: true,
    subscription_data: {
      ...(hadTrial ? {} : { trial_period_days: TRIAL_DAYS }),
      metadata: { user_id: user.id },
    },
    success_url: `${origin}/settings?billing=success`,
    cancel_url: `${origin}/settings?billing=cancelled`,
  });

  return Response.json({ url: session.url });
}
