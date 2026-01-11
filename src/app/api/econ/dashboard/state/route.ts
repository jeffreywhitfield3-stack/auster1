import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";
import { CORE_US_SERIES, YIELD_CURVE_SERIES, STATE_ABBR } from "@/lib/econ/series-map";

export const runtime = "nodejs";

const Q = z.object({
  state: z.enum(STATE_ABBR as any),
  start: z.string().optional(),
  end: z.string().optional(),
});

async function httpJson(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const t = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${t.slice(0, 200)}`);
  return JSON.parse(t);
}

async function tryObs(origin: string, id: string, start?: string, end?: string) {
  const url =
    `${origin}/api/econ/fred/observations?id=${encodeURIComponent(id)}` +
    (start ? `&start=${encodeURIComponent(start)}` : "") +
    (end ? `&end=${encodeURIComponent(end)}` : "");
  return httpJson(url);
}

async function findStateUnrateId(origin: string, state: string) {
  // attempt common pattern first
  const candidate = `${state}UR`;
  try {
    await tryObs(origin, candidate);
    return candidate;
  } catch {}

  // fallback: search for something like "Maryland Unemployment Rate"
  const search = await httpJson(`${origin}/api/econ/fred/search?q=${encodeURIComponent(state + " unemployment rate")}&limit=25`);
  const list: { id: string; title: string }[] = search?.results ?? [];

  // naive best match: title contains state & unemployment rate
  const upper = state.toUpperCase();
  const best =
    list.find((x) => x.title.toUpperCase().includes("UNEMPLOYMENT RATE") && x.title.toUpperCase().includes(upper)) ||
    list.find((x) => x.title.toUpperCase().includes("UNEMPLOYMENT RATE")) ||
    null;

  return best?.id ?? "UNRATE";
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const state = (searchParams.get("state") || "").trim().toUpperCase();
  const start = (searchParams.get("start") || undefined)?.trim();
  const end = (searchParams.get("end") || undefined)?.trim();

  const parsed = Q.safeParse({ state, start, end });
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

  try {
    const stateUnrateId = await findStateUnrateId(origin, parsed.data.state);

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
        stateUnrateId,
      ])
    );

    const bundles: Record<string, any> = {};

    await Promise.all(
      ids.map(async (id) => {
        bundles[id] = await tryObs(origin, id, start, end);
      })
    );

    // alias the state unemployment series to a stable key for the client
    bundles["UNRATE_STATE"] = bundles[stateUnrateId];

    return NextResponse.json({
      asOf: end ?? "",
      geo: { mode: "STATE", state: parsed.data.state },
      bundles,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", detail: String(e?.message || e) }, { status: 502 });
  }
}