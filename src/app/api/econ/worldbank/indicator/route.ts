// src/app/api/econ/worldbank/indicator/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { WB_INDICATORS, type WbIndicatorKey } from "@/lib/econ/worldbank/indicators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const country = (u.searchParams.get("country") || "USA").toUpperCase(); // ISO3 or WB country code
  const key = (u.searchParams.get("indicator") || "gdp_current_usd") as WbIndicatorKey;

  const def = WB_INDICATORS.find((x) => x.key === key);
  if (!def) return NextResponse.json({ error: "bad_indicator" }, { status: 400 });

  // Usage tracking
  const ipHash = hashIp(getClientIp(req));
  const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
    p_product: "econ",
    p_ip_hash: ipHash,
    p_cost: 1,
  });

  if (usageError) return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
  if (!usage?.allowed) {
    return NextResponse.json({ error: "usage_limit_exceeded", remainingProduct: usage?.remainingProduct ?? 0, paid: usage?.paid ?? false }, { status: 402 });
  }

  const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(def.code)}?format=json&per_page=20000`;

  const r = await fetch(url, { cache: "no-store" });
  const j = await r.json();

  if (!r.ok) return NextResponse.json({ error: "worldbank_failed" }, { status: 502 });

  const arr = Array.isArray(j?.[1]) ? j[1] : [];
  const points = arr
    .map((row: any) => ({
      date: String(row?.date),
      value: row?.value === null ? null : Number(row.value),
    }))
    .filter((p: any) => p.date);

  return NextResponse.json({
    country,
    indicator: def.key,
    code: def.code,
    label: def.label,
    unitHint: def.unitHint,
    points,
  });
}