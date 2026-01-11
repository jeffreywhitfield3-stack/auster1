import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

const Q = z.object({
  symbol: z.string().min(1).max(15),
  window: z.coerce.number().int().min(10).max(252).default(60),
});

type StooqRow = { date: string; close: number };

function parseStooqHistoryCSV(csv: string): StooqRow[] {
  const text = csv.trim();
  if (!text) return [];

  if (text.toLowerCase().includes("no data")) return [];

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return [];

  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const dateIdx = header.indexOf("date");
  const closeIdx = header.indexOf("close");
  if (dateIdx === -1 || closeIdx === -1) return [];

  const out: StooqRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((s) => s.trim());
    const date = cols[dateIdx] ?? "";
    const close = Number(cols[closeIdx] ?? "");
    if (!date || !Number.isFinite(close)) continue;
    out.push({ date, close });
  }

  return out;
}

function stdev(values: number[]) {
  if (values.length < 2) return NaN;
  const mean = values.reduce((s, x) => s + x, 0) / values.length;
  const v = values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

async function fetchStooqHistory(sym: string): Promise<{ rows: StooqRow[]; raw?: string; used?: string }> {
  const base = sym.toLowerCase();
  const candidates = [base.includes(".") ? base : base, base.includes(".") ? base : `${base}.us`];

  for (const s of candidates) {
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(s)}&i=d`;
    const r = await fetch(url, { cache: "no-store" });
    const text = await r.text().catch(() => "");
    if (!r.ok) continue;

    const rows = parseStooqHistoryCSV(text);
    if (rows.length >= 30) return { rows, raw: text, used: s };
  }

  return { rows: [] };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get("symbol") || "";
  const window = searchParams.get("window") || "60";

  const parsed = Q.safeParse({ symbol, window });
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

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

  const sym = parsed.data.symbol.toUpperCase();
  const win = parsed.data.window;

  try {
    const { rows, raw, used } = await fetchStooqHistory(sym);

    if (!rows.length) {
      return NextResponse.json(
        { error: "no_data", detail: { symbol: sym, tried: used ? [used] : ["(multiple)"], snippet: (raw || "").slice(0, 200) } },
        { status: 502 }
      );
    }

    if (rows.length < win + 1) {
      return NextResponse.json(
        { error: "insufficient_data", detail: { symbol: sym, have: rows.length, need: win + 1 } },
        { status: 502 }
      );
    }

    const recent = rows.slice(-(win + 1));
    const closes = recent.map((r) => r.close);

    const rets: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const a = closes[i - 1];
      const b = closes[i];
      if (a > 0 && b > 0) rets.push(Math.log(b / a));
    }

    const dailyVol = stdev(rets);
    const annualizedVol = dailyVol * Math.sqrt(252);

    if (!Number.isFinite(annualizedVol)) {
      return NextResponse.json({ error: "calc_failed" }, { status: 502 });
    }

    return NextResponse.json({
      symbol: sym,
      window: win,
      n: rets.length,
      dailyVol,
      annualizedVol,
      source: "stooq",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "fetch_failed", detail: String(e?.message || e) },
      { status: 502 }
    );
  }
}