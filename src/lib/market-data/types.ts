// src/lib/market-data/types.ts
// Normalized market data types for the gateway pattern

/**
 * Quote data for an underlying asset
 */
export type Quote = {
  symbol: string;
  price: number | null;
  asOf?: string | null;
};

/**
 * Single option leg (call or put at specific strike)
 */
export type OptionLeg = {
  strike: number;
  bid: number | null;
  ask: number | null;
  volume?: number | null;
  open_interest?: number | null;
  implied_volatility?: number | null; // decimal format (0.20 = 20%)
  delta?: number | null;
  gamma?: number | null;
  theta?: number | null;
  vega?: number | null;
  rho?: number | null;
};

/**
 * Complete options chain snapshot for one expiration
 */
export type OptionsChain = {
  symbol: string;
  underlying: number; // Current price of underlying
  expiration: string; // YYYY-MM-DD format
  calls: OptionLeg[];
  puts: OptionLeg[];
  asOf?: string | null;
};

/**
 * Market data provider interface
 */
export interface IMarketDataProvider {
  name: string;

  /**
   * Get quote for underlying asset
   */
  getQuote(symbol: string): Promise<Quote>;

  /**
   * Get list of available expiration dates for options
   */
  getExpirations(symbol: string): Promise<string[]>;

  /**
   * Get complete options chain for one expiration
   */
  getChain(symbol: string, expiration: string): Promise<OptionsChain>;
}

/**
 * Cache interface for market data
 */
export interface IMarketDataCache {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttlSeconds?: number): void;
  delete(key: string): void;
  clear(): void;
}

/**
 * Gateway configuration
 */
export type GatewayConfig = {
  primaryProvider: IMarketDataProvider;
  fallbackProvider?: IMarketDataProvider;
  cache?: IMarketDataCache;
  coalesceRequests?: boolean; // Prevent duplicate in-flight requests
};

/**
 * Request coalescing map
 */
export type CoalescingMap = Map<string, Promise<any>>;
