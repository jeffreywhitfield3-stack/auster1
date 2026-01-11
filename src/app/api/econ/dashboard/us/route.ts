import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { CORE_US_SERIES, YIELD_CURVE_SERIES } from "@/lib/econ/series-map";

export const runtime = "nodejs";

const Q = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

async function apiGet(path: string) {
  const r = await fetch(path, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const start = (searchParams.get("start") || undefined)?.trim();
  const end = (searchParams.get("end") || undefined)?.trim();

  const parsed = Q.safeParse({ start, end });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Usage tracking
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "not_authenticated" }, { status: 401 });

  const ipHash = hashIp(getClientIp(req));
  const { data: usage, error: usageError } = await supabase.rpc("consume_usage", {
    p_product: "econ",
    p_ip_hash: ipHash,
    p_cost: 2,
  });

  if (usageError) return NextResponse.json({ error: "usage_check_failed", detail: usageError.message }, { status: 502 });
  if (!usage?.allowed) {
    return NextResponse.json({ error: "usage_limit_exceeded", remainingProduct: usage?.remainingProduct ?? 0, paid: usage?.paid ?? false }, { status: 402 });
  }

  const ids = Array.from(
    new Set([
      ...Object.values(CORE_US_SERIES),
      ...YIELD_CURVE_SERIES,
      "NROU",
      "PCE",
      "DSPIC96",
      "GDPC1",
      "UNRATE",
      "CPIAUCSL",
      "FEDFUNDS",
    ])
  );

  try {
    const bundles: Record<string, any> = {};

    await Promise.all(
      ids.map(async (id) => {
        const url =
          `${origin}/api/econ/fred/observations?id=${encodeURIComponent(id)}` +
          (start ? `&start=${encodeURIComponent(start)}` : "") +
          (end ? `&end=${encodeURIComponent(end)}` : "");
        bundles[id] = await apiGet(url);
      })
    );

    return NextResponse.json({
      asOf: end ?? "",
      geo: { mode: "US" },
      bundles,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", detail: String(e?.message || e) }, { status: 502 });
  }
}