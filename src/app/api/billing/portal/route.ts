// src/app/api/billing/portal/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function siteUrl() {
  // Make sure this is set in Vercel: https://austerian.com
  return process.env.NEXT_PUBLIC_SITE_URL || "https://austerian.com";
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !service) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, service, { auth: { persistSession: false } });
}

export async function GET() {
  // ✅ Identify user from SSR cookie session
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Force login first, then come back here
    return NextResponse.redirect(
      `${siteUrl()}/login?next=${encodeURIComponent("/pricing")}`,
      { status: 303 }
    );
  }

  const admin = supabaseAdmin();

  // ✅ Lookup Stripe customer id for this user
  const { data: row, error } = await admin
    .from("stripe_customers")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "db_failed", detail: error.message }, { status: 500 });
  }

  if (!row?.stripe_customer_id) {
    // No customer mapping yet => nothing to manage
    return NextResponse.redirect(`${siteUrl()}/pricing`, { status: 303 });
  }

  // ✅ Billing Portal session
  const portal = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    // Per your request: keep it simple, return home.
    return_url: `${siteUrl()}/`,
  });

  return NextResponse.redirect(portal.url, { status: 303 });
}