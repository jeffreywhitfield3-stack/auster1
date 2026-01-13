// src/lib/derivatives/massive.ts
import { quoteCache, chainCache, expirationsCache } from "./cache";
import { yahooQuote, yahooExpirations, yahooChain } from "./yahoo-fallback";

export type MassiveQuote = {
  symbol: string;
  price: number | null;
  asOf?: string | null;
};

export type MassiveOptionLeg = {
  strike: number;
  bid: number | null;
  ask: number | null;
  volume?: number | null;
  open_interest?: number | null;
  implied_volatility?: number | null; // decimal preferred
  delta?: number | null;
  theta?: number | null;
};

export type MassiveChainSnapshot = {
  symbol: string;
  underlying: number;
  expiration: string; // YYYY-MM-DD
  calls: MassiveOptionLeg[];
  puts: MassiveOptionLeg[];
  asOf?: string | null;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`missing_env_${name}`);
  return v;
}

type MassiveFetchOptions = {
  qs?: Record<string, string | number | boolean | undefined | null>;
};

/**
 * Many market data vendors (including Polygon-style APIs) use apiKey query param instead of Bearer auth.
 * If Massive requires Bearer, flip USE_BEARER_AUTH to true in env.
 */
const USE_BEARER_AUTH = process.env.MASSIVE_USE_BEARER_AUTH === "true";

async function massiveFetch<T>(path: string, opts: MassiveFetchOptions = {}): Promise<T> {
  const base = mustEnv("MASSIVE_BASE_URL").replace(/\/$/, "");
  const key = mustEnv("MASSIVE_API_KEY");

  const u = new URL(base + path);

  // Attach qs
  if (opts.qs) {
    for (const [k, v] of Object.entries(opts.qs)) {
      if (v === undefined || v === null) continue;
      u.searchParams.set(k, String(v));
    }
  }

  // If not bearer, default to apiKey query param (Polygon-style)
  if (!USE_BEARER_AUTH) {
    u.searchParams.set("apiKey", key);
  }

  // Direct fetch - Yahoo fallback handles rate limits
  const r = await fetch(u.toString(), {
    cache: "no-store",
    headers: USE_BEARER_AUTH
      ? {
          Authorization: `Bearer ${key}`,
          "content-type": "application/json",
        }
      : {
          "content-type": "application/json",
        },
  });

  const text = await r.text();

  // Helpful error bubble-up (keeps upstream JSON visible)
  if (!r.ok) {
    throw new Error(`massive_http_${r.status}: ${text.slice(0, 500)}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`massive_bad_json: ${text.slice(0, 500)}`);
  }
}

/**
 * Quote: Use previous close agg endpoint (available on Options Starter plan).
 * With caching and Yahoo Finance fallback for rate-limited requests.
 */
export async function massiveQuote(symbol: string): Promise<MassiveQuote> {
  const cacheKey = `quote:${symbol.toUpperCase()}`;

  // Check cache first
  const cached = quoteCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Try Polygon API
  try {
    // Use previous close agg (available on Options Starter plan)
    type PrevResp = { results?: Array<{ c?: number; t?: number }> };
    const j = await massiveFetch<PrevResp>(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev`, {
      qs: { adjusted: true },
    });
    const row = Array.isArray(j.results) && j.results.length ? j.results[0] : undefined;
    const price = typeof row?.c === "number" ? row.c : null;
    const asOf = typeof row?.t === "number" ? new Date(row.t).toISOString() : null;
    const result = { symbol, price, asOf };
    quoteCache.set(cacheKey, result);
    return result;
  } catch (polygonError) {
    // If Polygon fails (rate limit or error), fall back to Yahoo Finance
    console.warn(`Polygon quote failed for ${symbol}, falling back to Yahoo:`, polygonError);
    try {
      const yahooResult = await yahooQuote(symbol);
      quoteCache.set(cacheKey, yahooResult);
      return yahooResult;
    } catch (yahooError) {
      // Both failed, throw combined error
      throw new Error(`All quote sources failed. Polygon: ${polygonError}. Yahoo: ${yahooError}`);
    }
  }
}

/**
 * Expirations: pull from options contracts reference and dedupe expiration_date.
 * With caching and Yahoo Finance fallback.
 */
