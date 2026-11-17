import { createClient } from "@supabase/supabase-js";
import { getStripe, stripeConfigured, planForPrice } from "../../../../lib/stripe";

export const runtime = "nodejs";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const iso = (s) => (s ? new Date(s * 1000).toISOString() : null);

// Copies a Stripe subscription's state onto the user's profile.
async function syncSubscription(sub) {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  let userId = sub.metadata?.user_id || null;
  if (!userId) {
    const { data } = await admin.from("profiles").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.id || null;
  }
  if (!userId) return;

  const { data: profile } = await admin.from("profiles").select("plan, is_admin").eq("id", userId).maybeSingle();
  if (!profile) return;

  const item = sub.items?.data?.[0];
  const planFromPrice = planForPrice(item?.price?.id);
  const live = ["trialing", "active", "past_due"].includes(sub.status);   // keep access while Stripe retries a failed payment

  const update = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    subscription_status: sub.status,
    trial_end: iso(sub.trial_end),
    // newer Stripe API versions keep the period on the subscription item
    current_period_end: iso(sub.current_period_end ?? item?.current_period_end),
    cancel_at_period_end: !!sub.cancel_at_period_end,
  };

  // Founding members and admins are managed by hand — never overwrite their plan.
  if (profile.plan !== "founding" && !profile.is_admin) {
    update.plan = live && planFromPrice ? planFromPrice : "spark";
  }
  await admin.from("profiles").update(update).eq("id", userId);
}

export async function POST(request) {
  if (!stripeConfigured() || !process.env.STRIPE_WEBHOOK_SECRET) {
    return Response.json({ error: "Not configured" }, { status: 503 });
  }
  const stripe = getStripe();
  const body = await request.text();                       // raw body is required for the signature
  const signature = request.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: `Bad signature: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            typeof session.subscription === "string" ? session.subscription : session.subscription.id
          );
          if (!sub.metadata?.user_id && session.client_reference_id) sub.metadata = { ...sub.metadata, user_id: session.client_reference_id };
          await syncSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    // 500 makes Stripe retry the event.
    console.error("[stripe webhook]", event.type, err);
    return Response.json({ error: "Handler failed" }, { status: 500 });
  }
  return Response.json({ received: true });
}
