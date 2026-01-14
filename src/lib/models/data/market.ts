// src/lib/models/data/market.ts
// Market data gateway for DSL primitives

import {
  getCached,
  setCached,
  marketDataKey,
  CACHE_TTL,
} from './cache';

export interface MarketDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataSeries {
  symbol: string;
  data: MarketDataPoint[];
  interval: string;
}

/**
 * Fetch historical market data for a symbol
 */
export async function fetchMarketData(
  symbol: string,
  startDate: string,
  endDate: string,
  interval: string = 'day'
): Promise<MarketDataSeries> {
  // Check cache
  const cacheKey = marketDataKey(symbol, startDate, endDate, interval);
  const cached = await getCached<MarketDataSeries>(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch from Polygon API
  const data = await fetchFromPolygon(symbol, startDate, endDate, interval);

  // Cache result
  await setCached(cacheKey, data, CACHE_TTL.MARKET_DATA);

  return data;
}

/**
 * Fetch from Polygon API
 */
async function fetchFromPolygon(
  symbol: string,
  startDate: string,
  endDate: string,
  interval: string
): Promise<MarketDataSeries> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  // Convert interval to Polygon format
  const multiplier = 1;
  const timespan = interval === 'day' ? 'day' : interval === 'hour' ? 'hour' : 'minute';

  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${startDate}/${endDate}?adjusted=true&sort=asc&apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Polygon API error (${response.status}): ${errorText}`
    );
  }

  const json = await response.json();

  if (json.status !== 'OK' || !json.results) {
    throw new Error(
      `Polygon API returned no results for ${symbol} (${json.status})`
    );
  }

  // Transform to our format
  const data: MarketDataPoint[] = json.results.map((bar: any) => ({
    date: new Date(bar.t).toISOString().split('T')[0],
    open: bar.o,
    high: bar.h,
    low: bar.l,
    close: bar.c,
    volume: bar.v,
  }));

  return {
    symbol,
    data,
    interval,
  };
}

/**
 * Extract price series from market data
 */
export function extractPriceSeries(
  marketData: MarketDataSeries,
  field: 'open' | 'high' | 'low' | 'close' = 'close'
): number[] {
  return marketData.data.map((point) => point[field]);
}

/**
 * Extract volume series from market data
 */
export function extractVolumeSeries(marketData: MarketDataSeries): number[] {
  return marketData.data.map((point) => point.volume);
}

/**
 * Extract date labels from market data
 */
export function extractDateLabels(marketData: MarketDataSeries): string[] {
  return marketData.data.map((point) => point.date);
}

/**
 * Get current price for a symbol
 */
export async function getCurrentPrice(symbol: string): Promise<number> {
  const apiKey = process.env.POLYGON_API_KEY;

  if (!apiKey) {
    throw new Error('POLYGON_API_KEY not configured');
  }

  // Use previous close endpoint (real-time requires paid tier)
  const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch current price for ${symbol}`);
  }

  const json = await response.json();

  if (json.status !== 'OK' || !json.results || json.results.length === 0) {
    throw new Error(`No price data available for ${symbol}`);
  }

  return json.results[0].c; // Close price
}

/**
 * Get multiple current prices in batch
 */
export async function getBatchPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  // Polygon doesn't have a batch endpoint, so we fetch in parallel
  const results = await Promise.allSettled(
    symbols.map(async (symbol) => {
      const price = await getCurrentPrice(symbol);
      return { symbol, price };
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      prices[result.value.symbol] = result.value.price;
    }
  }

  return prices;
}

/**
 * Calculate date range (helper for "last N days" queries)
 */
export function calculateDateRange(daysBack: number): {
  startDate: string;
  endDate: string;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Validate symbol format
 */
export function validateSymbol(symbol: string): boolean {
  // Basic validation: 1-5 uppercase letters, optionally with .
  return /^[A-Z]{1,5}(\.[A-Z]{1,2})?$/.test(symbol);
}

/**
 * Normalize symbol (ensure uppercase, trim whitespace)
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}
