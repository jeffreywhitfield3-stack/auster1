// src/app/api/econ/census/county/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function censusKey() {
  return process.env.CENSUS_API_KEY || "";
}

function n(x: any): number | null {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}
function pct(numer: number | null, denom: number | null): number | null {
  if (!numer || !denom || denom <= 0) return null;
  return (numer / denom) * 100;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const stateFips = (u.searchParams.get("state") || "").trim(); // "24"
  if (!stateFips) return NextResponse.json({ error: "missing_state" }, { status: 400 });

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

  const yearsToTry = [2023, 2022, 2021, 2020]; // ACS5 most recent availability may lag

  // Same variable strategy as state
  const vars = [
    "B01001_001E", // pop
    "B19013_001E", // median income
    "B17001_001E", // poverty total
    "B17001_002E", // poverty below
    "B15003_001E", // edu total 25+
    "B15003_022E", // bachelor
    "B15003_023E", // master
    "B15003_024E", // prof
    "B15003_025E", // phd
    "B25064_001E", // median rent
    "NAME",
  ];

  let lastErr: any = null;

  for (const year of yearsToTry) {
    const url = new URL(`https://api.census.gov/data/${year}/acs/acs5`);
    url.searchParams.set("get", vars.join(","));
    url.searchParams.set("for", "county:*");
    url.searchParams.set("in", `state:${stateFips}`);
    if (censusKey()) url.searchParams.set("key", censusKey());

    try {
      const r = await fetch(url.toString(), { cache: "no-store" });
      const json = await r.json();
      if (!r.ok) {
        lastErr = json;
        continue;
      }

      const body = json.slice(1);
      const rows = body.map((row: any[]) => {
        const [
          pop,
          income,
          povTotal,
          povBelow,
          eduTotal,
          eduBach,
          eduMast,
          eduProf,
          eduPhd,
          medRent,
          name,
          state,
          county,
        ] = row;

        const population = n(pop);
        const medianIncome = n(income);
        const povertyRate = pct(n(povBelow), n(povTotal));
        const bachelorsPlus =
          pct((n(eduBach) ?? 0) + (n(eduMast) ?? 0) + (n(eduProf) ?? 0) + (n(eduPhd) ?? 0), n(eduTotal)) ?? null;
        const medianRent = n(medRent);

        return {
          stateFips: String(state),
          countyFips: String(county).padStart(3, "0"),
          fips: `${String(state).padStart(2, "0")}${String(county).padStart(3, "0")}`,
          name: String(name),
          population,
          medianIncome,
          povertyRate,
          bachelorsPlus,
          medianRent,
        };
      });

      return NextResponse.json({ year, stateFips, rows });
    } catch (e: any) {
      lastErr = String(e?.message ?? e);
    }
  }

  return NextResponse.json({ error: "census_failed", detail: lastErr }, { status: 500 });
}