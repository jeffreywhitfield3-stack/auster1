import { NextResponse } from "next/server";
import { getDefaultGateway } from "@/lib/market-data";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const symbol = String(u.searchParams.get("symbol") || "").trim().toUpperCase();
    const expiration = String(u.searchParams.get("expiration") || "").trim();

    console.log(`[chain/route] Request for ${symbol} exp ${expiration}`);

    if (!symbol) return NextResponse.json({ error: "missing_symbol" }, { status: 400 });
    if (!expiration) return NextResponse.json({ error: "missing_expiration" }, { status: 400 });

    // Usage tracking - consume 3 credits (options chain is expensive)
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      console.log(`[chain/route] Not authenticated`);
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const ipHash = hashIp(getClientIp(req));
    const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
      p_product: "derivatives",
      p_ip_hash: ipHash,
      p_cost: 3,
    });

    if (usageError) {
      console.error(`[chain/route] Usage check failed:`, usageError);
      return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
    }

    if (!usage?.allowed) {
      console.log(`[chain/route] Usage limit exceeded. Remaining: ${usage?.remainingProduct}`);
      return NextResponse.json(
        {
          error: "usage_limit_exceeded",
          remainingProduct: usage?.remainingProduct ?? 0,
          paid: usage?.paid ?? false
        },
        { status: 402 }
      );
    }

    console.log(`[chain/route] Calling gateway.getChain...`);
    const gateway = getDefaultGateway();
    const snap = await gateway.getChain(symbol, expiration);
    console.log(`[chain/route] Got chain data: ${snap.calls.length} calls, ${snap.puts.length} puts`);
    return NextResponse.json(snap);
  } catch (e: any) {
    console.error(`[chain/route] Error:`, e);
    return NextResponse.json({ error: "chain_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}