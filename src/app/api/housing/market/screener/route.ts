import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { STATES } from "@/lib/housing/states";

export const runtime = "nodejs";

const Q = z.object({
  level: z.literal("state").default("state"),
  top: z.coerce.number().int().min(5).max(100).default(25),
  sort: z.enum(["score", "affordability", "rentToIncome", "hpiYoY", "unemployment"]).default("score"),
});

type FredObs = { date: string; value: string };

async function fredLatestTwo(seriesId: string, apiKey: string): Promise<{ latest?: number; yearAgo?: number; latestDate?: string }> {
  // Grab a bit more than 13 months to safely find "year ago" even if missing values.
  const url =
    `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}` +
    `&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=20`;
  const r = await fetch(url, { next: { revalidate: 60 * 60 * 6 } }); // 6h cache
  if (!r.ok) return {};
  const j = (await r.json().catch(() => null)) as any;
  const obs: FredObs[] = Array.isArray(j?.observations) ? j.observations : [];
  const nums = obs
    .map((o) => ({ date: o.date, v: Number(o.value) }))
    .filter((x) => Number.isFinite(x.v));

  if (!nums.length) return {};

  const latest = nums[0];
  // Year-ago proxy: find the first observation with date <= latestDate - ~365 days by scanning older ones.
  const latestTime = new Date(latest.date).getTime();
  const yearAgoTarget = latestTime - 365 * 24 * 60 * 60 * 1000;

  const yearAgo = nums.find((x) => new Date(x.date).getTime() <= yearAgoTarget);
  return { latest: latest.v, yearAgo: yearAgo?.v, latestDate: latest.date };
}

async function hudFmr2brByState(state2: string, token: string): Promise<number | undefined> {
  // HUD USER API uses a bearer token.  [oai_citation:2‡HUD User](https://www.huduser.gov/portal/dataset/fmr-api.html) (docs)
  // Endpoint shape varies by dataset; this implementation expects a JSON response that includes a 2BR rent.
  // If your exact HUD response differs, we’ll adjust to match the payload you see in logs.
  const year = new Date().getFullYear() - 1; // use last completed year for stability
  const url = `https://www.huduser.gov/hudapi/public/fmr/data/${year}?states=${encodeURIComponent(state2)}`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 60 * 60 * 12 }, // 12h cache
  });

  if (!r.ok) return undefined;
  const j = (await r.json().catch(() => null)) as any;

  // Try common shapes:
  // - { data: { ... } }
  // - { ... }
  const data = j?.data ?? j;
  const first = Array.isArray(data) ? data[0] : data?.[state2] ?? data;

  // Try to locate a 2BR value (field names differ by HUD dataset version).
  const candidates = [
    first?.fmr2,
    first?.fmr_2,
    first?.FMR_2,
    first?.two_bedroom,
    first?.TwoBedroom,
  ].map((x: any) => Number(x));

  const v = candidates.find((n) => Number.isFinite(n) && n > 0);
  return v;
}

async function censusMedianIncomeState(state2: string, censusKey?: string): Promise<number | undefined> {
  // ACS 1-year: median household income (S1901_C01_012E is common; dataset variables can change by year).
  // To keep this stable, we use ACS 5-year subject table “S1901” which is more consistently available.
  const year = new Date().getFullYear() - 1;
  const varId = "S1901_C01_012E"; // Median household income (in past 12 months)
  // Need state FIPS; small mapping
  const fips = STATE_FIPS[state2];
  if (!fips) return undefined;

  const base = `https://api.census.gov/data/${year}/acs/acs5/subject?get=NAME,${varId}&for=state:${fips}`;
  const url = censusKey ? `${base}&key=${encodeURIComponent(censusKey)}` : base;

  const r = await fetch(url, { next: { revalidate: 60 * 60 * 12 } });
  if (!r.ok) return undefined;
  const rows = (await r.json().catch(() => null)) as any;
  if (!Array.isArray(rows) || rows.length < 2) return undefined;
  const header = rows[0] as string[];
  const vals = rows[1] as string[];
  const idx = header.indexOf(varId);
  if (idx === -1) return undefined;

  const n = Number(vals[idx]);
  return Number.isFinite(n) ? n : undefined;
}

// Minimal state FIPS mapping (all states + DC)
const STATE_FIPS: Record<string, string> = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10", DC: "11",
  FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20", KY: "21",
  LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28", MO: "29", MT: "30",
  NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36", NC: "37", ND: "38", OH: "39",
  OK: "40", OR: "41", PA: "42", RI: "44", SC: "45", SD: "46", TN: "47", TX: "48", UT: "49",
  VT: "50", VA: "51", WA: "53", WV: "54", WI: "55", WY: "56",
};

