// src/lib/derivatives/cache.ts
/**
 * Simple in-memory cache with TTL (Time To Live)
 * Reduces API calls by caching responses temporarily
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

export class SimpleCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  /**
   * Get cached value if it exists and hasn't expired
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Store value in cache with TTL
   */
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((key) => this.cache.delete(key));
  }
}

// Cache instances for different data types
// Quotes: 30 second cache (fresh price data)
export const quoteCache = new SimpleCache<any>(30 * 1000);

// Options chains: 60 second cache (less frequently updated)
export const chainCache = new SimpleCache<any>(60 * 1000);

// Expirations: 5 minute cache (rarely changes)
export const expirationsCache = new SimpleCache<string[]>(5 * 60 * 1000);

// Auto-cleanup every 2 minutes
setInterval(() => {
  quoteCache.cleanup();
  chainCache.cleanup();
  expirationsCache.cleanup();
}, 2 * 60 * 1000);
