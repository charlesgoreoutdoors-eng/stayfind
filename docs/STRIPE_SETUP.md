# Stripe setup (do this on desktop)

The billing code is already in the app and switched OFF. It turns on when you add the keys below.
Until then Settings → Plan & Billing keeps the "Upgrade plan" email link.

## 0. Before you start
- [ ] Register the business (name + ABN). Stripe asks for it, and it goes in the Terms/Privacy Policy.
- [ ] Decide currency (USD or AUD) and GST. If you're GST-registered, tick "Collect tax" / use Stripe Tax so GST is added for Australian customers.
- [ ] Confirm prices: Glow $29/mo, Radiant $79/mo (change them here if you decide differently).

## 1. Stripe dashboard (start in TEST mode — toggle top-right)
1. Create a Stripe account (stripe.com) and complete business verification.
2. **Products** → create two products, each with one recurring monthly price:
   - `Dapples Glow` — $29 / month
   - `Dapples Radiant` — $79 / month
   Copy each **Price ID** (starts with `price_`).
3. **Settings → Billing → Customer portal** → activate it. Allow: update payment method, view invoices, cancel subscription, and switch plans between Glow and Radiant.
4. **Developers → API keys** → copy the **Secret key** (`sk_test_...`).
5. **Developers → Webhooks → Add endpoint**
   - URL: `https://dapples.io/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the **Signing secret** (`whsec_...`).

## 2. Vercel environment variables (Project → Settings → Environment Variables)
| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_...` (live key later) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` |
| `STRIPE_PRICE_GLOW` | `price_...` |
| `STRIPE_PRICE_RADIANT` | `price_...` |
| `NEXT_PUBLIC_SITE_URL` | `https://dapples.io` |
| `NEXT_PUBLIC_STRIPE_ENABLED` | `true` (this is what shows the buttons — set it last) |

Redeploy after adding them.

## 3. Test it (test mode)
1. Log in as a free (Spark) test user → Settings → Plan & Billing → "Start 14-day free trial".
2. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC.
3. You should land back on Settings; within a few seconds the plan shows Glow with "Free trial — card charged on ...".
4. Check in Stripe: Customers → the subscription is "Trialing". Check Supabase `profiles`: `plan = glow`, `subscription_status = trialing`.
5. Click "Manage billing" → cancel → plan should drop back to Spark when it ends.
6. Failed payment test card: `4000 0000 0000 0341`.
7. Webhook health: Stripe → Developers → Webhooks → the endpoint should show 200 responses.

## 4. Go live
1. Switch Stripe to live mode, recreate the 2 products/prices, the webhook endpoint and the portal settings (test and live are separate).
2. Replace the 4 Stripe env vars with the live values and redeploy.
3. Do one real payment with your own card, then refund it.

## How it works (for reference)
- Founding members (`plan = founding`) are never changed by Stripe — you manage them by hand.
- Access follows the subscription: trialing / active / past_due keep the paid plan; cancelled or unpaid drops to Spark.
- People who already used a trial pay straight away if they come back.
- Deleting an account cancels its subscription.
- Billing columns on `profiles` can only be written by the server.

## Still to do after Stripe works
- Update the Terms of Service if refund or trial wording changes.
- Add GST / tax details to invoices (Stripe → Settings → Business → Invoices).
- Optional: yearly plans (add a yearly price + a toggle), and a public pricing page.
