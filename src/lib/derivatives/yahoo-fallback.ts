// src/lib/derivatives/yahoo-fallback.ts
/**
 * Yahoo Finance fallback provider
 * Free alternative when Polygon API is rate-limited or unavailable
 */

import type { MassiveQuote, MassiveChainSnapshot, MassiveOptionLeg } from "./massive";

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
 * Get stock quote from Yahoo Finance
 */
export async function yahooQuote(symbol: string): Promise<MassiveQuote> {
  try {
    // Yahoo Finance query API
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

    // Get current price from meta or latest quote
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
    throw new Error(`Yahoo quote failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get options expirations from Yahoo Finance
 */
export async function yahooExpirations(symbol: string): Promise<string[]> {
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
    throw new Error(`Yahoo expirations failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get options chain for specific expiration from Yahoo Finance
 */
export async function yahooChain(symbol: string, expiration: string): Promise<MassiveChainSnapshot> {
  try {
    // Convert YYYY-MM-DD to Unix timestamp
    const expirationDate = new Date(expiration + "T00:00:00Z");
    const expirationTimestamp = Math.floor(expirationDate.getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v7/finance/options/${encodeURIComponent(symbol)}?date=${expirationTimestamp}`;
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
    const calls: MassiveOptionLeg[] = (optionData.options?.[0]?.calls ?? []).map((call: any) => ({
      strike: call.strike ?? NaN,
      bid: call.bid ?? null,
      ask: call.ask ?? null,
      volume: call.volume ?? null,
      open_interest: call.openInterest ?? null,
      implied_volatility: call.impliedVolatility ?? null,
      delta: null, // Yahoo doesn't provide greeks in free API
      theta: null,
    }));

    // Parse puts
    const puts: MassiveOptionLeg[] = (optionData.options?.[0]?.puts ?? []).map((put: any) => ({
      strike: put.strike ?? NaN,
      bid: put.bid ?? null,
      ask: put.ask ?? null,
      volume: put.volume ?? null,
      open_interest: put.openInterest ?? null,
      implied_volatility: put.impliedVolatility ?? null,
      delta: null,
      theta: null,
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
    throw new Error(`Yahoo chain failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
