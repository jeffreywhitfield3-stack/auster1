import { NextResponse } from "next/server";
import { getDefaultGateway } from "@/lib/market-data";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const symbol = String(u.searchParams.get("symbol") || "").trim().toUpperCase();
    if (!symbol) return NextResponse.json({ error: "missing_symbol" }, { status: 400 });

    // Usage tracking - consume 1 credit for derivatives product
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const ipHash = hashIp(getClientIp(req));
    const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
      p_product: "derivatives",
      p_ip_hash: ipHash,
      p_cost: 1,
    });

    if (usageError) {
      return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
    }

    if (!usage?.allowed) {
      return NextResponse.json(
        {
          error: "usage_limit_exceeded",
          remainingProduct: usage?.remainingProduct ?? 0,
          paid: usage?.paid ?? false
        },
        { status: 402 }
      );
    }

    // Use gateway instead of direct massiveQuote call
    const gateway = getDefaultGateway();
    const q = await gateway.getQuote(symbol);
    return NextResponse.json(q);
  } catch (e: any) {
    return NextResponse.json({ error: "quote_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}