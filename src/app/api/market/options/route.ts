import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const Q = z.object({
  symbol: z.string().min(1).max(15),
  expiration: z.string().min(4).max(32).optional(), // YYYY-MM-DD
});

type OptionRow = {
  contractSymbol?: string;
  strike: number;
  bid?: number;
  ask?: number;
  lastPrice?: number;
  impliedVolatility?: number;
  openInterest?: number;
  volume?: number;
  inTheMoney?: boolean;
};

type ParsedOcc = {
  underlying: string;
  expiryISO: string; // YYYY-MM-DD
  kind: "CALL" | "PUT";
  strike: number;
};

function yyMmDdToIso(yyMMdd: string) {
  // yyMMdd -> 20yy-MM-dd (good for modern listed options)
  const yy = Number(yyMMdd.slice(0, 2));
  const mm = yyMMdd.slice(2, 4);
  const dd = yyMMdd.slice(4, 6);
  const yyyy = 2000 + yy;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Polygon OCC-style option tickers commonly look like:
 * O:AAPL260116C00150000
 *    AAPL  260116 C 00150000
 * strike is encoded in thousandths (00150000 => 150.000)
 */
function parsePolygonOccTicker(t?: string): ParsedOcc | null {
  if (!t) return null;

  // Strip "O:" prefix if present
  const raw = t.startsWith("O:") ? t.slice(2) : t;

  // underlying(1-6) + YYMMDD + C/P + 8 digits strike
  const m = raw.match(/^([A-Z]{1,6})(\d{6})([CP])(\d{8})$/);
  if (!m) return null;

  const underlying = m[1];
  const expiryISO = yyMmDdToIso(m[2]);
  const kind = m[3] === "C" ? "CALL" : "PUT";
  const strikeInt = Number(m[4]);
  if (!Number.isFinite(strikeInt)) return null;

  const strike = strikeInt / 1000;
  return { underlying, expiryISO, kind, strike };
}

function normalizePolygonSnapshot(x: any, parsed: ParsedOcc | null): OptionRow | null {
  const strike =
    Number.isFinite(parsed?.strike) ? Number(parsed!.strike) : Number(x?.details?.strike_price);

  if (!Number.isFinite(strike)) return null;

  return {
    contractSymbol: typeof x?.details?.ticker === "string" ? x.details.ticker : undefined,
    strike,
    bid: x?.last_quote?.bid !== undefined ? Number(x.last_quote.bid) : undefined,
    ask: x?.last_quote?.ask !== undefined ? Number(x.last_quote.ask) : undefined,
    lastPrice: x?.last_trade?.price !== undefined ? Number(x.last_trade.price) : undefined,
    impliedVolatility: x?.implied_volatility !== undefined ? Number(x.implied_volatility) : undefined,
    openInterest: x?.open_interest !== undefined ? Number(x.open_interest) : undefined,
    volume: x?.day?.volume !== undefined ? Number(x.day.volume) : undefined,
    inTheMoney: typeof x?.in_the_money === "boolean" ? x.in_the_money : undefined,
  };
}

async function polygonFetchJson(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const text = await r.text();
  if (!r.ok) {
    return { ok: false as const, status: r.status, text };
  }
  try {
    return { ok: true as const, status: r.status, json: JSON.parse(text) };
  } catch {
    return { ok: false as const, status: 502, text: `parse_failed: ${text.slice(0, 400)}` };
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") || "").trim().toUpperCase();
  const expiration = (searchParams.get("expiration") || undefined)?.trim();

  const parsedQ = Q.safeParse({ symbol, expiration });
  if (!parsedQ.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "missing_api_key" }, { status: 500 });

  const sym = parsedQ.data.symbol;
  const requestedExp = parsedQ.data.expiration;

  // Start page
  let url =
    `https://api.polygon.io/v3/snapshot/options/${encodeURIComponent(sym)}` +
    `?limit=250&apiKey=${encodeURIComponent(apiKey)}`;

  const calls: OptionRow[] = [];
  const puts: OptionRow[] = [];
  const expirationsSet = new Set<string>();

  let spot: number | undefined = undefined;

  // Keep costs + latency under control:
  // - fetch at most a few pages
  // - still enough to populate expirations + the chosen expiry
  const MAX_PAGES = 4;

  for (let page = 0; page < MAX_PAGES; page++) {
    const out = await polygonFetchJson(url);

    if (!out.ok) {
      return NextResponse.json(
        { error: "fetch_failed", detail: { stage: "snapshot", status: out.status, body: out.text.slice(0, 700) } },
        { status: 502 }
      );
    }

    const j: any = out.json;

    // underlying spot if present
    if (spot === undefined && j?.underlying_asset?.price !== undefined) {
      const p = Number(j.underlying_asset.price);
      if (Number.isFinite(p)) spot = p;
    }

    const results: any[] = Array.isArray(j?.results) ? j.results : [];
    if (!results.length && page === 0) {
      return NextResponse.json({ error: "no_data" }, { status: 502 });
    }

    for (const raw of results) {
      const t = raw?.details?.ticker as string | undefined;
      const occ = parsePolygonOccTicker(t);

      // Build expirations list when possible
      if (occ?.expiryISO) expirationsSet.add(occ.expiryISO);

      // If user requested an expiration, filter aggressively
      if (requestedExp && occ?.expiryISO && occ.expiryISO !== requestedExp) continue;

      const row = normalizePolygonSnapshot(raw, occ);
      if (!row) continue;

      const kind = occ?.kind ?? null;
      if (kind === "CALL") calls.push(row);
      else if (kind === "PUT") puts.push(row);
      else {
        // If parsing fails, we can still try to infer from the ticker
        if (t?.includes("C")) calls.push(row);
        else if (t?.includes("P")) puts.push(row);
      }
    }

    // Pagination
    // Polygon returns next_url sometimes without apiKey
    const nextUrl = typeof j?.next_url === "string" ? j.next_url : null;

    // If we have a requested expiry and we already collected a decent amount, stop early
    if (requestedExp && (calls.length + puts.length >= 300)) break;

    if (!nextUrl) break;

    // Ensure apiKey is appended
    url = nextUrl.includes("apiKey=") ? nextUrl : `${nextUrl}${nextUrl.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(apiKey)}`;
  }

  const expirations = Array.from(expirationsSet).sort(); // YYYY-MM-DD lexicographic sort works

  // Choose a default expiration for UI if none provided
  const chosenExpiration =
    requestedExp ||
    (expirations.length ? expirations[0] : "");

  // If user didn’t request expiration and we didn’t filter, you may want the UI
  // to default to the first expiration. We still return full calls/puts we collected.
  calls.sort((a, b) => a.strike - b.strike);
  puts.sort((a, b) => a.strike - b.strike);

  return NextResponse.json({
    symbol: sym,
    expirations,
    expiration: chosenExpiration,
    options: { calls, puts },
    spot: Number.isFinite(Number(spot)) ? Number(spot) : undefined,
  });
}