export async function massiveExpirations(symbol: string): Promise<string[]> {
  const cacheKey = `expirations:${symbol.toUpperCase()}`;

  // Check cache first
  const cached = expirationsCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Try Polygon API
  try {
    // Polygon-style: /v3/reference/options/contracts?underlying_ticker=SPY&limit=1000
    type ContractsResp = {
      results?: Array<{ expiration_date?: string }>;
      next_url?: string;
    };

    const expirations = new Set<string>();

    // Pull a few pages (don't go crazy; keep it fast)
    let nextPath: string | null = `/v3/reference/options/contracts`;
    let page = 0;

    while (nextPath && page < 5) {
      page += 1;

      const j: ContractsResp = await massiveFetch<ContractsResp>(nextPath, {
        qs: nextPath.includes("/v3/reference/options/contracts")
          ? { underlying_ticker: symbol, limit: 1000, sort: "expiration_date" }
          : undefined,
      });

      for (const r of j.results ?? []) {
        const d = String(r.expiration_date || "");
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) expirations.add(d);
      }

      // Some vendors return full next_url; if so, convert to path
      if (j.next_url) {
        try {
          const nu = new URL(j.next_url);
          nextPath = nu.pathname + nu.search; // preserve query
        } catch {
          nextPath = null;
        }
      } else {
        nextPath = null;
      }
    }

    const result = Array.from(expirations).sort();
    expirationsCache.set(cacheKey, result);
    return result;
  } catch (polygonError) {
    // Fall back to Yahoo Finance
    console.warn(`Polygon expirations failed for ${symbol}, falling back to Yahoo:`, polygonError);
    try {
      const yahooResult = await yahooExpirations(symbol);
      expirationsCache.set(cacheKey, yahooResult);
      return yahooResult;
    } catch (yahooError) {
      throw new Error(`All expiration sources failed. Polygon: ${polygonError}. Yahoo: ${yahooError}`);
    }
  }
}

/**
 * Options chain snapshot for ONE expiration.
 * With caching and Yahoo Finance fallback.
 */
export async function massiveChain(symbol: string, expiration: string): Promise<MassiveChainSnapshot> {
  const cacheKey = `chain:${symbol.toUpperCase()}:${expiration}`;

  // Check cache first
  const cached = chainCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Try Polygon API
  try {
    // Polygon-style: /v3/snapshot/options/{underlying}?limit=250
    type SnapshotResp = {
      results?: {
        underlying_asset?: { price?: number };
        last_updated?: number;
        options?: Array<{
          details?: { strike_price?: number; expiration_date?: string; contract_type?: "call" | "put" };
          last_quote?: { bid?: number; ask?: number };
          day?: { volume?: number };
          open_interest?: number;
          implied_volatility?: number;
          greeks?: { delta?: number; theta?: number };
        }>;
      };
    };

    const j = await massiveFetch<SnapshotResp>(`/v3/snapshot/options/${encodeURIComponent(symbol)}`, {
      qs: { limit: 250 },
    });

    const underlying = Number(j?.results?.underlying_asset?.price ?? NaN);
    const asOf =
      typeof j?.results?.last_updated === "number"
        ? new Date(j.results.last_updated).toISOString()
        : null;

    const calls: MassiveOptionLeg[] = [];
    const puts: MassiveOptionLeg[] = [];

    for (const opt of j?.results?.options ?? []) {
      const exp = opt?.details?.expiration_date ? String(opt.details.expiration_date) : "";
      if (exp !== expiration) continue;

      const strike = Number(opt?.details?.strike_price ?? NaN);
      if (!Number.isFinite(strike)) continue;

      const leg: MassiveOptionLeg = {
        strike,
        bid: typeof opt?.last_quote?.bid === "number" ? opt.last_quote.bid : null,
        ask: typeof opt?.last_quote?.ask === "number" ? opt.last_quote.ask : null,
        volume: typeof opt?.day?.volume === "number" ? opt.day.volume : null,
        open_interest: typeof opt?.open_interest === "number" ? opt.open_interest : null,
        implied_volatility: typeof opt?.implied_volatility === "number" ? opt.implied_volatility : null,
        delta: typeof opt?.greeks?.delta === "number" ? opt.greeks.delta : null,
        theta: typeof opt?.greeks?.theta === "number" ? opt.greeks.theta : null,
      };

      if (opt?.details?.contract_type === "call") calls.push(leg);
      if (opt?.details?.contract_type === "put") puts.push(leg);
    }

    // Sort by strike
    calls.sort((a, b) => a.strike - b.strike);
    puts.sort((a, b) => a.strike - b.strike);

    const result = {
      symbol,
      underlying: Number.isFinite(underlying) ? underlying : NaN,
      expiration,
      asOf,
      calls,
      puts,
    };

    chainCache.set(cacheKey, result);
    return result;
  } catch (polygonError) {
    // Fall back to Yahoo Finance
    console.warn(`Polygon chain failed for ${symbol}/${expiration}, falling back to Yahoo:`, polygonError);
    try {
      const yahooResult = await yahooChain(symbol, expiration);
      chainCache.set(cacheKey, yahooResult);
      return yahooResult;
    } catch (yahooError) {
      throw new Error(`All chain sources failed. Polygon: ${polygonError}. Yahoo: ${yahooError}`);
    }
  }
}