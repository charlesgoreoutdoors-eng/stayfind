import { createClient } from "@supabase/supabase-js";
import { getStripe, stripeConfigured, siteUrl } from "../../../../lib/stripe";

export const runtime = "nodejs";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Opens Stripe's hosted billing portal (change plan, update card, cancel, invoices).
export async function POST(request) {
  if (!stripeConfigured()) return Response.json({ error: "Billing isn't set up yet." }, { status: 503 });

  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return Response.json({ error: "Please sign in again." }, { status: 401 });

  const { data: profile } = await admin.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  if (!profile?.stripe_customer_id) return Response.json({ error: "No billing account yet." }, { status: 400 });

  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${siteUrl(request)}/settings`,
  });
  return Response.json({ url: session.url });
}
