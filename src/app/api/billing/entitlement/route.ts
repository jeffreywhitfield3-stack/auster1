// src/app/api/billing/entitlement/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isPaid: false, status: null, plan: null }, { status: 200 });
  }

  // entitlements is a VIEW you created: public.entitlements
  const { data, error } = await supabase
    .from("entitlements")
    .select("is_paid,status,price_id,current_period_end,cancel_at_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    // fail closed is safer for billing
    return NextResponse.json({ isPaid: false, status: null, plan: null }, { status: 200 });
  }

  const isPaid = !!data?.is_paid;
  return NextResponse.json({
    isPaid,
    status: data?.status ?? null,
    priceId: data?.price_id ?? null,
    currentPeriodEnd: data?.current_period_end ?? null,
    cancelAtPeriodEnd: data?.cancel_at_period_end ?? null,
    plan: isPaid ? "pro" : null,
  });
}