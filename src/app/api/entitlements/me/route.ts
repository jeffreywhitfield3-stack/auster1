import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env_${name}`);
  return v;
}

export async function GET() {
  try {
    // 1) user session (RLS client) – only for identifying the user
    const supabase = await supabaseServer();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { is_paid: false, plan: "free", reason: "no_session" },
        { status: 200 }
      );
    }

    // 2) admin client (service role) – bypass RLS for entitlement lookup
    const admin = createClient(
      mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
      mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // SOURCE OF TRUTH: stripe_subscriptions
    const { data: sub, error: subErr } = await admin
      .from("stripe_subscriptions")
      .select("status, price_id, current_period_end, cancel_at_period_end")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subErr) {
      return NextResponse.json(
        {
          is_paid: false,
          plan: "free",
          reason: "stripe_subscriptions_query_failed",
          detail: subErr.message,
          user_id: user.id,
        },
        { status: 200 }
      );
    }

    const isPaidFromStripe =
      sub?.status === "active" || sub?.status === "trialing";

    if (isPaidFromStripe) {
      return NextResponse.json(
        {
          is_paid: true,
          plan: "pro",
          source: "stripe_subscriptions",
          user_id: user.id,
          status: sub?.status ?? null,
          price_id: sub?.price_id ?? null,
          current_period_end: sub?.current_period_end ?? null,
          cancel_at_period_end: sub?.cancel_at_period_end ?? null,
        },
        { status: 200 }
      );
    }

    // FALLBACK: user_entitlements (since your hook reads it)
    const { data: ue, error: ueErr } = await admin
      .from("user_entitlements")
      .select("tier")
      .eq("user_id", user.id)
      .maybeSingle();

    if (ueErr) {
      return NextResponse.json(
        {
          is_paid: false,
          plan: "free",
          reason: "user_entitlements_query_failed",
          detail: ueErr.message,
          user_id: user.id,
        },
        { status: 200 }
      );
    }

    const tier = (ue?.tier ?? "free").toLowerCase();
    const isPaidFromTier = tier === "pro" || tier === "paid";

    return NextResponse.json(
      {
        is_paid: isPaidFromTier,
        plan: isPaidFromTier ? "pro" : "free",
        source: "user_entitlements",
        user_id: user.id,
        tier,
        stripe_status: sub?.status ?? null,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { is_paid: false, plan: "free", reason: "route_failed", detail: String(e?.message || e) },
      { status: 200 }
    );
  }
}