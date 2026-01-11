import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

const Q = z.object({ id: z.string().min(1).max(50) });

async function fred(url: string) {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("Missing FRED_API_KEY");
  const r = await fetch(`${url}&api_key=${encodeURIComponent(key)}&file_type=json`, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) throw new Error(`FRED ${r.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get("id") || "").trim().toUpperCase();

  const parsed = Q.safeParse({ id });
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

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
    const j = await fred(`https://api.stlouisfed.org/fred/series?series_id=${encodeURIComponent(id)}`);
    const s = Array.isArray(j?.seriess) ? j.seriess[0] : null;
    if (!s) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json({
      id,
      title: s.title,
      units: s.units,
      frequency: s.frequency,
      seasonal_adjustment: s.seasonal_adjustment,
      last_updated: s.last_updated,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "fetch_failed", detail: String(e?.message || e) }, { status: 502 });
  }
}