// src/app/api/econ/map/state/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { MAP_METRICS, type MapMetricId } from "@/lib/econ/map-metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FRED_BASE = "https://api.stlouisfed.org/fred";

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
  return obs
    .map((o) => ({ date: o.date, value: o.value === "." ? NaN : Number(o.value) }))
    .filter((p) => p.date && Number.isFinite(p.value));
}

function computeYoY(points: { date: string; value: number }[], mode: "pct" | "pp") {
  if (points.length < 13) return [];
  const out: { date: string; value: number }[] = [];
  for (let i = 12; i < points.length; i++) {
    const cur = points[i];
    const prev = points[i - 12];
    if (!prev) continue;
    if (mode === "pct") {
      if (prev.value === 0) continue;
      out.push({ date: cur.date, value: (cur.value / prev.value - 1) * 100 });
    } else {
      out.push({ date: cur.date, value: cur.value - prev.value });
    }
  }
  return out;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const metricId = (u.searchParams.get("metric") || "unemployment_level") as MapMetricId;
  const abbr = (u.searchParams.get("state") || "").toUpperCase();

  const metric = MAP_METRICS[metricId];
  if (!metric) return NextResponse.json({ error: "unknown_metric" }, { status: 400 });
  if (!abbr || abbr.length < 2) return NextResponse.json({ error: "missing_state" }, { status: 400 });

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

  if (metric.source !== "fred") {
    // For housing-derived metrics, you already have the housing screener; trend series is not defined yet.
    return NextResponse.json({
      metric: metric.id,
      state: abbr,
      points: [],
      note: "no_time_series_for_housing_metric_yet",
    });
  }

  const sid = metric.fredSeriesId?.(abbr);
  if (!sid) return NextResponse.json({ error: "no_series_for_state" }, { status: 400 });

  try {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(new Date().setFullYear(new Date().getFullYear() - 10)).toISOString().slice(0, 10);

    const pts = await fredObs(sid, start, end);

    let out = pts;
    if (metric.transform === "yoy_pct") out = computeYoY(pts, "pct");
    if (metric.transform === "yoy_pp") out = computeYoY(pts, "pp");

    return NextResponse.json({
      metric: metric.id,
      state: abbr,
      seriesId: sid,
      points: out,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "state_series_failed", detail: String(e?.message || e) }, { status: 500 });
  }
}