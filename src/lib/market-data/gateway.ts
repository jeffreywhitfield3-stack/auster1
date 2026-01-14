// src/lib/market-data/gateway.ts
// Main market data gateway with caching, fallback, and request coalescing

import {
  IMarketDataProvider,
  IMarketDataCache,
  Quote,
  OptionsChain,
  GatewayConfig,
  CoalescingMap,
} from "./types";

/**
 * Market Data Gateway
 *
 * Features:
 * - Caching with TTL
 * - Primary/fallback provider pattern
 * - Request coalescing (prevents duplicate in-flight requests)
 * - Comprehensive error handling
 */
export class MarketDataGateway {
  private primaryProvider: IMarketDataProvider;
  private fallbackProvider?: IMarketDataProvider;
  private cache?: IMarketDataCache;
  private coalesceRequests: boolean;

  // Request coalescing maps
  private quoteRequests: CoalescingMap = new Map();
  private expirationsRequests: CoalescingMap = new Map();
  private chainRequests: CoalescingMap = new Map();

  constructor(config: GatewayConfig) {
    this.primaryProvider = config.primaryProvider;
    this.fallbackProvider = config.fallbackProvider;
    this.cache = config.cache;
    this.coalesceRequests = config.coalesceRequests ?? true;
  }

  /**
   * Get quote for underlying asset
   */
  async getQuote(symbol: string): Promise<Quote> {
    const cacheKey = `quote:${symbol.toUpperCase()}`;

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get<Quote>(cacheKey);
      if (cached) {
        console.log(`[Gateway] Quote cache hit: ${symbol}`);
        return cached;
      }
    }

    // Check for in-flight request (coalescing)
    if (this.coalesceRequests && this.quoteRequests.has(cacheKey)) {
      console.log(`[Gateway] Coalescing quote request: ${symbol}`);
      return this.quoteRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.fetchQuote(symbol, cacheKey);

    if (this.coalesceRequests) {
      this.quoteRequests.set(cacheKey, request);
      request.finally(() => this.quoteRequests.delete(cacheKey));
    }

    return request;
  }

  private async fetchQuote(symbol: string, cacheKey: string): Promise<Quote> {
    try {
      console.log(`[Gateway] Fetching quote from ${this.primaryProvider.name}: ${symbol}`);
      const quote = await this.primaryProvider.getQuote(symbol);

      // Cache result (30 seconds for quotes)
      if (this.cache) {
        this.cache.set(cacheKey, quote, 30);
      }

      return quote;
    } catch (primaryError) {
      console.warn(`[Gateway] Primary provider failed for quote ${symbol}:`, primaryError);

      if (this.fallbackProvider) {
        try {
          console.log(`[Gateway] Trying fallback provider for quote: ${symbol}`);
          const quote = await this.fallbackProvider.getQuote(symbol);

          // Cache fallback result (shorter TTL: 15 seconds)
          if (this.cache) {
            this.cache.set(cacheKey, quote, 15);
          }

          return quote;
        } catch (fallbackError) {
          console.error(`[Gateway] Fallback provider also failed for quote ${symbol}:`, fallbackError);
          throw new Error(
            `All quote providers failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
          );
        }
      }

      throw primaryError;
    }
  }

  /**
   * Get list of available expiration dates
   */
  async getExpirations(symbol: string): Promise<string[]> {
    const cacheKey = `expirations:${symbol.toUpperCase()}`;

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get<string[]>(cacheKey);
      if (cached) {
        console.log(`[Gateway] Expirations cache hit: ${symbol}`);
        return cached;
      }
    }

    // Check for in-flight request (coalescing)
    if (this.coalesceRequests && this.expirationsRequests.has(cacheKey)) {
      console.log(`[Gateway] Coalescing expirations request: ${symbol}`);
      return this.expirationsRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.fetchExpirations(symbol, cacheKey);

    if (this.coalesceRequests) {
      this.expirationsRequests.set(cacheKey, request);
      request.finally(() => this.expirationsRequests.delete(cacheKey));
    }

    return request;
  }

  private async fetchExpirations(symbol: string, cacheKey: string): Promise<string[]> {
    try {
      console.log(`[Gateway] Fetching expirations from ${this.primaryProvider.name}: ${symbol}`);
      const expirations = await this.primaryProvider.getExpirations(symbol);

      // Cache result (5 minutes for expirations - they don't change often)
      if (this.cache) {
        this.cache.set(cacheKey, expirations, 300);
      }

      return expirations;
    } catch (primaryError) {
      console.warn(`[Gateway] Primary provider failed for expirations ${symbol}:`, primaryError);

      if (this.fallbackProvider) {
        try {
          console.log(`[Gateway] Trying fallback provider for expirations: ${symbol}`);
          const expirations = await this.fallbackProvider.getExpirations(symbol);

          // Cache fallback result (shorter TTL: 2 minutes)
          if (this.cache) {
            this.cache.set(cacheKey, expirations, 120);
          }

          return expirations;
        } catch (fallbackError) {
          console.error(`[Gateway] Fallback provider also failed for expirations ${symbol}:`, fallbackError);
          throw new Error(
            `All expiration providers failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
          );
        }
      }

      throw primaryError;
    }
  }

