// src/lib/market-data/providers/massive-provider.ts
// Polygon.io (Massive.com) market data provider

import { IMarketDataProvider, Quote, OptionsChain, OptionLeg } from "../types";

type MassiveFetchOptions = {
  qs?: Record<string, string | number | boolean | undefined | null>;
};

const USE_BEARER_AUTH = process.env.MASSIVE_USE_BEARER_AUTH === "true";

/**
 * Polygon.io market data provider
 * Supports Options Starter plan and above
 */
export class MassiveProvider implements IMarketDataProvider {
  public readonly name = "Polygon";

  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  private async fetch<T>(path: string, opts: MassiveFetchOptions = {}): Promise<T> {
    const u = new URL(this.baseUrl + path);

    // Attach query params
    if (opts.qs) {
      for (const [k, v] of Object.entries(opts.qs)) {
        if (v === undefined || v === null) continue;
        u.searchParams.set(k, String(v));
      }
    }

    // Auth: Bearer or query param (Polygon-style)
    if (!USE_BEARER_AUTH) {
      u.searchParams.set("apiKey", this.apiKey);
    }

    const r = await fetch(u.toString(), {
      cache: "no-store",
      headers: USE_BEARER_AUTH
        ? {
            Authorization: `Bearer ${this.apiKey}`,
            "content-type": "application/json",
          }
        : {
            "content-type": "application/json",
          },
    });

    const text = await r.text();

    if (!r.ok) {
      throw new Error(`polygon_http_${r.status}: ${text.slice(0, 500)}`);
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new Error(`polygon_bad_json: ${text.slice(0, 500)}`);
    }
  }

  async getQuote(symbol: string): Promise<Quote> {
    type PrevResp = { results?: Array<{ c?: number; t?: number }> };

    const j = await this.fetch<PrevResp>(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev`, {
      qs: { adjusted: true },
    });

    const row = Array.isArray(j.results) && j.results.length ? j.results[0] : undefined;
    const price = typeof row?.c === "number" ? row.c : null;
    const asOf = typeof row?.t === "number" ? new Date(row.t).toISOString() : null;

    return { symbol, price, asOf };
  }

  async getExpirations(symbol: string): Promise<string[]> {
    type ContractsResp = {
      results?: Array<{ expiration_date?: string }>;
      next_url?: string;
    };

    const expirations = new Set<string>();

    // Pull a few pages (max 5 to keep it fast)
    let nextPath: string | null = `/v3/reference/options/contracts`;
    let page = 0;

    while (nextPath && page < 5) {
      page += 1;

      const j: ContractsResp = await this.fetch<ContractsResp>(nextPath, {
        qs: nextPath.includes("/v3/reference/options/contracts")
          ? { underlying_ticker: symbol, limit: 1000, sort: "expiration_date" }
          : undefined,
      });

      for (const r of j.results ?? []) {
        const d = String(r.expiration_date || "");
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) expirations.add(d);
      }

      // Handle pagination
      if (j.next_url) {
        try {
          const nu = new URL(j.next_url);
          nextPath = nu.pathname + nu.search;
        } catch {
          nextPath = null;
        }
      } else {
        nextPath = null;
      }
    }

    return Array.from(expirations).sort();
  }

  async getChain(symbol: string, expiration: string): Promise<OptionsChain> {
    // Step 1: Get underlying price (Options Starter plan doesn't include it in snapshot)
    const quote = await this.getQuote(symbol);
    const underlyingPrice = quote.price ?? NaN;

    // Step 2: Get options snapshot with expiration filter
    type SnapshotResp = {
      results?: Array<{
        details?: {
          strike_price?: number;
          expiration_date?: string;
          contract_type?: "call" | "put";
        };
        last_quote?: { bid?: number; ask?: number };
        day?: { volume?: number };
        open_interest?: number;
        implied_volatility?: number;
        greeks?: {
          delta?: number;
          gamma?: number;
          theta?: number;
          vega?: number;
          rho?: number;
        };
      }>;
      status?: string;
    };

    const j = await this.fetch<SnapshotResp>(`/v3/snapshot/options/${encodeURIComponent(symbol)}`, {
      qs: {
        limit: 250,
        expiration_date: expiration,
      },
    });

    const calls: OptionLeg[] = [];
    const puts: OptionLeg[] = [];

    for (const opt of j?.results ?? []) {
      const exp = opt?.details?.expiration_date ? String(opt.details.expiration_date) : "";
      if (exp !== expiration) continue;

      const strike = Number(opt?.details?.strike_price ?? NaN);
      if (!Number.isFinite(strike)) continue;

      const leg: OptionLeg = {
        strike,
        bid: typeof opt?.last_quote?.bid === "number" ? opt.last_quote.bid : null,
        ask: typeof opt?.last_quote?.ask === "number" ? opt.last_quote.ask : null,
        volume: typeof opt?.day?.volume === "number" ? opt.day.volume : null,
        open_interest: typeof opt?.open_interest === "number" ? opt.open_interest : null,
        implied_volatility: typeof opt?.implied_volatility === "number" ? opt.implied_volatility : null,
        delta: typeof opt?.greeks?.delta === "number" ? opt.greeks.delta : null,
        gamma: typeof opt?.greeks?.gamma === "number" ? opt.greeks.gamma : null,
        theta: typeof opt?.greeks?.theta === "number" ? opt.greeks.theta : null,
        vega: typeof opt?.greeks?.vega === "number" ? opt.greeks.vega : null,
        rho: typeof opt?.greeks?.rho === "number" ? opt.greeks.rho : null,
      };

      if (opt?.details?.contract_type === "call") calls.push(leg);
      if (opt?.details?.contract_type === "put") puts.push(leg);
    }

    // Sort by strike
    calls.sort((a, b) => a.strike - b.strike);
    puts.sort((a, b) => a.strike - b.strike);

    return {
      symbol,
      underlying: Number.isFinite(underlyingPrice) ? underlyingPrice : NaN,
      expiration,
      asOf: quote.asOf,
      calls,
      puts,
    };
  }
}

/**
 * Create Massive provider from environment variables
 */
export function createMassiveProvider(): MassiveProvider {
  const baseUrl = process.env.MASSIVE_BASE_URL;
  const apiKey = process.env.MASSIVE_API_KEY;

  if (!baseUrl) throw new Error("missing_env_MASSIVE_BASE_URL");
  if (!apiKey) throw new Error("missing_env_MASSIVE_API_KEY");

  return new MassiveProvider(baseUrl, apiKey);
}
