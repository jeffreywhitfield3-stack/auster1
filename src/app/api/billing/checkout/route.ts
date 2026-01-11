// src/app/api/billing/checkout/route.ts
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Use Stripe without apiVersion to avoid TS literal mismatches
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function siteUrl() {
  // IMPORTANT: set NEXT_PUBLIC_SITE_URL in Vercel to https://austerian.com
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

function priceFor(plan: string | null) {
  if (plan === "annual") return process.env.STRIPE_PRICE_PRO_ANNUAL;
  return process.env.STRIPE_PRICE_PRO_MONTHLY;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { auth: { persistSession: false } });
}

function isActiveStatus(status?: string | null) {
  return status === "active" || status === "trialing";
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const plan = (u.searchParams.get("plan") || "monthly").toLowerCase();
  const priceId = priceFor(plan);

  if (!priceId) {
    return NextResponse.json({ error: "missing_price_id" }, { status: 500 });
  }

  // ✅ MUST be logged in (server-enforced)
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Always force login first; after login user returns to pricing
    return NextResponse.redirect(
      `${siteUrl()}/login?next=${encodeURIComponent("/pricing")}`,
      { status: 303 }
    );
  }

  const admin = supabaseAdmin();

  // ✅ If already subscribed, do NOT allow creating a second subscription
  // Prefer Stripe Portal instead.
  const { data: subRow } = await admin
    .from("stripe_subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isActiveStatus(subRow?.status)) {
    return NextResponse.redirect(`${siteUrl()}/api/billing/portal`, { status: 303 });
  }

  // (Optional extra guard) entitlements also indicates paid
  const { data: entRow } = await admin
    .from("entitlements")
    .select("is_paid, plan")
    .eq("user_id", user.id)
    .maybeSingle();

  if (Boolean(entRow?.is_paid) || entRow?.plan === "pro") {
    return NextResponse.redirect(`${siteUrl()}/api/billing/portal`, { status: 303 });
  }

  // Find or create Stripe customer
  const { data: existing, error: existingErr } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingErr) {
    return NextResponse.json({ error: "db_read_failed", detail: existingErr.message }, { status: 500 });
  }

  let customerId = existing?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });

    customerId = customer.id;

    const { error: insertErr } = await admin
      .from("stripe_customers")
      .insert({ user_id: user.id, stripe_customer_id: customerId });

    if (insertErr) {
      return NextResponse.json({ error: "db_insert_failed", detail: insertErr.message }, { status: 500 });
    }
  }

  // ✅ Keep it simple: success returns home; cancel returns pricing
  const success = `${siteUrl()}/?checkout=success`;
  const cancel = `${siteUrl()}/pricing?checkout=cancel`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: success,
    cancel_url: cancel,
    allow_promotion_codes: true,

    // IMPORTANT: store user_id on subscription metadata for webhook
    subscription_data: {
      metadata: { user_id: user.id },
    },
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}