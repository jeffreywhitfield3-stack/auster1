// src/app/api/econ/fred/state/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { STATE_OVERLAYS, type StateOverlayKey } from "@/lib/econ/fred/state-overlays";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fredKey() {
  const k = process.env.FRED_API_KEY;
  if (!k) throw new Error("Missing FRED_API_KEY");
  return k;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const state = (u.searchParams.get("state") || "").toUpperCase();
  const overlay = (u.searchParams.get("overlay") || "") as StateOverlayKey;

  if (!state || state.length !== 2) return NextResponse.json({ error: "bad_state" }, { status: 400 });

  const def = STATE_OVERLAYS.find((x) => x.key === overlay);
  if (!def) return NextResponse.json({ error: "bad_overlay" }, { status: 400 });

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

  const seriesId = def.seriesId(state);

  const obsUrl = new URL("https://api.stlouisfed.org/fred/series/observations");
  obsUrl.searchParams.set("api_key", fredKey());
  obsUrl.searchParams.set("file_type", "json");
  obsUrl.searchParams.set("series_id", seriesId);

  // optional range
  const start = u.searchParams.get("start");
  const end = u.searchParams.get("end");
  if (start) obsUrl.searchParams.set("observation_start", start);
  if (end) obsUrl.searchParams.set("observation_end", end);

  const r = await fetch(obsUrl.toString(), { cache: "no-store" });
  const j = await r.json();

  if (!r.ok) return NextResponse.json({ error: "fred_failed", detail: j }, { status: 502 });

  const observations = (j?.observations ?? []).map((o: any) => ({
    date: o.date,
    value: o.value === "." ? null : Number(o.value),
  }));

  return NextResponse.json({
    state,
    overlay,
    seriesId,
    unit: def.unit,
    observations,
  });
}