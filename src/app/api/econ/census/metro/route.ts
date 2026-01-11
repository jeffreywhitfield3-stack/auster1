// src/app/api/econ/census/metro/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { parseAcsMetro } from "@/lib/econ/census";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function censusKey() {
  return process.env.CENSUS_API_KEY || "";
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const limit = Math.max(10, Math.min(300, Number(u.searchParams.get("limit") || "120")));

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

  const vars = [
    "B01001_001E",
    "B19013_001E",
    "B17001_001E",
    "B17001_002E",
    "B15003_001E",
    "B15003_022E",
    "B15003_023E",
    "B15003_024E",
    "B15003_025E",
    "B25064_001E",
    "NAME",
  ];

  const yearsToTry = [2023, 2022, 2021, 2020];
  let lastErr: any = null;

  for (const year of yearsToTry) {
    const url = new URL(`https://api.census.gov/data/${year}/acs/acs1`);
    url.searchParams.set("get", vars.join(","));
    url.searchParams.set("for", "metropolitan statistical area/micropolitan statistical area:*");
    if (censusKey()) url.searchParams.set("key", censusKey());

    try {
      const r = await fetch(url.toString(), { cache: "no-store" });
      const json = await r.json();

      if (!r.ok) {
        lastErr = json;
        continue;
      }

      let rows = parseAcsMetro(json);

      // Mild cleaning: filter blank / tiny rows, then take top population
      rows = rows
        .filter((x) => x.population !== null && x.population > 0)
        .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))
        .slice(0, limit);

      return NextResponse.json({ year, rows });
    } catch (e: any) {
      lastErr = String(e?.message ?? e);
    }
  }

  return NextResponse.json({ error: "census_failed", detail: lastErr }, { status: 500 });
}