// src/app/api/billing/webhook/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Use Stripe without apiVersion to avoid TS literal mismatches
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { auth: { persistSession: false } });
}

// Helper: map Stripe status -> paid entitlement boolean
function isActiveSubscriptionStatus(status: Stripe.Subscription.Status) {
  return status === "active" || status === "trialing";
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "missing_signature_or_secret" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json(
      { error: "bad_signature", detail: String(err?.message ?? err) },
      { status: 400 }
    );
  }

  const admin = supabaseAdmin();

  try {
    // We’ll derive these from the event, then retrieve the subscription from Stripe for canonical fields
    let subscriptionId: string | null = null;
    let customerId: string | null = null;

    switch (event.type) {
      case "checkout.session.completed": {
        // The checkout session contains subscription + customer
        const session = event.data.object as Stripe.Checkout.Session;

        subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id ?? null;

        customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id ?? null;

        // Optional safety net: backfill stripe_customers mapping using client_reference_id
        if (customerId && session.client_reference_id) {
          const userId = session.client_reference_id;

          await admin
            .from("stripe_customers")
            .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        subscriptionId = sub.id;
        customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        // ✅ Your installed Stripe types may not include `subscription` on Invoice, but it exists at runtime.
        const inv = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
          customer?: string | Stripe.Customer | null;
        };

        subscriptionId =
          typeof inv.subscription === "string"
            ? inv.subscription
            : inv.subscription?.id ?? null;

        customerId =
          typeof inv.customer === "string"
            ? inv.customer
            : inv.customer?.id ?? null;

        break;
      }

      default:
        // Ignore other events
        return NextResponse.json({ received: true });
    }

    if (!subscriptionId || !customerId) {
      return NextResponse.json({ received: true });
    }

    // ✅ Canonical subscription fetch (TS may return Subscription | DeletedSubscription)
    const subAny = await stripe.subscriptions.retrieve(subscriptionId);

    // If Stripe returns a DeletedSubscription, treat as not paid / ignore update
    if ((subAny as any)?.deleted) {
      return NextResponse.json({ received: true, note: "subscription_deleted" });
    }

    const sub = subAny as Stripe.Subscription;

    const subCustomerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

    // Find user_id for this Stripe customer
    const { data: custRow, error: custErr } = await admin
      .from("stripe_customers")
      .select("user_id, stripe_customer_id")
      .eq("stripe_customer_id", subCustomerId)
      .maybeSingle();

    if (custErr) {
      return NextResponse.json(
        { error: "db_customer_lookup_failed", detail: custErr.message },
        { status: 500 }
      );
    }

    const userId = custRow?.user_id ?? null;
    if (!userId) {
      return NextResponse.json({ received: true, note: "no_user_mapping_for_customer" });
    }


const currentPeriodEnd =
  (sub as unknown as { current_period_end?: number }).current_period_end ??
  // fallback if typings ever used camelCase (rare)
  (sub as unknown as { currentPeriodEnd?: number }).currentPeriodEnd ??
  null;

if (!currentPeriodEnd) {
  // If Stripe ever omits it for some reason, don’t crash the webhook
  return NextResponse.json({ received: true, note: "missing_current_period_end" });
}

    const status = sub.status; // "active" | "trialing" | "canceled" | ...
    const paid = isActiveSubscriptionStatus(status);

    // Store subscription record
    await admin.from("stripe_subscriptions").upsert(
      {
        user_id: userId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: subCustomerId,
        status,
        current_period_end: new Date(currentPeriodEnd * 1000).toISOString(),
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
      },
      { onConflict: "stripe_subscription_id" }
    );

    // Store entitlement (sitewide)
    await admin.from("entitlements").upsert(
      {
        user_id: userId,
        plan: paid ? "pro" : "free",
        is_paid: paid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: "webhook_failed", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}