function scoreRow(x: {
  unemp?: number;
  unempYoYpp?: number;
  hpiYoY?: number;
  rentToIncome?: number;
  income?: number;
  fmr2?: number;
}) {
  // Heuristic score (0-100-ish):
  // - Lower unemployment better
  // - Improving unemployment YoY better
  // - Moderately positive HPI YoY better (too high = overheating)
  // - Lower rent burden better
  const unempScore = x.unemp === undefined ? 0 : clamp(8 - x.unemp, -5, 8) * 4; // rough
  const unempTrend = x.unempYoYpp === undefined ? 0 : clamp(-x.unempYoYpp, -2, 2) * 10; // improving adds
  const hpiScore =
    x.hpiYoY === undefined
      ? 0
      : // peak around 5% YoY, penalize extremes
        (10 - Math.abs((x.hpiYoY ?? 0) - 5)) * 3;
  const burdenScore = x.rentToIncome === undefined ? 0 : clamp(40 - x.rentToIncome, -20, 40) * 1.5;

  const total = unempScore + unempTrend + hpiScore + burdenScore;
  return clamp(total, 0, 100);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const parsed = Q.safeParse({
    level: searchParams.get("level") || "state",
    top: searchParams.get("top") || "25",
    sort: searchParams.get("sort") || "score",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // Usage tracking
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const ipHash = hashIp(getClientIp(req));
  const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
    p_product: "housing",
    p_ip_hash: ipHash,
    p_cost: 5,
  });

  if (usageError) return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
  if (!usage?.allowed) {
    return NextResponse.json({ error: "usage_limit_exceeded", remainingProduct: usage?.remainingProduct ?? 0, paid: usage?.paid ?? false }, { status: 402 });
  }

  const FRED_API_KEY = process.env.FRED_API_KEY;
  const HUD_USER_TOKEN = process.env.HUD_USER_TOKEN;
  const CENSUS_API_KEY = process.env.CENSUS_API_KEY;

  if (!FRED_API_KEY) return NextResponse.json({ error: "missing_env", detail: "FRED_API_KEY" }, { status: 500 });
  if (!HUD_USER_TOKEN) return NextResponse.json({ error: "missing_env", detail: "HUD_USER_TOKEN" }, { status: 500 });

  const asOfISO = new Date().toISOString();
  const cachedHours = 6;

  // Limit concurrency a bit (keep it polite for free tiers).
  const poolSize = 8;
  const states = STATES;

  const results: any[] = [];
  for (let i = 0; i < states.length; i += poolSize) {
    const batch = states.slice(i, i + poolSize);
    const chunk = await Promise.all(
      batch.map(async (s) => {
        const [u, h, fmr2, inc] = await Promise.all([
          fredLatestTwo(s.fredUnemp, FRED_API_KEY),
          fredLatestTwo(s.fredHpi, FRED_API_KEY),
          hudFmr2brByState(s.code2, HUD_USER_TOKEN),
          censusMedianIncomeState(s.code2, CENSUS_API_KEY),
        ]);

        const unemploymentRate = u.latest;
        const unemploymentYoY_pp =
          u.latest !== undefined && u.yearAgo !== undefined ? (u.latest - u.yearAgo) : undefined;

        const hpiYoY_pct =
          h.latest !== undefined && h.yearAgo !== undefined && h.yearAgo !== 0
            ? ((h.latest / h.yearAgo) - 1) * 100
            : undefined;

        const rentToIncome_pct =
          fmr2 !== undefined && inc !== undefined && inc > 0
            ? ((fmr2 * 12) / inc) * 100
            : undefined;

        const affordabilityIndex =
          inc !== undefined && fmr2 !== undefined
            ? // higher income, lower rent -> more affordable
              (inc / Math.max(1, fmr2 * 12)) * 10
            : undefined;

        const rentToPriceProxy =
          // without property-level values, use a proxy: higher affordability + lower unemployment + moderate HPI
          affordabilityIndex !== undefined && unemploymentRate !== undefined
            ? affordabilityIndex * (1 / Math.max(1, unemploymentRate))
            : undefined;

        const score = scoreRow({
          unemp: unemploymentRate,
          unempYoYpp: unemploymentYoY_pp,
          hpiYoY: hpiYoY_pct,
          rentToIncome: rentToIncome_pct,
          income: inc,
          fmr2,
        });

        const notes: string[] = [];
        if (rentToIncome_pct !== undefined) {
          notes.push(rentToIncome_pct <= 30 ? "Lower rent burden proxy" : "Higher rent burden proxy");
        }
        if (unemploymentYoY_pp !== undefined) {
          notes.push(unemploymentYoY_pp <= 0 ? "Unemployment improving YoY" : "Unemployment worsening YoY");
        }
        if (hpiYoY_pct !== undefined) {
          notes.push(hpiYoY_pct >= 0 ? "Positive price momentum" : "Negative price momentum");
        }

        return {
          id: s.code2,
          name: s.name,
          score,
          unemploymentRate,
          unemploymentYoY_pp,
          hpiYoY_pct,
          fmr2br: fmr2,
          incomeMedian: inc,
          rentToIncome_pct,
          affordabilityIndex,
          rentToPriceProxy,
          updatedAtISO: asOfISO,
          notes,
        };
      })
    );

    results.push(...chunk);
  }

  // Sort for API response (client also sorts, but let’s give it clean)
  results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  return NextResponse.json({
    level: "state",
    rows: results.slice(0, parsed.data.top),
    asOfISO,
    cachedHours,
  });
}