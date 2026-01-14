// src/lib/market-data/providers/yahoo-provider.ts
// Yahoo Finance fallback provider

import { IMarketDataProvider, Quote, OptionsChain, OptionLeg } from "../types";

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url: string, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Austerian/1.0)",
      },
      cache: "no-store",
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Yahoo Finance market data provider
 * Free fallback when primary provider is unavailable
 * Note: No Greeks available in free Yahoo API
 */
export class YahooProvider implements IMarketDataProvider {
  public readonly name = "Yahoo Finance";

  async getQuote(symbol: string): Promise<Quote> {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`;
      const response = await fetchWithTimeout(url, 5000);

      if (!response.ok) {
        throw new Error(`Yahoo Finance returned ${response.status}`);
      }

      const data = await response.json();
      const result = data?.chart?.result?.[0];

      if (!result) {
        throw new Error("No data returned from Yahoo Finance");
      }

      const meta = result.meta;
      const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;

      if (price === null || typeof price !== "number") {
        throw new Error("No valid price data");
      }

      return {
        symbol: symbol.toUpperCase(),
        price,
        asOf: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`yahoo_quote_failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getExpirations(symbol: string): Promise<string[]> {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
      const response = await fetchWithTimeout(url, 5000);

      if (!response.ok) {
        throw new Error(`Yahoo Finance returned ${response.status}`);
      }

      const data = await response.json();
      const expirationTimestamps = data?.optionChain?.result?.[0]?.expirationDates;

      if (!Array.isArray(expirationTimestamps)) {
        throw new Error("No expiration data");
      }

      // Convert Unix timestamps to YYYY-MM-DD format
      const expirations = expirationTimestamps
        .map((ts: number) => {
          const date = new Date(ts * 1000);
          return date.toISOString().split("T")[0];
        })
        .sort();

      return expirations;
    } catch (error) {
      throw new Error(`yahoo_expirations_failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getChain(symbol: string, expiration: string): Promise<OptionsChain> {
    try {
      // First, get all available expirations to find the exact timestamp Yahoo uses
      const allExpirationsUrl = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}`;
      const expirationsResponse = await fetchWithTimeout(allExpirationsUrl, 5000);

      if (!expirationsResponse.ok) {
        throw new Error(`Yahoo Finance returned ${expirationsResponse.status}`);
      }

      const expirationsData = await expirationsResponse.json();
      const availableTimestamps = expirationsData?.optionChain?.result?.[0]?.expirationDates || [];

      // Find the timestamp that matches our expiration date
      const targetDate = new Date(expiration + "T00:00:00Z");
      const targetDateStr = targetDate.toISOString().split("T")[0];

      let matchingTimestamp: number | null = null;
      for (const ts of availableTimestamps) {
        const tsDate = new Date(ts * 1000);
        const tsDateStr = tsDate.toISOString().split("T")[0];
        if (tsDateStr === targetDateStr) {
          matchingTimestamp = ts;
          break;
        }
      }

      if (!matchingTimestamp) {
        throw new Error(
          `No matching expiration found for ${expiration}. Available: ${availableTimestamps.map((ts: number) => new Date(ts * 1000).toISOString().split("T")[0]).join(", ")}`
        );
      }

      // Now fetch the chain with the correct timestamp
      const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?date=${matchingTimestamp}`;
      const response = await fetchWithTimeout(url, 5000);

      if (!response.ok) {
        throw new Error(`Yahoo Finance returned ${response.status}`);
      }

      const data = await response.json();
      const optionData = data?.optionChain?.result?.[0];

      if (!optionData) {
        throw new Error("No options data");
      }

      // Get underlying price
      const underlyingPrice = optionData.quote?.regularMarketPrice ?? NaN;

      // Parse calls
      const calls: OptionLeg[] = (optionData.options?.[0]?.calls ?? []).map((call: any) => ({
        strike: call.strike ?? NaN,
        bid: call.bid ?? null,
        ask: call.ask ?? null,
        volume: call.volume ?? null,
        open_interest: call.openInterest ?? null,
        implied_volatility: call.impliedVolatility ?? null,
        delta: null, // Yahoo doesn't provide greeks in free API
        gamma: null,
        theta: null,
        vega: null,
        rho: null,
      }));

      // Parse puts
      const puts: OptionLeg[] = (optionData.options?.[0]?.puts ?? []).map((put: any) => ({
        strike: put.strike ?? NaN,
        bid: put.bid ?? null,
        ask: put.ask ?? null,
        volume: put.volume ?? null,
        open_interest: put.openInterest ?? null,
        implied_volatility: put.impliedVolatility ?? null,
        delta: null,
        gamma: null,
        theta: null,
        vega: null,
        rho: null,
      }));

      // Sort by strike
      calls.sort((a, b) => a.strike - b.strike);
      puts.sort((a, b) => a.strike - b.strike);

      return {
        symbol: symbol.toUpperCase(),
        underlying: underlyingPrice,
        expiration,
        calls,
        puts,
        asOf: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`yahoo_chain_failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * Create Yahoo provider instance
 */
export function createYahooProvider(): YahooProvider {
  return new YahooProvider();
}
