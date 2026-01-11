// src/app/api/econ/map/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { MAP_METRICS, type MapMetricId } from "@/lib/econ/map-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRED_BASE = "https://api.stlouisfed.org/fred";
const STATE_ABBR = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT",
  "NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

function fmtISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fredObs(seriesId: string, start?: string, end?: string) {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("missing_FRED_API_KEY");

  const u = new URL(`${FRED_BASE}/series/observations`);
  u.searchParams.set("api_key", key);
  u.searchParams.set("file_type", "json");
  u.searchParams.set("series_id", seriesId);
  if (start) u.searchParams.set("observation_start", start);
  if (end) u.searchParams.set("observation_end", end);

  const r = await fetch(u.toString(), { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error_message || `fred_${r.status}`);
  const obs = (j?.observations ?? []) as { date: string; value: string }[];
  const points = obs
    .map((o) => ({ date: o.date, value: o.value === "." ? NaN : Number(o.value) }))
    .filter((p) => p.date && Number.isFinite(p.value));
  return points;
}

function computeLatest(points: { date: string; value: number }[]) {
  return points.length ? points[points.length - 1] : null;
}

function computeYoYPct(points: { date: string; value: number }[]) {
  // points assumed monthly/quarterly; YoY uses same month last year by index
  if (points.length < 13) return null;
  const last = points[points.length - 1];
  const prev = points[points.length - 13];
  if (!prev || prev.value === 0) return null;
  return { date: last.date, value: (last.value / prev.value - 1) * 100 };
}

function computeYoYPp(points: { date: string; value: number }[]) {
  if (points.length < 13) return null;
  const last = points[points.length - 1];
  const prev = points[points.length - 13];
  if (!prev) return null;
  return { date: last.date, value: last.value - prev.value };
}

function siteUrlFromReq(req: Request) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

async function housingScreener(req: Request) {
  const base = siteUrlFromReq(req);
  const r = await fetch(`${base}/api/housing/market/screener?level=state&top=60&sort=score`, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(j?.error || `housing_${r.status}`);
  return j as {
    rows: Array<{
      id: string;
      name: string;
      rentToIncome_pct?: number;
      affordabilityIndex?: number;
      incomeMedian?: number;
      fmr2br?: number;
    }>;
    asOfISO: string;
  };
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const metricId = (u.searchParams.get("metric") || "unemployment_level") as MapMetricId;

  const metric = MAP_METRICS[metricId];
  if (!metric) return NextResponse.json({ error: "unknown_metric" }, { status: 400 });

  // Usage tracking
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

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

  try {
    // Housing-derived metrics (Phase 3)
    if (metric.source === "housing") {
      const hs = await housingScreener(req);

      const states = hs.rows.map((r) => {
        let v: number | null = null;

        if (metricId === "rent_burden_pct") v = Number.isFinite(r.rentToIncome_pct as any) ? (r.rentToIncome_pct as number) : null;
        if (metricId === "affordability_index") v = Number.isFinite(r.affordabilityIndex as any) ? (r.affordabilityIndex as number) : null;
        if (metricId === "income_median") v = Number.isFinite(r.incomeMedian as any) ? (r.incomeMedian as number) : null;
        if (metricId === "fmr_2br") v = Number.isFinite(r.fmr2br as any) ? (r.fmr2br as number) : null;

        return { abbr: r.id, name: r.name, value: v };
      });

      const vals = states.map((s) => s.value).filter((x): x is number => Number.isFinite(x as any));
      return NextResponse.json({
        metric: metric.id,
        label: metric.label,
        units: metric.units,
        decimals: metric.decimals,
        description: metric.description,
        asOf: hs.asOfISO,
        min: vals.length ? Math.min(...vals) : null,
        max: vals.length ? Math.max(...vals) : null,
        states,
      });
    }

    // FRED metrics
    const end = fmtISO(new Date());
    const start = fmtISO(new Date(new Date().setFullYear(new Date().getFullYear() - 3))); // enough for YoY

    const states = await Promise.all(
      STATE_ABBR.map(async (abbr) => {
        const sid = metric.fredSeriesId?.(abbr);
        if (!sid) return { abbr, name: abbr, value: null, asOf: null };

        try {
          const pts = await fredObs(sid, start, end);

          let out: { date: string; value: number } | null = null;
          if (metric.transform === "level") out = computeLatest(pts);
          if (metric.transform === "yoy_pct") out = computeYoYPct(pts);
          if (metric.transform === "yoy_pp") out = computeYoYPp(pts);

          return { abbr, name: abbr, value: out?.value ?? null, asOf: out?.date ?? null };
        } catch {
          return { abbr, name: abbr, value: null, asOf: null };
        }
      })
    );

    const vals = states.map((s) => s.value).filter((x): x is number => Number.isFinite(x as any));
    const asOf = states.find((s) => s.asOf)?.asOf ?? null;

    return NextResponse.json({
      metric: metric.id,
      label: metric.label,
      units: metric.units,
      decimals: metric.decimals,
      description: metric.description,
      asOf,
      min: vals.length ? Math.min(...vals) : null,
      max: vals.length ? Math.max(...vals) : null,
      states: states.map((s) => ({ abbr: s.abbr, name: s.abbr, value: s.value })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: "map_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}