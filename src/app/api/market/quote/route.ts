import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { getClientIp, hashIp } from "@/lib/ip";

export const runtime = "nodejs";

const Q = z.object({ symbol: z.string().min(1).max(15) });

type Quote = {
  symbol: string;
  date?: string;
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close: number;
  stale?: boolean; // true when we had to fall back to daily history
  source?: "stooq_live" | "stooq_daily";
};

function toNum(x: unknown): number | undefined {
  if (x === null || x === undefined) return undefined;
  const s = String(x).trim();
  if (!s || s.toUpperCase() === "N/D" || s.toUpperCase() === "NA") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function fmtDateYYYYMMDD(dateRaw: string) {
  const d = String(dateRaw || "").trim();
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d || undefined;
}

function fmtTimeHHMMSS(timeRaw: string) {
  const t = String(timeRaw || "").trim();
  if (t.length === 6) return `${t.slice(0, 2)}:${t.slice(2, 4)}:${t.slice(4, 6)}`;
  return t || undefined;
}

/**
 * Live endpoint parser:
 * - Sometimes header format
 * - Sometimes single row: AAPL.US,20260105,220019,270.64,271.51,266.15,267.27,45537043,
 */
function parseStooqLive(text: string, symbol: string): Quote | null {
  const csv = text.trim();
  if (!csv) return null;

  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return null;

  // header based
  if (lines[0].toLowerCase().includes("close") && lines.length >= 2) {
    const cols = lines[0].split(",").map((s) => s.trim());
    const vals = lines[1].split(",").map((s) => s.trim());
    const m: Record<string, string> = {};
    cols.forEach((c, i) => (m[c] = vals[i] ?? ""));

    const close = toNum(m["Close"]);
    if (close === undefined) return null;

    return {
      symbol,
      date: m["Date"] || undefined,
      open: toNum(m["Open"]),
      high: toNum(m["High"]),
      low: toNum(m["Low"]),
      close,
      source: "stooq_live",
      stale: false,
    };
  }

  // raw single-line
  const row = lines[0].split(",").map((s) => s.trim());
  // expected: ticker,date,time,open,high,low,close,...
  if (row.length < 7) return null;

  const open = toNum(row[3]);
  const high = toNum(row[4]);
  const low = toNum(row[5]);
  const close = toNum(row[6]);

  if (close === undefined) return null;

  return {
    symbol,
    date: fmtDateYYYYMMDD(row[1]),
    time: fmtTimeHHMMSS(row[2]),
    open,
    high,
    low,
    close,
    source: "stooq_live",
    stale: false,
  };
}

type DailyRow = { date: string; open?: number; high?: number; low?: number; close?: number };

function parseStooqDailyHistory(text: string): DailyRow[] {
  const csv = text.trim();
  if (!csv) return [];

  const lines = csv.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((s) => s.trim().toLowerCase());
  const idxDate = header.indexOf("date");
  const idxOpen = header.indexOf("open");
  const idxHigh = header.indexOf("high");
  const idxLow = header.indexOf("low");
  const idxClose = header.indexOf("close");
  if (idxDate < 0 || idxClose < 0) return [];

  const out: DailyRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((s) => s.trim());
    const date = cols[idxDate] || "";
    const close = toNum(cols[idxClose]);
    if (!date || close === undefined) continue;
    out.push({
      date,
      open: idxOpen >= 0 ? toNum(cols[idxOpen]) : undefined,
      high: idxHigh >= 0 ? toNum(cols[idxHigh]) : undefined,
      low: idxLow >= 0 ? toNum(cols[idxLow]) : undefined,
      close,
    });
  }
  return out;
}

async function fetchTextWithTimeout(url: string, ms: number): Promise<{ ok: boolean; status: number; text: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: {
        // Helps with bot-protection / odd responses
        "user-agent": "austerian/1.0 (+https://austerian.com)",
        "accept": "text/csv,text/plain,*/*",
      },
    });
    const text = await r.text().catch(() => "");
    return { ok: r.ok, status: r.status, text };
  } catch {
    return { ok: false, status: 0, text: "" };
  } finally {
    clearTimeout(t);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawSymbol = (searchParams.get("symbol") || "").trim();
  const parsed = Q.safeParse({ symbol: rawSymbol });
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

  const symbol = parsed.data.symbol.toUpperCase();
  const stooqSym = rawSymbol.includes(".") ? rawSymbol.toLowerCase() : `${rawSymbol.toLowerCase()}.us`;

  // 1) Try "live" quote endpoint first
  const liveUrl = `https://stooq.com/q/l/?s=${encodeURIComponent(stooqSym)}&i=d`;
  const live = await fetchTextWithTimeout(liveUrl, 4500);

  if (live.ok) {
    const q = parseStooqLive(live.text, symbol);
    if (q) return NextResponse.json(q);
    // if it returned nonsense/ND, fall through to daily history
  }

  // 2) Fallback: daily history (more reliable)
  const dailyUrl = `https://stooq.com/q/d/l/?s=${encodeURIComponent(stooqSym)}&i=d`;
  const daily = await fetchTextWithTimeout(dailyUrl, 6500);

  if (daily.ok) {
    const rows = parseStooqDailyHistory(daily.text);
    const last = rows.at(-1);
    if (last?.close !== undefined) {
      const out: Quote = {
        symbol,
        date: last.date,
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        source: "stooq_daily",
        stale: true,
      };
      return NextResponse.json(out);
    }
  }

  // 3) If everything fails, return a *clean* 502 payload (with diagnostics)
  return NextResponse.json(
    {
      error: "quote_failed",
      detail: {
        tried: {
          live: { status: live.status, sample: live.text.slice(0, 120) },
          daily: { status: daily.status, sample: daily.text.slice(0, 120) },
        },
        hint: "Stooq can return N/D or HTML in production. Live quote is flaky; daily fallback is recommended.",
      },
    },
    { status: 502 }
  );
}