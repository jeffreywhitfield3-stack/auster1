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

// FIPS -> USPS mapping (for overlays)
const FIPS_TO_USPS: Record<string, string> = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE","11":"DC","12":"FL","13":"GA",
  "15":"HI","16":"ID","17":"IL","18":"IN","19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA",
  "26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM","36":"NY",
  "37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN","48":"TX",
  "49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI","56":"WY",
};

// Only these overlays are truly state-wide for map coloring
const SUPPORTED_MAP_OVERLAYS: StateOverlayKey[] = ["unemp_rate", "hpi"];

async function fetchLatest(seriesId: string) {
  const url = new URL("https://api.stlouisfed.org/fred/series/observations");
  url.searchParams.set("api_key", fredKey());
  url.searchParams.set("file_type", "json");
  url.searchParams.set("series_id", seriesId);
  url.searchParams.set("sort_order", "desc");
  url.searchParams.set("limit", "1");

  const r = await fetch(url.toString(), { cache: "no-store" });
  const j = await r.json();
  if (!r.ok) throw new Error(`fred_failed_${r.status}`);

  const o = j?.observations?.[0];
  const v = o?.value === "." ? null : Number(o?.value);
  return { date: o?.date ?? null, value: Number.isFinite(v) ? v : null };
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const u = new URL(req.url);
  const overlay = (u.searchParams.get("overlay") || "unemp_rate") as StateOverlayKey;

  if (!SUPPORTED_MAP_OVERLAYS.includes(overlay)) {
    return NextResponse.json({ error: "overlay_not_supported_for_map" }, { status: 400 });
  }

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

  const entries = Object.entries(FIPS_TO_USPS);

  const results = await Promise.allSettled(
    entries.map(async ([fips, usps]) => {
      const seriesId = def.seriesId(usps);
      const latest = await fetchLatest(seriesId);
      return { fips, usps, seriesId, ...latest };
    })
  );

  const rows = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean);

  return NextResponse.json({
    overlay,
    unit: def.unit,
    rows,
    asOfISO: new Date().toISOString(),
  });
}