  /**
   * Get complete options chain for one expiration
   */
  async getChain(symbol: string, expiration: string): Promise<OptionsChain> {
    const cacheKey = `chain:${symbol.toUpperCase()}:${expiration}`;

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get<OptionsChain>(cacheKey);
      if (cached) {
        console.log(`[Gateway] Chain cache hit: ${symbol} ${expiration}`);
        return cached;
      }
    }

    // Check for in-flight request (coalescing)
    if (this.coalesceRequests && this.chainRequests.has(cacheKey)) {
      console.log(`[Gateway] Coalescing chain request: ${symbol} ${expiration}`);
      return this.chainRequests.get(cacheKey)!;
    }

    // Create new request
    const request = this.fetchChain(symbol, expiration, cacheKey);

    if (this.coalesceRequests) {
      this.chainRequests.set(cacheKey, request);
      request.finally(() => this.chainRequests.delete(cacheKey));
    }

    return request;
  }

  private async fetchChain(symbol: string, expiration: string, cacheKey: string): Promise<OptionsChain> {
    try {
      console.log(`[Gateway] Fetching chain from ${this.primaryProvider.name}: ${symbol} ${expiration}`);
      const chain = await this.primaryProvider.getChain(symbol, expiration);

      // Cache result (60 seconds for chains - they update frequently)
      if (this.cache) {
        this.cache.set(cacheKey, chain, 60);
      }

      return chain;
    } catch (primaryError) {
      console.warn(`[Gateway] Primary provider failed for chain ${symbol}/${expiration}:`, primaryError);

      if (this.fallbackProvider) {
        try {
          console.log(`[Gateway] Trying fallback provider for chain: ${symbol} ${expiration}`);
          const chain = await this.fallbackProvider.getChain(symbol, expiration);

          // Cache fallback result (shorter TTL: 30 seconds)
          if (this.cache) {
            this.cache.set(cacheKey, chain, 30);
          }

          return chain;
        } catch (fallbackError) {
          console.error(`[Gateway] Fallback provider also failed for chain ${symbol}/${expiration}:`, fallbackError);
          throw new Error(
            `All chain providers failed. Primary: ${primaryError}. Fallback: ${fallbackError}`
          );
        }
      }

      throw primaryError;
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
      console.log("[Gateway] Cache cleared");
    }
  }

  /**
   * Get gateway statistics
   */
  getStats() {
    return {
      primaryProvider: this.primaryProvider.name,
      fallbackProvider: this.fallbackProvider?.name ?? "none",
      cacheEnabled: !!this.cache,
      coalesceRequests: this.coalesceRequests,
      inFlightRequests: {
        quotes: this.quoteRequests.size,
        expirations: this.expirationsRequests.size,
        chains: this.chainRequests.size,
      },
    };
  }
}
