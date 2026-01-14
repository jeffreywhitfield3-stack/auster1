// src/lib/models/data/cache.ts
// Two-tier caching for model data (L1: in-memory, L2: KV/Redis)

import { kv } from '@vercel/kv';

// L1: In-memory cache (per-instance)
const memoryCache = new Map<string, { value: any; expiresAt: number }>();

// Cache TTLs (in seconds)
export const CACHE_TTL = {
  MARKET_DATA: 60, // Market data: 1 minute
  MACRO_DATA: 300, // Macro data: 5 minutes
  DERIVATIVES_QUOTE: 30, // Options quotes: 30 seconds
  DERIVATIVES_CHAIN: 60, // Options chain: 1 minute
  MODEL_METADATA: 3600, // Model metadata: 1 hour
  MODEL_RUN: 300, // Model run results: 5 minutes (for same inputs)
} as const;

/**
 * Get value from cache (checks L1, then L2)
 */
export async function getCached<T>(key: string): Promise<T | null> {
  // Check L1 (memory)
  const memEntry = memoryCache.get(key);
  if (memEntry && memEntry.expiresAt > Date.now()) {
    return memEntry.value as T;
  }

  // Clean up expired entry
  if (memEntry) {
    memoryCache.delete(key);
  }

  // Check L2 (KV)
  try {
    const kvValue = await kv.get<T>(key);
    if (kvValue !== null) {
      // Warm L1 cache with KV result
      const ttl = await kv.ttl(key);
      if (ttl > 0) {
        memoryCache.set(key, {
          value: kvValue,
          expiresAt: Date.now() + ttl * 1000,
        });
      }
      return kvValue;
    }
  } catch (error) {
    console.error('[Cache] KV read error:', error);
    // Fall through to return null
  }

  return null;
}

/**
 * Set value in cache (both L1 and L2)
 */
export async function setCached<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  // Set L1 (memory)
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });

  // Set L2 (KV)
  try {
    await kv.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error('[Cache] KV write error:', error);
    // Continue - L1 cache still works
  }
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  // Remove from L1
  memoryCache.delete(key);

  // Remove from L2
  try {
    await kv.del(key);
  } catch (error) {
    console.error('[Cache] KV delete error:', error);
  }
}

/**
 * Invalidate cache entries matching pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  // L1: Remove matching keys
  const regex = new RegExp(pattern.replace(/\*/g, '.*'));
  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
    }
  }

  // L2: KV doesn't support pattern delete, so we need to scan
  // For now, just log a warning (this is a limitation)
  console.warn(
    '[Cache] Pattern invalidation on KV not implemented - L1 only:',
    pattern
  );
}

/**
 * Clear all cache (useful for testing)
 */
export async function clearAllCache(): Promise<void> {
  memoryCache.clear();

  try {
    // This is a destructive operation - use carefully
    await kv.flushdb();
  } catch (error) {
    console.error('[Cache] KV flush error:', error);
  }
}

/**
 * Generate cache key for market data
 */
export function marketDataKey(
  symbol: string,
  startDate: string,
  endDate: string,
  interval: string = 'day'
): string {
  return `market:${symbol}:${interval}:${startDate}:${endDate}`;
}

/**
 * Generate cache key for macro data
 */
export function macroDataKey(indicator: string, params: Record<string, any>): string {
  const paramStr = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return `macro:${indicator}:${paramStr}`;
}

/**
 * Generate cache key for derivatives quote
 */
export function derivativesQuoteKey(
  symbol: string,
  expiration: string,
  strike: number,
  optionType: string
): string {
  return `deriv:quote:${symbol}:${expiration}:${strike}:${optionType}`;
}

/**
 * Generate cache key for derivatives chain
 */
export function derivativesChainKey(
  symbol: string,
  expiration?: string
): string {
  return expiration
    ? `deriv:chain:${symbol}:${expiration}`
    : `deriv:chain:${symbol}:all`;
}

/**
 * Generate cache key for model run
 */
export function modelRunKey(
  modelVersionId: string,
  inputs: Record<string, any>
): string {
  // Create deterministic hash of inputs
  const inputStr = JSON.stringify(inputs, Object.keys(inputs).sort());
  const hash = simpleHash(inputStr);
  return `model:run:${modelVersionId}:${hash}`;
}

/**
 * Simple hash function for cache keys
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Get cache stats (L1 only)
 */
export function getCacheStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt > now) {
      active++;
    } else {
      expired++;
    }
  }

  return {
    l1Size: memoryCache.size,
    l1Active: active,
    l1Expired: expired,
  };
}

/**
 * Cleanup expired L1 cache entries
 * Should be called periodically
 */
export function cleanupExpiredCache(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// Periodic cleanup (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const cleaned = cleanupExpiredCache();
    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries from L1`);
    }
  }, 5 * 60 * 1000);
}
