import { NextResponse } from "next/server";
import { massiveChain } from "@/lib/derivatives/massive";
import { buildIronCondors } from "@/lib/derivatives/ironCondor";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

type ReqBody = {
  symbol: string;
  expiration: string;
  topN?: number;
  rankBy?: "returnOnRisk" | "pop" | "credit";
  filters?: {
    minOpenInterest?: number;
    minVolume?: number;
    maxSpreadPct?: number;
  };
};

export async function POST(req: Request) {
  try {
    const u = new URL(req.url);
    const download = u.searchParams.get("download");

    const body = (await req.json()) as ReqBody;

    const symbol = String(body.symbol || "").trim().toUpperCase();
    const expiration = String(body.expiration || "").trim();
    const topN = Math.max(1, Math.min(Number(body.topN ?? 50), 300));
    const rankBy = (body.rankBy ?? "returnOnRisk") as "returnOnRisk" | "pop" | "credit";

    if (!symbol) return NextResponse.json({ error: "missing_symbol" }, { status: 400 });
    if (!expiration) return NextResponse.json({ error: "missing_expiration" }, { status: 400 });

    // Usage tracking - consume 5 credits (iron condor analysis is computationally expensive)
    const supabase = await supabaseServer();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const ipHash = hashIp(getClientIp(req));
    const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
      p_product: "derivatives",
      p_ip_hash: ipHash,
      p_cost: 5,
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

    // Direct call (no internal URL fetch => no prod URL/env issues)
    const snap = await massiveChain(symbol, expiration);

    const out = buildIronCondors({
      symbol,
      expiration,
      underlying: snap.underlying,
      asOf: snap.asOf ?? null,
      calls: snap.calls,
      puts: snap.puts,
      topN,
      rankBy,
      filters: {
        minOpenInterest: Number(body.filters?.minOpenInterest ?? 200),
        minVolume: Number(body.filters?.minVolume ?? 50),
        maxSpreadPct: Number(body.filters?.maxSpreadPct ?? 0.25),
      },
    });

    if (download === "csv") {
      const header =
        "symbol,expiration,spot,putLong,putShort,callShort,callLong,credit,maxProfit,maxLoss,returnOnRisk,lowerBE,upperBE,pop\n";
      const rows = out.condors
        .map((c) =>
          [
            out.symbol,
            out.expiration,
            out.underlying,
            c.putLong,
            c.putShort,
            c.callShort,
            c.callLong,
            c.credit,
            c.maxProfit,
            c.maxLoss,
            c.returnOnRisk,
            c.lowerBE,
            c.upperBE,
            c.pop ?? "",
          ].join(",")
        )
        .join("\n");

      return new NextResponse(header + rows + "\n", {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": `attachment; filename="${symbol}_${expiration}_iron_condors.csv"`,
        },
      });
    }

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: "condor_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}